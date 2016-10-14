import time
import httplib
from urllib import urlencode
from threading import Lock
from django.conf import settings
from django.core.cache import cache
from graphite.node import LeafNode, BranchNode
from graphite.readers import FetchInProgress
from graphite.logger import log
from graphite.util import unpickle
from graphite.render.hashing import compactHash

def connector_class_selector(https_support=False):
    return httplib.HTTPSConnection if https_support else httplib.HTTPConnection

class RemoteStore(object):
  lastFailure = 0.0
  available = property(lambda self: time.time() - self.lastFailure > settings.REMOTE_RETRY_DELAY)

  def __init__(self, host):
    self.host = host

  def find(self, query):
    request = FindRequest(self, query)
    request.send()
    return request

  def fail(self):
    self.lastFailure = time.time()


class FindRequest(object):
  __slots__ = ('store', 'query', 'connection',
               'failed', 'cacheKey', 'cachedResult')

  def __init__(self, store, query):
    self.store = store
    self.query = query
    self.connection = None
    self.failed = False

    if query.startTime:
      start = query.startTime - (query.startTime % settings.FIND_CACHE_DURATION)
    else:
      start = ""

    if query.endTime:
      end = query.endTime - (query.endTime % settings.FIND_CACHE_DURATION)
    else:
      end = ""

    self.cacheKey = "find:%s:%s:%s:%s" % (store.host, compactHash(query.pattern), start, end)
    self.cachedResult = None

  def send(self):
    log.info("FindRequest.send(host=%s, query=%s) called" % (self.store.host, self.query))

    self.cachedResult = cache.get(self.cacheKey)
    if self.cachedResult is not None:
      log.info("FindRequest(host=%s, query=%s) using cached result" % (self.store.host, self.query))
      return

    connector_class = connector_class_selector(settings.INTRACLUSTER_HTTPS)
    self.connection = connector_class(self.store.host)
    self.connection.timeout = settings.REMOTE_FIND_TIMEOUT

    query_params = [
      ('local', '1'),
      ('format', 'pickle'),
      ('query', self.query.pattern),
    ]
    if self.query.startTime:
      query_params.append( ('from', self.query.startTime) )

    if self.query.endTime:
      query_params.append( ('until', self.query.endTime) )

    query_string = urlencode(query_params)

    try:
      self.connection.request('GET', '/metrics/find/?' + query_string)
    except:
      log.exception("FindRequest.send(host=%s, query=%s) exception during request" % (self.store.host, self.query))
      self.store.fail()
      self.failed = True

  def get_results(self):
    if self.failed:
      return

    if self.cachedResult is not None:
      results = self.cachedResult
    else:
      if self.connection is None:
        self.send()

      try:
        try: # Python 2.7+, use buffering of HTTP responses
          response = self.connection.getresponse(buffering=True)
        except TypeError:  # Python 2.6 and older
          response = self.connection.getresponse()
        assert response.status == 200, "received error response %s - %s" % (response.status, response.reason)
        result_data = response.read()
        results = unpickle.loads(result_data)

      except:
        log.exception("FindRequest.get_results(host=%s, query=%s) exception processing response" % (self.store.host, self.query))
        self.store.fail()
        return

      cache.set(self.cacheKey, results, settings.FIND_CACHE_DURATION)

    for node_info in results:
      if node_info.get('is_leaf'):
        reader = RemoteReader(self.store, node_info, bulk_query=self.query.pattern)
        node = LeafNode(node_info['path'], reader)
      else:
        node = BranchNode(node_info['path'])

      node.local = False
      yield node


class ReadResult(object):
  __slots__ = ('lock', 'store', 'has_done_response_read', 'result', 'done_cb', 'connection', 'urlpath')

  def __init__(self, store, urlpath, done_cb):
    self.lock = Lock()
    self.store = store
    self.has_done_response_read = False
    self.result = None
    self.done_cb = done_cb
    self.urlpath = urlpath
    self._connect(urlpath)

  def _connect(self, urlpath):
    url = "http://%s%s" % (self.store.host, urlpath)
    try:
      log.info("ReadResult :: requesting %s" % url)
      connector_class = connector_class_selector(settings.INTRACLUSTER_HTTPS)
      self.connection = connector_class(self.store.host)
      self.connection.timeout = settings.REMOTE_FETCH_TIMEOUT
      self.connection.request('GET', urlpath)
    except:
      self.store.fail()
      log.exception("Error requesting %s" % url)
      raise

  def get(self):
    """
    First thread to call `get` will read a response from alrady established connections
    Subsequent calls will get memoized response
    """
    with self.lock:
      if not self.has_done_response_read:  # we are first one to call for result
        return self.read_response()
      else:  # result was already read, return it
        if self.result is None:
          raise Exception("Passive remote fetch failed to find cached results")
        return self.result

  def read_response(self): # called under self.lock
    try:
      self.has_done_response_read = True

      # safe if self.connection.timeout works as advertised
      try: # Python 2.7+, use buffering of HTTP responses
        response = self.connection.getresponse(buffering=True)
      except TypeError:  # Python 2.6 and older
        response = self.connection.getresponse()

      if response.status != 200:
        raise Exception("Error response %d %s from http://%s%s" % (response.status, response.reason, self.store.host, self.urlpath))
      pickled_response = response.read()
      self.result = {
          series['name']: series
          for series in unpickle.loads(pickled_response)
      }
      return self.result
    except:
      self.store.fail()
      log.exception("Error requesting http://%s%s" % (self.store.host, self.urlpath))
      raise
    finally:
      self.done_cb()

class RemoteReader(object):
  __slots__ = ('store', 'metric_path', 'intervals', 'query', 'connection')
  inflight_requests = {}
  inflight_lock = Lock()

  def __init__(self, store, node_info, bulk_query=None):
    self.store = store
    self.metric_path = node_info['path']
    self.intervals = node_info['intervals']
    self.query = bulk_query or node_info['path']
    self.connection = None

  def __repr__(self):
    return '<RemoteReader[%x]: %s>' % (id(self), self.store.host)

  def get_intervals(self):
    return self.intervals

  def fetch(self, startTime, endTime):
    query_params = [
      ('target', self.query),
      ('format', 'pickle'),
      ('local', '1'),
      ('noCache', '1'),
      ('from', str( int(startTime) )),
      ('until', str( int(endTime) ))
    ]
    query_string = urlencode(query_params)
    urlpath = '/render/?' + query_string
    url = "http://%s%s" % (self.store.host, urlpath)

    fetch_result = self.get_inflight_requests(url, urlpath)

    def extract_my_results():
      series = fetch_result.get().get(self.metric_path, None)
      if not series:
        return None
      time_info = (series['start'], series['end'], series['step'])
      return (time_info, series['values'])

    return FetchInProgress(extract_my_results)

  def get_inflight_requests(self, url, urlpath):
    with self.inflight_lock:
      if url not in self.inflight_requests:
        self.inflight_requests[url] = ReadResult(self.store, urlpath, lambda: self.done_inflight_request(url))
      return self.inflight_requests[url]

  def done_inflight_request(self, url):
    with self.inflight_lock:
      del self.inflight_requests[url]
