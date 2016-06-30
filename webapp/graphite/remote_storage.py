import time
import httplib
from urllib import urlencode
from threading import Lock, Event
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


class RemoteReader(object):
  __slots__ = ('store', 'metric_path', 'intervals', 'query', 'connection')
  cache_lock = Lock()
  request_cache = {}
  request_times = {}


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

    # Quick cache check up front
    self.clean_cache()
    with self.cache_lock:
      cached_results = self.request_cache.get(url)
    if cached_results:
      for series in cached_results:
        if series['name'] == self.metric_path:
          time_info = (series['start'], series['end'], series['step'])
          return (time_info, series['values'])

    # Synchronize with other RemoteReaders using the same bulk query.
    # Despite our use of thread synchronization primitives, the common
    # case is for synchronizing asynchronous fetch operations within
    # a single thread.
    (request_initiator, completion_event) = self.get_inflight_requests(url)

    if self is request_initiator: # we only send the request the first time we're called
      try:
        log.info("RemoteReader.request_data :: requesting %s" % url)
        connector_class = connector_class_selector(settings.INTRACLUSTER_HTTPS)
        self.connection = connector_class(self.store.host)
        self.connection.timeout = settings.REMOTE_FETCH_TIMEOUT
        self.connection.request('GET', urlpath)
      except:
        completion_event.set()
        self.store.fail()
        self.cleanup_inflight_requests(url)
        log.exception("Error requesting %s" % url)
        raise

    def wait_for_results():
      if self is request_initiator:
        try:
          response = self.connection.getresponse()
          if response.status != 200:
            raise Exception("Error response %d %s from %s" % (response.status, response.reason, url))

          pickled_response = response.read()
          results = unpickle.loads(pickled_response)
          with self.cache_lock:
            self.request_cache[url] = results
          completion_event.set()
          return results
        except:
          completion_event.set()
          self.store.fail()
          log.exception("Error requesting %s" % url)
          raise
        finally:
          self.cleanup_inflight_requests(url)

      elif completion_event.wait(settings.REMOTE_FETCH_TIMEOUT): # otherwise we just wait on the completion_event
        with self.cache_lock:
          cached_results = self.request_cache.get(url)
        if cached_results is None:
          raise Exception("Passive remote fetch returned None (bug?)")
        else:
          return cached_results
      else:  # passive wait failed (timed out)
        raise Exception("Passive remote fetch timed out waiting for request initiator to fetch results")

    def extract_my_results():
      for series in wait_for_results():
        if series['name'] == self.metric_path:
          time_info = (series['start'], series['end'], series['step'])
          return (time_info, series['values'])

    return FetchInProgress(extract_my_results)


  def clean_cache(self):
    with self.inflight_lock:
      if len(self.request_times) >= settings.REMOTE_READER_CACHE_SIZE_LIMIT:
        log.info("RemoteReader.request_data :: clearing old from request_cache")
        now = time.time()
        for url, timestamp in self.request_times.items():
          age = now - timestamp
          if age >= (2 * settings.REMOTE_FETCH_TIMEOUT):
            del self.request_times[url]
            with self.cache_lock:
              if url in self.request_cache:
                del self.request_cache[url]


  def get_inflight_requests(self, url):
    with self.inflight_lock:
      if url not in self.inflight_requests:
        self.inflight_requests[url] = (self, Event())
        self.request_times[url] = time.time()
      return self.inflight_requests[url]

  def cleanup_inflight_requests(self, url):
    with self.inflight_lock:
      del self.inflight_requests[url]
