import time

from urllib import urlencode

from django.conf import settings
from django.core.cache import cache

from graphite.http_pool import http
from graphite.intervals import Interval, IntervalSet
from graphite.logger import log
from graphite.node import LeafNode, BranchNode
from graphite.render.hashing import compactHash
from graphite.util import unpickle, logtime, is_local_interface

from graphite.finders.utils import BaseFinder
from graphite.readers.remote import RemoteReader


class RemoteFinder(BaseFinder):
    local = False

    def __init__(self, host=None):
        self.host = host
        self.last_failure = 0

    @property
    def disabled(self):
        return time.time() - self.last_failure < settings.REMOTE_RETRY_DELAY

    def fail(self):
        self.last_failure = time.time()

    def find_nodes(self, query):
        return list(FindRequest(self, query).send(query.headers))

    @classmethod
    def factory(cls):
      finders = []
      for host in settings.CLUSTER_SERVERS:
          if settings.REMOTE_EXCLUDE_LOCAL and is_local_interface(host):
              continue
          finders.append(cls(host))
      return finders

    def fetch(self, patterns, start_time, end_time, now=None, requestContext=None):
        reader = RemoteReader(self, {}, bulk_query=patterns)
        return reader.fetch(start_time, end_time, now, requestContext)


class FindRequest(object):
    __slots__ = ('finder', 'query', 'cacheKey')

    def __init__(self, finder, query):
        self.finder = finder
        self.query = query

        # prevent divide by 0
        cacheTTL = settings.FIND_CACHE_DURATION or 1
        if query.startTime:
            start = query.startTime - (query.startTime % cacheTTL)
        else:
            start = ""

        if query.endTime:
            end = query.endTime - (query.endTime % cacheTTL)
        else:
            end = ""

        self.cacheKey = "find:%s:%s:%s:%s" % (
            finder.host, compactHash(query.pattern), start, end)

    @logtime(custom_msg=True)
    def send(self, headers=None, msg_setter=None):
        log.debug(
            "FindRequest.send(host=%s, query=%s) called" %
            (self.finder.host, self.query))

        if headers is None:
            headers = {}

        results = cache.get(self.cacheKey)
        if results is not None:
            log.debug(
                "FindRequest.send(host=%s, query=%s) using cached result" %
                (self.finder.host, self.query))
        else:
            url = "%s://%s/metrics/find/" % (
                'https' if settings.INTRACLUSTER_HTTPS else 'http', self.finder.host)

            query_params = [
                ('local', '1'),
                ('format', 'pickle'),
                ('query', self.query.pattern),
            ]
            if self.query.startTime:
                query_params.append(('from', self.query.startTime))

            if self.query.endTime:
                query_params.append(('until', self.query.endTime))

            try:
                result = http.request(
                    'POST' if settings.REMOTE_STORE_USE_POST else 'GET',
                    url,
                    fields=query_params,
                    headers=headers,
                    timeout=settings.REMOTE_FIND_TIMEOUT)
            except BaseException:
                log.exception(
                    "FindRequest.send(host=%s, query=%s) exception during request" %
                    (self.finder.host, self.query))
                self.finder.fail()
                return

            if result.status != 200:
                log.exception(
                    "FindRequest.send(host=%s, query=%s) error response %d from %s?%s" %
                    (self.finder.host, self.query, result.status, url, urlencode(query_params)))
                self.finder.fail()
                return

            try:
                results = unpickle.loads(result.data)
            except BaseException:
                log.exception(
                    "FindRequest.send(host=%s, query=%s) exception processing response" %
                    (self.finder.host, self.query))
                self.finder.fail()
                return

            cache.set(self.cacheKey, results, settings.FIND_CACHE_DURATION)

        msg_setter(
            'host: {host}, query: {query}'.format(
                host=self.finder.host,
                query=self.query))

        for node_info in results:
            # handle both 1.x and 0.9.x output
            path = node_info.get('path') or node_info.get('metric_path')
            is_leaf = node_info.get('is_leaf') or node_info.get('isLeaf')
            intervals = node_info.get('intervals') or []
            if not isinstance(intervals, IntervalSet):
                intervals = IntervalSet(
                    [Interval(interval[0], interval[1]) for interval in intervals])

            node_info = {
                'is_leaf': is_leaf,
                'path': path,
                'intervals': intervals,
            }

            if is_leaf:
                reader = RemoteReader(
                    self.finder, node_info, bulk_query=[
                        self.query.pattern])
                node = LeafNode(path, reader)
            else:
                node = BranchNode(path)

            node.local = False
            yield node
