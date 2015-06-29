import socket
import time
import httplib
from urllib import urlencode
from django.core.cache import cache
from django.conf import settings
from graphite.render.hashing import compactHash
from graphite.util import unpickle



class RemoteStore(object):
  lastFailure = 0.0
  retryDelay = settings.REMOTE_STORE_RETRY_DELAY
  available = property(lambda self: time.time() - self.lastFailure > self.retryDelay)

  def __init__(self, host):
    self.host = host


  def find(self, query, result_queue=False):
    request = FindRequest(self, query)
    request.send()
    if result_queue:
      result_queue.put(request)
    else:
      return request


  def fail(self):
    self.lastFailure = time.time()



class FindRequest:
  suppressErrors = True

  def __init__(self, store, query):
    self.store = store
    self.query = query
    self.connection = None
    self.cacheKey = compactHash('find:%s:%s' % (self.store.host, query))
    self.cachedResults = None


  def send(self):
    self.cachedResults = cache.get(self.cacheKey)

    if self.cachedResults:
      return

    self.connection = HTTPConnectionWithTimeout(self.store.host)
    self.connection.timeout = settings.REMOTE_STORE_FIND_TIMEOUT

    query_params = [
      ('local', '1'),
      ('format', 'pickle'),
      ('query', settings.REMOTE_STORE_METRIC_PREFIX + self.query),
    ]
    query_string = urlencode(query_params)

    try:
      if settings.REMOTE_STORE_USE_POST:
        self.connection.request('POST', '/metrics/find/', query_string)
      else:
        self.connection.request('GET', '/metrics/find/?' + query_string)
    except:
      self.store.fail()
      if not self.suppressErrors:
        raise


  def get_results(self):
    if self.cachedResults:
      return self.cachedResults

    if not self.connection:
      self.send()

    try:
      response = self.connection.getresponse()
      assert response.status == 200, "received error response %s - %s" % (response.status, response.reason)
      result_data = response.read()
      results = unpickle.loads(result_data)

    except:
      self.store.fail()
      if not self.suppressErrors:
        raise
      else:
        results = []

    resultNodes = [ RemoteNode(self.store, node['metric_path'], node['isLeaf']) for node in results ]
    cache.set(self.cacheKey, resultNodes, settings.REMOTE_FIND_CACHE_DURATION)
    self.cachedResults = resultNodes
    return resultNodes


def prepend_prefix(metric_path):
  if isinstance(metric_path, list):
    return [ prepend_prefix(p) for p in metric_path ]
  if metric_path.startswith(settings.REMOTE_STORE_METRIC_PREFIX):
    return metric_path
  return settings.REMOTE_STORE_METRIC_PREFIX + metric_path


def truncate_prefix(metric_path):
  if isinstance(metric_path, list):
    return [ truncate_prefix(p) for p in metric_path ]
  if not metric_path.startswith(settings.REMOTE_STORE_METRIC_PREFIX):
    return metric_path
  return metric_path[len(settings.REMOTE_STORE_METRIC_PREFIX):]


class RemoteNode:
  context = {}

  def __init__(self, store, metric_path, isLeaf):
    self.store = store
    self.fs_path = None
    self.metric_path = truncate_prefix(metric_path)
    self.real_metric = prepend_prefix(metric_path)
    self.__isLeaf = isLeaf
    self.__isBulk = True if isinstance(metric_path, list) else False

    if self.__isBulk:
      self.name = "Bulk: %s" % self.metric_path
    else:
      self.name = self.metric_path.split('.')[-1]


  def fetch(self, startTime, endTime, now=None, result_queue=None):
    if not self.__isLeaf:
      return []
    if self.__isBulk:
      targets = [ ('target', v) for v in self.real_metric ]
    else:
      targets = [ ('target', self.real_metric) ]

    query_params = [
      ('local', '1'),
      ('format', 'pickle'),
      ('from', str( int(startTime) )),
      ('until', str( int(endTime) ))
    ]
    query_params.extend(targets)
    if now is not None:
      query_params.append(('now', str( int(now) )))
    query_string = urlencode(query_params)

    connection = HTTPConnectionWithTimeout(self.store.host)
    connection.timeout = settings.REMOTE_STORE_FETCH_TIMEOUT
    if settings.REMOTE_STORE_USE_POST:
      connection.request('POST', '/render/', query_string)
    else:
      connection.request('GET', '/render/?' + query_string)
    response = connection.getresponse()
    assert response.status == 200, "Failed to retrieve remote data: %d %s" % (response.status, response.reason)
    rawData = response.read()

    seriesList = unpickle.loads(rawData)

    for series in seriesList:
      series['name'] = truncate_prefix(series['name'])
      series['pathExpression'] = truncate_prefix(series['pathExpression'])

    if result_queue:
      result_queue.put( (self.store.host, seriesList) )
    else:
      return seriesList

  def isLeaf(self):
    return self.__isLeaf

  def isLocal(self):
    return False



# This is a hack to put a timeout in the connect() of an HTTP request.
# Python 2.6 supports this already, but many Graphite installations
# are not on 2.6 yet.

class HTTPConnectionWithTimeout(httplib.HTTPConnection):
  timeout = 30

  def connect(self):
    msg = "getaddrinfo returns an empty list"
    for res in socket.getaddrinfo(self.host, self.port, 0, socket.SOCK_STREAM):
      af, socktype, proto, canonname, sa = res
      try:
        self.sock = socket.socket(af, socktype, proto)
        try:
          self.sock.settimeout( float(self.timeout) ) # default self.timeout is an object() in 2.6
        except:
          pass
        self.sock.connect(sa)
        self.sock.settimeout(None)
      except socket.error, msg:
        if self.sock:
          self.sock.close()
          self.sock = None
          continue
      break
    if not self.sock:
      raise socket.error, msg
