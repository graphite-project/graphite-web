import time
import httplib
import urllib3
from urllib import urlencode
from threading import Lock, current_thread
from django.conf import settings
from django.core.cache import cache
from graphite.intervals import Interval, IntervalSet
from graphite.node import LeafNode, BranchNode
from graphite.logger import log
from graphite.util import unpickle
from graphite.readers import FetchInProgress
from graphite.render.hashing import compactHash
from graphite.util import timebounds

http = urllib3.PoolManager(num_pools=10, maxsize=5)

def connector_class_selector(https_support=False):
    return httplib.HTTPSConnection if https_support else httplib.HTTPConnection


class RemoteStore(object):
  lastFailure = 0.0
  available = property(lambda self: time.time() - self.lastFailure > settings.REMOTE_RETRY_DELAY)

  def __init__(self, host):
    self.host = host

  def find(self, query, result_queue=False, headers=None):
    request = FindRequest(self, query)
    if result_queue:
      result_queue.put(request.send(headers))
    else:
      return request.send(headers)

  def fetch(self, path_expr, requestContext):
    (startTime, endTime, now) = timebounds(requestContext)

    return RemoteReader(
      self,
      {
        'path': path_expr,
        'intervals': [],
      },
      bulk_query=path_expr
    ).fetch_list(startTime, endTime, requestContext)

  def fail(self):
    self.lastFailure = time.time()


class FindRequest(object):
  __slots__ = ('store', 'query', 'cacheKey')

  def __init__(self, store, query):
    self.store = store
    self.query = query

    if query.startTime:
      start = query.startTime - (query.startTime % settings.FIND_CACHE_DURATION)
    else:
      start = ""

    if query.endTime:
      end = query.endTime - (query.endTime % settings.FIND_CACHE_DURATION)
    else:
      end = ""

    self.cacheKey = "find:%s:%s:%s:%s" % (store.host, compactHash(query.pattern), start, end)

  def send(self, headers=None):
    t = time.time()
    log.info(".send(host=%s, query=%s) called at %s" % (self.store.host, self.query, t))

    results = cache.get(self.cacheKey)
    if results is not None:
      log.info("FindRequest.send(host=%s, query=%s) using cached result" % (self.store.host, self.query))
    else:
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

      try:
        result = http.request('POST' if settings.REMOTE_STORE_USE_POST else 'GET',
                              url, fields=query_params, headers=headers, timeout=settings.REMOTE_FIND_TIMEOUT)
      except:
        log.exception("FindRequest.send(host=%s, query=%s) exception during request" % (self.store.host, self.query))
        self.store.fail()
        return

      if result.status != 200:
        log.exception("FindRequest.send(host=%s, query=%s) error response %d from %s?%s" % (self.store.host, self.query, result.status, url, urlencode(query_params)))
        self.store.fail()
        return

      try:
        results = unpickle.loads(result.data)
      except:
        log.exception("FindRequest.send(host=%s, query=%s) exception processing response" % (self.store.host, self.query))
        self.store.fail()
        return

      cache.set(self.cacheKey, results, settings.FIND_CACHE_DURATION)

    log.info("FindRequest.send(host=%s, query=%s) completed in %fs at %s" % (self.store.host, self.query, time.time() - t, time.time()))

    for node_info in results:
      # handle both 1.x and 0.9.x output
      path = node_info.get('path') or node_info.get('metric_path')
      is_leaf = node_info.get('is_leaf') or node_info.get('isLeaf')
      intervals = node_info.get('intervals') or []
      if not isinstance(intervals, IntervalSet):
        intervals = IntervalSet([Interval(interval[0], interval[1]) for interval in intervals])

      node_info = {
        'is_leaf': is_leaf,
        'path': path,
        'intervals': intervals,
      }

      if is_leaf:
        reader = RemoteReader(self.store, node_info, bulk_query=self.query.pattern)
        node = LeafNode(path, reader)
      else:
        node = BranchNode(path)

      node.local = False
      yield node


class RemoteReader(object):
  __slots__ = ('store', 'metric_path', 'intervals', 'query', 'connection')
  inflight_lock = Lock()

  def __init__(self, store, node_info, bulk_query=None):
    self.store = store
    self.metric_path = node_info.get('path') or node_info.get('metric_path')
    self.intervals = node_info['intervals']
    self.query = bulk_query or self.metric_path
    self.connection = None

  def __repr__(self):
    return '<RemoteReader[%x]: %s>' % (id(self), self.store.host)

  def get_intervals(self):
    return self.intervals

  def fetch(self, startTime, endTime, requestContext):
    return self._fetch(startTime, endTime, requestContext)

  def _fetch(self, startTime, endTime, requestContext):
    seriesList = self.fetch_list(startTime, endTime, requestContext)

    if isinstance(seriesList, FetchInProgress):
      seriesList = seriesList.waitForResults()

    if seriesList is None:
      return None

    for series in seriesList:
      if series['name'] == self.metric_path:
        time_info = (series['start'], series['end'], series['step'])
        return (time_info, series['values'])

  def log_info(self, msg):
    log.info(('thread %s at %fs ' % (current_thread().name, time.time())) + msg)

  def fetch_list(self, startTime, endTime, requestContext):
    (startTime, endTime, now) = timebounds(requestContext)
    t = time.time()

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
    url = "%s://%s%s" % ('https' if settings.INTRACLUSTER_HTTPS else 'http', self.store.host, urlpath)
    headers = requestContext.get('forwardHeaders') if requestContext else None

    cacheKey = "%s?%s" % (url, query_string)

    with self.inflight_lock:
      self.log_info("ReadResult :: got global lock %s?%s" % (url, query_string))
      if requestContext is None:
        requestContext = {}
      if 'inflight_locks' not in requestContext:
        requestContext['inflight_locks'] = {}
      if 'inflight_requests' not in requestContext:
        requestContext['inflight_requests'] = {}

      if cacheKey in requestContext['inflight_locks']:
        self.log_info("ReadResult :: returning FetchInProgress %s?%s" % (url, query_string))

        def fetch_result():
          with requestContext['inflight_locks'][cacheKey]:
            self.log_info("ReadResult :: returning cached data via FetchInProgress %s?%s" % (url, query_string))
            return requestContext['inflight_requests'][cacheKey] if cacheKey in requestContext['inflight_requests'] else None

        return FetchInProgress(fetch_result)

      self.log_info("ReadResult :: creating lock %s?%s" % (url, query_string))
      requestContext['inflight_locks'][cacheKey] = Lock()

      cacheLock = requestContext['inflight_locks'][cacheKey]

    with cacheLock:
      self.log_info("ReadResult :: got url lock %s?%s" % (url, query_string))
      try:
        data = requestContext['inflight_requests'][cacheKey]
        self.log_info("ReadResult :: returning cached data %s?%s in %fs" % (url, query_string))
        return data
      except KeyError:
        # the request isn't in flight, let's start it
        pass

      try:
        self.log_info("ReadResult :: requesting %s?%s" % (url, query_string))
        result = http.request('POST' if settings.REMOTE_STORE_USE_POST else 'GET',
                              url, fields=query_params, headers=headers, timeout=settings.REMOTE_FIND_TIMEOUT)
        if result.status != 200:
          self.store.fail()
          self.log_info("ReadResult :: Error response %d from %s?%s" % (result.status, url, query_string))
          data = None
        else:
          data = unpickle.loads(result.data)
          self.log_info("ReadResult :: returning %s?%s in %fs" % (url, query_string, time.time() - t))
      except Exception as err:
        self.store.fail()
        self.log_info("ReadResult :: Error requesting %s?%s: %s" % (url, query_string, err))
        data = None

      requestContext['inflight_requests'][cacheKey] = data

    return data


def extractForwardHeaders(request):
    headers = {}
    for name in settings.REMOTE_STORE_FORWARD_HEADERS:
        headers[name] = request.META.get('HTTP_%s' % name.upper().replace('-', '_'))
    return headers
