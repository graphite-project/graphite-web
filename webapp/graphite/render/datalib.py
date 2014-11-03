"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

import socket
import struct
import time
from django.conf import settings
from graphite.logger import log
from graphite.storage import STORE, LOCAL_STORE
from graphite.remote_storage import RemoteNode
from graphite.render.hashing import ConsistentHashRing
from graphite.util import unpickle, epoch

try:
  import cPickle as pickle
except ImportError:
  import pickle


class TimeSeries(list):
  def __init__(self, name, start, end, step, values, consolidate='average'):
    self.name = name
    self.start = start
    self.end = end
    self.step = step
    list.__init__(self,values)
    self.consolidationFunc = consolidate
    self.valuesPerPoint = 1
    self.options = {}


  def __iter__(self):
    if self.valuesPerPoint > 1:
      return self.__consolidatingGenerator( list.__iter__(self) )
    else:
      return list.__iter__(self)


  def consolidate(self, valuesPerPoint):
    self.valuesPerPoint = int(valuesPerPoint)


  def __consolidatingGenerator(self, gen):
    buf = []
    for x in gen:
      buf.append(x)
      if len(buf) == self.valuesPerPoint:
        while None in buf: buf.remove(None)
        if buf:
          yield self.__consolidate(buf)
          buf = []
        else:
          yield None
    while None in buf: buf.remove(None)
    if buf: yield self.__consolidate(buf)
    else: yield None
    raise StopIteration


  def __consolidate(self, values):
    usable = [v for v in values if v is not None]
    if not usable: return None
    if self.consolidationFunc == 'sum':
      return sum(usable)
    if self.consolidationFunc == 'average':
      return float(sum(usable)) / len(usable)
    if self.consolidationFunc == 'max':
      return max(usable)
    if self.consolidationFunc == 'min':
      return min(usable)
    raise Exception, "Invalid consolidation function!"


  def __repr__(self):
    return 'TimeSeries(name=%s, start=%s, end=%s, step=%s)' % (self.name, self.start, self.end, self.step)


  def getInfo(self):
    """Pickle-friendly representation of the series"""
    return {
      'name' : self.name,
      'start' : self.start,
      'end' : self.end,
      'step' : self.step,
      'values' : list(self),
    }



class CarbonLinkPool:
  def __init__(self, hosts, timeout):
    self.hosts = [ (server, instance) for (server, port, instance) in hosts ]
    self.ports = dict( ((server, instance), port) for (server, port, instance) in hosts )
    self.timeout = float(timeout)
    self.hash_ring = ConsistentHashRing(self.hosts)
    self.connections = {}
    self.last_failure = {}
    # Create a connection pool for each host
    for host in self.hosts:
      self.connections[host] = set()

  def select_host(self, metric):
    "Returns the carbon host that has data for the given metric"
    return self.hash_ring.get_node(metric)

  def get_connection(self, host):
    # First try to take one out of the pool for this host
    (server, instance) = host
    port = self.ports[host]
    connectionPool = self.connections[host]
    try:
      return connectionPool.pop()
    except KeyError:
      pass #nothing left in the pool, gotta make a new connection

    log.cache("CarbonLink creating a new socket for %s" % str(host))
    connection = socket.socket()
    connection.settimeout(self.timeout)
    try:
      connection.connect( (server, port) )
    except:
      self.last_failure[host] = time.time()
      raise
    else:
      connection.setsockopt( socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1 )
      return connection

  def query(self, metric):
    request = dict(type='cache-query', metric=metric)
    results = self.send_request(request)
    log.cache("CarbonLink cache-query request for %s returned %d datapoints" % (metric, len(results['datapoints'])))
    return results['datapoints']

  def query_bulk(self, metrics):
    cacheResultsByMetric = {}
    metricsByHost = {}

    for real_metric in metrics:
      host = self.select_host(real_metric)
      if metricsByHost.get(host):
         metricsByHost[host].append(real_metric)
      else:
         metricsByHost[host] = [real_metric]

    datapointsCounter = 0
    for host, metrics in metricsByHost.items():
       request = dict(type='cache-query-bulk', metrics=metrics)
       serialized_request = pickle.dumps(request, protocol=-1)
       len_prefix = struct.pack("!L", len(serialized_request))
       request_packet = len_prefix + serialized_request

       conn = self.get_connection(host)
       try:
         conn.sendall(request_packet)
         result = self.recv_response(conn)
       except:
         self.last_failure[host] = time.time()
         log.exception()
       else:
         self.connections[host].add(conn)
         if 'error' in result:
           log.cache("CarbonLink cache-query-bulk error %s" % result['error'])
         else:
           cacheResultsByMetric.update(result['datapointsByMetric'])
           datapointsCounter += len(result['datapointsByMetric'])

    log.cache("CarbonLink cache-query-bulk request returned %d datapoints" % datapointsCounter)
    return cacheResultsByMetric

  def get_metadata(self, metric, key):
    request = dict(type='get-metadata', metric=metric, key=key)
    results = self.send_request(request)
    log.cache("CarbonLink get-metadata request received for %s:%s" % (metric, key))
    return results['value']

  def set_metadata(self, metric, key, value):
    request = dict(type='set-metadata', metric=metric, key=key, value=value)
    results = self.send_request(request)
    log.cache("CarbonLink set-metadata request received for %s:%s" % (metric, key))
    return results

  def send_request(self, request):
    metric = request['metric']
    serialized_request = pickle.dumps(request, protocol=-1)
    len_prefix = struct.pack("!L", len(serialized_request))
    request_packet = len_prefix + serialized_request

    host = self.select_host(metric)
    conn = self.get_connection(host)
    try:
      conn.sendall(request_packet)
      result = self.recv_response(conn)
    except:
      self.last_failure[host] = time.time()
      raise
    else:
      self.connections[host].add(conn)
      if 'error' in result:
        raise CarbonLinkRequestError(result['error'])
      else:
        return result

  def recv_response(self, conn):
    len_prefix = recv_exactly(conn, 4)
    body_size = struct.unpack("!L", len_prefix)[0]
    body = recv_exactly(conn, body_size)
    return unpickle.loads(body)


# Utilities
class CarbonLinkRequestError(Exception):
  pass

def recv_exactly(conn, num_bytes):
  buf = ''
  while len(buf) < num_bytes:
    data = conn.recv( num_bytes - len(buf) )
    if not data:
      raise Exception("Connection lost")
    buf += data

  return buf

#parse hosts from local_settings.py
hosts = []
for host in settings.CARBONLINK_HOSTS:
  parts = host.split(':')
  server = parts[0]
  port = int( parts[1] )
  if len(parts) > 2:
    instance = parts[2]
  else:
    instance = None

  hosts.append( (server, int(port), instance) )


#A shared importable singleton
CarbonLink = CarbonLinkPool(hosts, settings.CARBONLINK_TIMEOUT)


# Data retrieval API
def fetchData(requestContext, pathExpr):
  seriesList = []
  startTime = int(epoch(requestContext['startTime']))
  endTime = int(epoch(requestContext['endTime']))
  now = int(epoch(requestContext['now']))

  dbFiles = [dbFile for dbFile in LOCAL_STORE.find(pathExpr)]

  if settings.CARBONLINK_QUERY_BULK:
    cacheResultsByMetric = CarbonLink.query_bulk([dbFile.real_metric for dbFile in dbFiles])

  for dbFile in dbFiles:
    log.metric_access(dbFile.metric_path)
    dbResults = dbFile.fetch(startTime, endTime, now)

    if dbFile.isLocal():
      try:
        if settings.CARBONLINK_QUERY_BULK:
          cachedResults = cacheResultsByMetric.get(dbFile.real_metric,[])
        else:
          cachedResults = CarbonLink.query(dbFile.real_metric)
        if cachedResults:
          dbResults = mergeResults(dbResults, cachedResults)
      except:
        log.exception("Failed CarbonLink query '%s'" % dbFile.real_metric)

    if not dbResults:
      continue

    (timeInfo,values) = dbResults
    (start,end,step) = timeInfo
    series = TimeSeries(dbFile.metric_path, start, end, step, values)
    series.pathExpression = pathExpr #hack to pass expressions through to render functions
    seriesList.append(series)

  if not requestContext['localOnly']:
    remote_nodes = [ RemoteNode(store, pathExpr, True) for store in STORE.remote_stores ]

    for node in remote_nodes:
      results = node.fetch(startTime, endTime, now)

      for series in results:
        ts = TimeSeries(series['name'], series['start'], series['end'], series['step'], series['values'])
        ts.pathExpression = pathExpr # hack as above

        series_handled = False
        for known in seriesList:
          if series['name'] == known.name:
            candidate_nones = len([val for val in series['values'] if val is None])
            known_nones = len([val for val in known if val is None])

            series_handled = True
            if candidate_nones >= known_nones:
              # If we already have this series in the seriesList, and
              # it is 'worse' than the other series, we don't need to
              # compare anything else. Save ourselves some work here.
              break
            else:
              seriesList[seriesList.index(known)] = ts

        # If we looked at this series above, and it matched a 'known'
        # series already, then it's already in the series list (or ignored).
        # If not, append it here.
        if not series_handled:
          seriesList.append(ts)

  return seriesList


def mergeResults(dbResults, cacheResults):
  cacheResults = list(cacheResults)

  if not dbResults:
    return cacheResults
  elif not cacheResults:
    return dbResults

  (timeInfo,values) = dbResults
  (start,end,step) = timeInfo

  for (timestamp, value) in cacheResults:
    interval = timestamp - (timestamp % step)

    try:
      i = int(interval - start) / step
      values[i] = value
    except:
      pass

  return (timeInfo,values)

