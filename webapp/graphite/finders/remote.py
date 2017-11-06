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

    @classmethod
    def factory(cls):
        finders = []
        for host in settings.CLUSTER_SERVERS:
            if settings.REMOTE_EXCLUDE_LOCAL and is_local_interface(host):
                continue
            finders.append(cls(host))
        return finders

    def __init__(self, host):
        self.host = host
        self.last_failure = 0

    @property
    def disabled(self):
        return time.time() - self.last_failure < settings.REMOTE_RETRY_DELAY

    def fail(self):
        self.last_failure = time.time()

    @logtime
    def find_nodes(self, query, timer=None):
        timer.set_msg(
            'host: {host}, query: {query}'.format(
                host=self.host,
                query=query))

        log.debug("RemoteFinder.find_nodes(host=%s, query=%s) called" % (self.host, query))

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

        cacheKey = "find:%s:%s:%s:%s" % (self.host, compactHash(query.pattern), start, end)

        results = cache.get(cacheKey)
        if results is not None:
            log.debug(
                "RemoteFinder.find_nodes(host=%s, query=%s) using cached result" %
                (self.host, query))
        else:
            url = '/metrics/find/'

            query_params = [
                ('local', '1'),
                ('format', 'pickle'),
                ('query', query.pattern),
            ]
            if query.startTime:
                query_params.append(('from', int(query.startTime)))

            if query.endTime:
                query_params.append(('until', int(query.endTime)))

            result = self.request(
                url,
                fields=query_params,
                headers=query.headers,
                timeout=settings.REMOTE_FIND_TIMEOUT)

            try:
                results = unpickle.loads(result.data)
            except Exception as err:
                self.fail()
                log.exception(
                    "RemoteFinder[%s] Error decoding find response from %s: %s" %
                    (self.host, result.url_full, err))
                raise Exception("Error decoding find response from %s: %s" % (result.url_full, err))

            cache.set(cacheKey, results, settings.FIND_CACHE_DURATION)

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
                reader = RemoteReader(self, node_info)
                node = LeafNode(path, reader)
            else:
                node = BranchNode(path)

            node.local = False
            yield node

    def fetch(self, patterns, start_time, end_time, now=None, requestContext=None):
        reader = RemoteReader(self, {}, bulk_query=patterns)
        return reader.fetch_multi(start_time, end_time, now, requestContext)

    def request(self, url, fields=None, headers=None, timeout=None):
        url = "%s://%s%s" % (
            'https' if settings.INTRACLUSTER_HTTPS else 'http', self.host, url)
        url_full = "%s?%s" % (url, urlencode(fields))

        try:
            result = http.request(
                'POST' if settings.REMOTE_STORE_USE_POST else 'GET',
                url,
                fields=fields,
                headers=headers,
                timeout=timeout)
        except BaseException as err:
            self.fail()
            log.exception("RemoteFinder[%s] Error requesting %s: %s" % (self.host, url_full, err))
            raise Exception("Error requesting %s: %s" % (url_full, err))

        if result.status != 200:
            self.fail()
            log.exception(
                "RemoteFinder[%s] Error response %d from %s" % (self.host, result.status, url_full))
            raise Exception("Error response %d from %s" % (result.status, url_full))

        result.url_full = url_full

        # reset last failure time so that retried fetches can re-enable a remote
        self.last_failure = 0

        log.debug("RemoteFinder[%s] Fetched %s" % (self.host, url_full))
        return result
