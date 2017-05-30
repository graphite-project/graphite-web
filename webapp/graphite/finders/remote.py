import time

from urllib import urlencode
from threading import current_thread

from django.conf import settings
from django.core.cache import cache

from graphite.http_pool import http
from graphite.intervals import Interval, IntervalSet
from graphite.logger import log
from graphite.node import LeafNode, BranchNode
from graphite.render.hashing import compactHash
from graphite.util import unpickle, logtime, timebounds

from graphite.readers.remote import RemoteReader


def prefetchRemoteData(remote_stores, requestContext, pathExpressions):
    if requestContext['localOnly']:
        return

    if requestContext is None:
        requestContext = {}

    if pathExpressions is None:
        return

    (startTime, endTime, now) = timebounds(requestContext)
    log.info(
        'thread %s prefetchRemoteData:: Starting fetch_list on all backends' %
        current_thread().name)

    # Go through all of the remote nodes, and launch a fetch for each one.
    # Each fetch will take place in its own thread, since it's naturally
    # parallel work.
    for store in remote_stores:
        reader = RemoteReader(store,
                              {'intervals': []},
                              bulk_query=pathExpressions)
        reader.fetch_list(startTime, endTime, now, requestContext)


class RemoteStore(object):

    def __init__(self, host):
        self.host = host
        self.last_failure = 0

    @property
    def available(self):
        return time.time() - self.last_failure > settings.REMOTE_RETRY_DELAY

    def find(self, query, headers=None):
        return list(FindRequest(self, query).send(headers))

    def fail(self):
        self.last_failure = time.time()


class FindRequest(object):
    __slots__ = ('store', 'query', 'cacheKey')

    def __init__(self, store, query):
        self.store = store
        self.query = query

        if query.startTime:
            start = query.startTime - \
                (query.startTime % settings.FIND_CACHE_DURATION)
        else:
            start = ""

        if query.endTime:
            end = query.endTime - (query.endTime %
                                   settings.FIND_CACHE_DURATION)
        else:
            end = ""

        self.cacheKey = "find:%s:%s:%s:%s" % (
            store.host, compactHash(query.pattern), start, end)

    @logtime(custom_msg=True)
    def send(self, headers=None, msg_setter=None):
        log.info(
            "FindRequest.send(host=%s, query=%s) called" %
            (self.store.host, self.query))

        if headers is None:
            headers = {}

        results = cache.get(self.cacheKey)
        if results is not None:
            log.info(
                "FindRequest.send(host=%s, query=%s) using cached result" %
                (self.store.host, self.query))
        else:
            url = "%s://%s/metrics/find/" % (
                'https' if settings.INTRACLUSTER_HTTPS else 'http', self.store.host)

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
                    (self.store.host, self.query))
                self.store.fail()
                return

            if result.status != 200:
                log.exception(
                    "FindRequest.send(host=%s, query=%s) error response %d from %s?%s" %
                    (self.store.host, self.query, result.status, url, urlencode(query_params)))
                self.store.fail()
                return

            try:
                results = unpickle.loads(result.data)
            except BaseException:
                log.exception(
                    "FindRequest.send(host=%s, query=%s) exception processing response" %
                    (self.store.host, self.query))
                self.store.fail()
                return

            cache.set(self.cacheKey, results, settings.FIND_CACHE_DURATION)

        msg_setter(
            'host: {host}, query: {query}'.format(
                host=self.store.host,
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
                    self.store, node_info, bulk_query=[
                        self.query.pattern])
                node = LeafNode(path, reader)
            else:
                node = BranchNode(path)

            node.local = False
            yield node
