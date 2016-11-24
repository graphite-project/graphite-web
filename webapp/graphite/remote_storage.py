import time
import httplib
import requests
from urllib import urlencode
from threading import Lock
from django.conf import settings
from django.core.cache import cache
from graphite.node import RemoteNode, BranchNode
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

  def find(self, query, result_queue=False, headers=None):
    request = FindRequest(self, query)
    request.send(headers)
    if result_queue:
      result_queue.put(request)
    else:
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

  def send(self, headers=None):
    log.info("FindRequest.send(host=%s, query=%s) called" % (self.store.host, self.query))

    self.cachedResult = cache.get(self.cacheKey)
    if self.cachedResult is not None:
      log.info("FindRequest(host=%s, query=%s) using cached result" % (self.store.host, self.query))
      return

    url = "%s://%s/metrics/find/" % ('https' if settings.INTRACLUSTER_HTTPS else 'http', self.store.host)

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
      if settings.REMOTE_STORE_USE_POST:
        self.connection = requests.post(url, data=query_params, headers=headers or {}, timeout=settings.REMOTE_FIND_TIMEOUT)
      else:
        self.connection = requests.get(url, params=query_params, headers=headers or {}, timeout=settings.REMOTE_FIND_TIMEOUT)
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
        self.connection.raise_for_status()
        results = unpickle.loads(self.connection.content)
      except:
        log.exception("FindRequest.get_results(host=%s, query=%s) exception processing response" % (self.store.host, self.query))
        self.store.fail()
        return

      cache.set(self.cacheKey, results, settings.FIND_CACHE_DURATION)

    for node_info in results:
      if node_info.get('is_leaf'):
        reader = RemoteReader(self.store, node_info, bulk_query=self.query.pattern)
        node = RemoteNode(node_info['path'], reader)
      else:
        node = BranchNode(node_info['path'])

      node.local = False
      yield node


class ReadResult(object):
  __slots__ = ('store', 'has_done_response_read', 'result', 'done_cb', 'connection', 'urlpath', 'query_string', 'headers')

  def __init__(self, store, urlpath, done_cb, query_string='', headers=None):
    self.store = store
    self.has_done_response_read = False
    self.result = None
    self.done_cb = done_cb
    self.urlpath = urlpath
    self.query_string = query_string
    self.headers = headers or {}
    self._connect()

  def _connect(self):
    url = "%s://%s%s" % ('https' if settings.INTRACLUSTER_HTTPS else 'http', self.store.host, self.urlpath)
    try:
      log.info("ReadResult :: requesting %s?%s" % (url, self.query_string))
      if settings.REMOTE_STORE_USE_POST:
        self.connection = requests.post(url, data=self.query_string, header=self.headers, timeout=settings.REMOTE_FETCH_TIMEOUT)
      else:
        self.connection = requests.get(url, params=self.query_string, headers=self.headers, timeout=settings.REMOTE_FETCH_TIMEOUT)
    except:
      self.store.fail()
      log.exception("Error requesting %s?%s" % (url, self.query_string))
      raise

  def get(self):
    try:
      if self.connection.status_code != 200:
        raise Exception("Error response %d %s from http://%s%s?%s" % (self.connection.status_code, self.connection.reason, self.store.host, self.urlpath, self.query_string))
      pickled_response = self.connection.content
      self.result = {
          series['name']: series
          for series in unpickle.loads(pickled_response)
      }
      return self.result
    except:
      self.store.fail()
      log.exception("Error requesting http://%s%s?%s" % (self.store.host, self.urlpath, self.query_string))
      raise
    finally:
      if self.done_cb:
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

  def fetch(self, startTime, endTime, now=None, headers=None):
    query_params = [
      ('target', self.query),
      ('format', 'pickle'),
      ('local', '1'),
      ('noCache', '1'),
      ('from', str( int(startTime) )),
      ('until', str( int(endTime) ))
    ]
    if now is not None:
      query_params.append(('now', str( int(now) )))
    query_string = urlencode(query_params)
    urlpath = '/render/'
    url = "http://%s%s?%s" % (self.store.host, urlpath, query_string)

    fetch_result = self.get_inflight_requests(url, urlpath, query_string, headers)

    def extract_my_results():
      series = fetch_result.get().get(self.metric_path, None)
      if not series:
        return None
      time_info = (series['start'], series['end'], series['step'])
      return (time_info, series['values'])

    return FetchInProgress(extract_my_results)

  def get_inflight_requests(self, url, urlpath, query_string, headers):
    return ReadResult(self.store, urlpath, None, query_string, headers)
    with self.inflight_lock:
      if url not in self.inflight_requests:
        self.inflight_requests[url] = ReadResult(self.store, urlpath, lambda: self.done_inflight_request(url), query_string, headers)
      return self.inflight_requests[url]

  def done_inflight_request(self, url):
    with self.inflight_lock:
      del self.inflight_requests[url]


def extractForwardHeaders(request):
    headers = {}
    for name in settings.REMOTE_STORE_FORWARD_HEADERS:
        headers[name] = request.META.get('HTTP_%s' % name.upper().replace('-', '_'))
    return headers
