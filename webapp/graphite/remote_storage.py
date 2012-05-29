import socket
import time
import httplib
from urllib import urlencode
from threading import Lock, Event
from django.conf import settings
from django.core.cache import cache
from graphite.node import LeafNode, BranchNode
from graphite.intervals import Interval, IntervalSet
from graphite.readers import FetchInProgress
from graphite.logger import log

try:
  import cPickle as pickle
except ImportError:
  import pickle


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

    self.cacheKey = "find:%s:%s:%s:%s" % (store.host, query.pattern, start, end)
    self.cachedResult = None

  def send(self):
    log.info("FindRequest.send(host=%s, query=%s) called" % (self.store.host, self.query))

    self.cachedResult = cache.get(self.cacheKey)
    if self.cachedResult is not None:
      log.info("FindRequest(host=%s, query=%s) using cached result" % (self.store.host, self.query))
      return

    self.connection = HTTPConnectionWithTimeout(self.store.host)
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
        results = pickle.loads(result_data)

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
  __slots__ = ('store', 'metric_path', 'intervals', 'query')
  cache_lock = Lock()
  request_cache = {}
  request_locks = {}
  request_times = {}

  def __init__(self, store, node_info, bulk_query=None):
    self.store = store
    self.metric_path = node_info['path']
    self.intervals = node_info['intervals']
    self.query = bulk_query or node_info['path']

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
    (request_lock, wait_lock, completion_event) = self.get_request_locks(url)

    if request_lock.acquire(False): # we only send the request the first time we're called
      try:
        log.info("RemoteReader.request_data :: requesting %s" % url)
        connection = HTTPConnectionWithTimeout(self.store.host)
        connection.timeout = settings.REMOTE_FETCH_TIMEOUT
        connection.request('GET', urlpath)
      except:
        completion_event.set()
        self.store.fail()
        log.exception("Error requesting %s" % url)
        raise

    def wait_for_results():
      if wait_lock.acquire(False): # the FetchInProgress that gets waited on waits for the actual completion
        try:
          response = connection.getresponse()
          if response.status != 200:
            raise Exception("Error response %d %s from %s" % (response.status, response.reason, url))

          pickled_response = response.read()
          results = pickle.loads(pickled_response)
          self.cache_lock.acquire()
          self.request_cache[url] = results
          self.cache_lock.release()
          completion_event.set()
          return results
        except:
          completion_event.set()
          self.store.fail()
          log.exception("Error requesting %s" % url)
          raise

      else: # otherwise we just wait on the completion_event
        completion_event.wait(settings.REMOTE_FETCH_TIMEOUT)
        cached_results = self.request_cache.get(url)
        if cached_results is None:
          raise Exception("Passive remote fetch failed to find cached results")
        else:
          return cached_results

    def extract_my_results():
      for series in wait_for_results():
        if series['name'] == self.metric_path:
          time_info = (series['start'], series['end'], series['step'])
          return (time_info, series['values'])

    return FetchInProgress(extract_my_results)

  def clean_cache(self):
    self.cache_lock.acquire()
    try:
      if len(self.request_locks) >= settings.REMOTE_READER_CACHE_SIZE_LIMIT:
        log.info("RemoteReader.request_data :: clearing old from request_cache and request_locks")
        now = time.time()
        for url, timestamp in self.request_times.items():
          age = now - timestamp
          if age >= (2 * settings.REMOTE_FETCH_TIMEOUT):
            del self.request_locks[url]
            del self.request_times[url]
            if url in self.request_cache:
              del self.request_cache[url]
    finally:
      self.cache_lock.release()

  def get_request_locks(self, url):
    self.cache_lock.acquire()
    try:
      if url not in self.request_locks:
        self.request_locks[url] = (Lock(), Lock(), Event())
        self.request_times[url] = time.time()
      return self.request_locks[url]
    finally:
      self.cache_lock.release()


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
