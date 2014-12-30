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
import threading
import Queue
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
      'pathExpression' : self.pathExpression
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


def _timebounds(requestContext):
  startTime = int(epoch(requestContext['startTime']))
  endTime = int(epoch(requestContext['endTime']))
  now = int(epoch(requestContext['now']))

  return (startTime, endTime, now)

def _prefetchMetricKey(pathExpression, start, end):
  return '-'.join([pathExpression, str(start), str(end)])

def prefetchRemoteData(requestContext, pathExpressions):
  # if required, fetch data from all remote nodes
  # storing the result in a big hash of the form:
  # data[node][hash(originalPathExpression, start, end)] = [ matchingSeries, matchingSeries2, ... ]
  prefetchedRemoteData = {}
  if requestContext['localOnly']:
    return prefetchedRemoteData

  (startTime, endTime, now) = _timebounds(requestContext)
  result_queue = fetchRemoteData(requestContext, pathExpressions, False)
  while not result_queue.empty():
    try:
      (node, results) = result_queue.get_nowait()
    except Queue.Empty:
      log.exception("result_queue not empty, but unable to retrieve results")

    # prefill result with empty list
    # Needed to be able to detect if a query has already been made
    prefetchedRemoteData[node] = {}
    for pe in pathExpressions:
      prefetchedRemoteData[node][_prefetchMetricKey(pe, startTime, endTime)] = []

    for series in results:
      # series.pathExpression is original target, ie. containing wildcards
      # XXX would be nice to disable further prefetch calls to that backend
      try:
        k = _prefetchMetricKey(series['pathExpression'], startTime, endTime)
      except KeyError:
        log.exception("Remote node %s doesn't support prefetching data... upgrade!" % node)
        raise
        
      if prefetchedRemoteData[node].get(k) is None:
        # This should not be needed because of above filling with [],
        # but could happen if backend sends unexpected stuff
        prefetchedRemoteData[node][k] = [series]
      else:
        prefetchedRemoteData[node][k].append(series)

  return prefetchedRemoteData
  

def prefetchLookup(requestContext, node):
  # Returns a seriesList if found in cache
  # or None if key doesn't exist (aka prefetch didn't cover this pathExpr / timerange
  (start, end, now) = _timebounds(requestContext)
  try:
    cache = requestContext['prefetchedRemoteData'][node.store.host]
    r = cache[_prefetchMetricKey(node.metric_path, start, end)]
  except (AttributeError, KeyError):
    r = None

  return r

def fetchRemoteData(requestContext, pathExpr, usePrefetchCache=settings.PREFETCH_REMOTE_DATA):
  (startTime, endTime, now) = _timebounds(requestContext)
  remote_nodes = [ RemoteNode(store, pathExpr, True) for store in STORE.remote_stores ]

  # Go through all of the remote_nodes, and launch a remote_fetch for each one.
  # Each fetch will take place in its own thread, since it's naturally parallel work.
  # Notable: return the 'seriesList' result from each node.fetch into result_queue
  # instead of directly from the method. Queue.Queue() is threadsafe.
  remote_fetches = []
  result_queue = Queue.Queue()
  for node in remote_nodes:
      need_fetch = True
      if usePrefetchCache:
        series = prefetchLookup(requestContext, node)
        # Will be either:
        #   []: prefetch done, returned no data. Do not fetch
        #   seriesList: prefetch done, returned data, do not fetch
        #   None: prefetch not done, FETCH
        if series is not None:
          result_queue.put( (node, series) )
          need_fetch = False
      if need_fetch:
        fetch_thread = threading.Thread(target=node.fetch,
                                        args=(startTime, endTime, now, result_queue))
        fetch_thread.start()
        remote_fetches.append(fetch_thread)

  # Once the remote_fetches have started, wait for them all to finish. Assuming an
  # upper bound of REMOTE_STORE_FETCH_TIMEOUT per thread, this should take about that
  # amount of time (6s by default) at the longest. If every thread blocks permanently,
  # then this could take a horrible REMOTE_STORE_FETCH_TIMEOUT * num(remote_fetches),
  # but then that would imply that remote_storage's HTTPConnectionWithTimeout class isn't
  # working correctly :-)
  for fetch_thread in remote_fetches:
    try:
      fetch_thread.join(settings.REMOTE_STORE_FETCH_TIMEOUT)
    except:
      log.exception("Failed to join remote_fetch thread within %ss" % (settings.REMOTE_STORE_FETCH_TIMEOUT))

  return result_queue

# Data retrieval API
def fetchData(requestContext, pathExpr):
  seriesList = []
  (startTime, endTime, now) = _timebounds(requestContext)

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
    result_queue = fetchRemoteData(requestContext, pathExpr)

    # Used as a cache to avoid recounting series None values below.
    series_best_nones = {}

    # Once we've waited for the threads to return, process the results. We could theoretically
    # start processing results right away, but that's a relatively minor optimization compared
    # to not waiting for remote hosts sequentially.
    while not result_queue.empty():
      try:
        (node, results) = result_queue.get(False)
      except:
        log.exception("result_queue not empty, but unable to retrieve results")

      for series in results:
        ts = TimeSeries(series['name'], series['start'], series['end'], series['step'], series['values'])
        ts.pathExpression = pathExpr # hack as above

        series_handled = False
        for known in seriesList:
          if series['name'] == known.name:
            # This counts the Nones in each series, and is unfortunately O(n) for each
            # series, which may be worth further optimization. The value of doing this
            # at all is to avoid the "flipping" effect of loading a graph multiple times
            # and having inconsistent data returned if one of the backing stores has
            # inconsistent data. This is imperfect as a validity test, but in practice
            # nicely keeps us using the "most complete" dataset available. Think of it
            # as a very weak CRDT resolver.
            candidate_nones = len([val for val in series['values'] if val is None])

            # To avoid repeatedly recounting the 'Nones' in series we've already seen,
            # cache the best known count so far in a dict.
            if known.name in series_best_nones:
              known_nones = series_best_nones[known.name]
            else:
              known_nones = len([val for val in known if val is None])
              series_best_nones[known.name] = known_nones

            series_handled = True
            if candidate_nones >= known_nones:
              # If we already have this series in the seriesList, and the
              # candidate is 'worse' than what we already have, we don't need
              # to compare anything else. Save ourselves some work here.
              break
            else:
              # We've found a series better than what we've already seen. Update
              # the count cache and replace the given series in the array.
              series_best_nones[known.name] = candidate_nones
              seriesList[seriesList.index(known)] = ts

        # If we looked at this series above, and it matched a 'known'
        # series already, then it's already in the series list (or ignored).
        # If not, append it here.
        if not series_handled:
          seriesList.append(ts)

  # Stabilize the order of the results by ordering the resulting series by name.
  # This returns the result ordering to the behavior observed pre PR#1010.
  return sorted(seriesList, key=lambda series: series.name)


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

