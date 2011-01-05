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
from graphite.storage import STORE

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
  def __init__(self,hosts,timeout):
    self.hosts = hosts
    self.timeout = float(timeout)
    self.connections = {}
    # Create a connection pool for each host
    for host in hosts:
      self.connections[host] = set()

  def selectHost(self, metric):
    "Returns the carbon host that has data for the given metric"
    return self.hosts[ hash(metric) % len(self.hosts) ]

  def getConnection(self, host):
    # First try to take one out of the pool for this host
    connectionPool = self.connections[host]
    try:
      return connectionPool.pop()
    except KeyError:
      pass #nothing left in the pool, gotta make a new connection

    log.cache("CarbonLink creating a new socket for %s:%d" % host)
    connection = socket.socket()
    connection.settimeout(self.timeout)
    connection.connect(host)
    connection.setsockopt( socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1 )
    return connection

  def putConnectionInPool(self, host, connection):
    connectionPool = self.connections[host]
    connectionPool.add(connection)

  def removeConnectionFromPool(self, host, connection):
    connectionPool = self.connections.get(host, set())
    connectionPool.discard(connection)

  def sendRequest(self, metric):
    "Sends a request and returns a completion callback"
    host = self.selectHost(metric)
    query = struct.pack("!L", len(metric)) + metric # 32-bit length prefix string
    connection = None

    try:
      connection = self.getConnection(host)
      connection.sendall(query)

      # To keep things asynchronous we return a result callback
      def receiveResponse():
        try:
          buf = ''
          remaining = 4
          message_size = None

          while remaining:
            packet = connection.recv(remaining)
            assert packet, "CarbonLink lost connection to %s:%d" % host

            buf += packet

            if message_size is None:
              if len(buf) == 4:
                remaining = message_size = struct.unpack("!L", buf)[0]
                buf = ''
                continue

            remaining -= len(packet)

          # We're done with the connection for this request, put it in the pool
          self.putConnectionInPool(host, connection)

          # Now parse the response
          points = pickle.loads(buf)
          log.cache("CarbonLink to %s, retrieved %d points for %s" % (host,len(points),metric))

          for point in points:
            yield point

        except:
          log.exception("CarbonLink to %s, exception while getting response" % str(host))
          self.removeConnectionFromPool(host, connection)

      return receiveResponse
    except:
      log.exception("CarbonLink to %s, exception while sending request" % str(host))
      if connection:
        self.removeConnectionFromPool(host, connection)
      noResults = lambda: []
      return noResults


#parse hosts from local_settings.py
hosts = []
for host in settings.CARBONLINK_HOSTS:
  server,port = host.split(':',1)
  hosts.append( (server,int(port)) )


#A shared importable singleton
CarbonLink = CarbonLinkPool(hosts, settings.CARBONLINK_TIMEOUT)


# Data retrieval API
def fetchData(requestContext, pathExpr):
  if pathExpr.lower().startswith('graphite.'):
    pathExpr = pathExpr[9:]

  seriesList = []
  startTime = requestContext['startTime']
  endTime = requestContext['endTime']

  for dbFile in STORE.find(pathExpr):
    log.metric_access(dbFile.metric_path)
    getCacheResults = CarbonLink.sendRequest(dbFile.real_metric)
    dbResults = dbFile.fetch( timestamp(startTime), timestamp(endTime) )
    results = mergeResults(dbResults, getCacheResults())

    if not results:
      continue

    (timeInfo,values) = results
    (start,end,step) = timeInfo
    series = TimeSeries(dbFile.metric_path, start, end, step, values)
    series.pathExpression = pathExpr #hack to pass expressions through to render functions
    seriesList.append(series)

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


def timestamp(datetime):
  "Convert a datetime object into epoch time"
  return time.mktime( datetime.timetuple() )
