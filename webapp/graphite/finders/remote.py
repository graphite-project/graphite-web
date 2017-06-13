import time
import Queue
import random

from urllib import urlencode
from threading import RLock

from django.conf import settings
from django.core.cache import cache

from graphite.http_pool import http
from graphite.intervals import Interval, IntervalSet
from graphite.logger import log
from graphite.node import LeafNode, BranchNode
from graphite.render.hashing import compactHash
from graphite.util import unpickle, logtime, is_local_interface
from graphite.future import FetchInProgress, wait_for_result

from graphite.finders.utils import BaseFinder
from graphite.readers.remote import RemoteReader

from graphite.worker_pool.pool import get_pool, pool_apply


class RemoteFinder(BaseFinder):
    local = False

    def __init__(self, hosts=None):
        if hosts is None:
            hosts = settings.CLUSTER_SERVERS

        remote_hosts = []
        for host in hosts:
            if settings.REMOTE_EXCLUDE_LOCAL and is_local_interface(host):
                continue
            remote_hosts.append(host)

        self.remote_stores = [RemoteStore(self, host) for host in remote_hosts]

    def worker_pool(self):
        # The number of workers should increase linear with the number of
        # backend servers, plus we need some baseline for local finds and
        # other stuff that always happens.
        thread_count = settings.POOL_WORKERS_PER_BACKEND * len(settings.CLUSTER_SERVERS) + settings.POOL_WORKERS
        return get_pool(name="remote_finder", thread_count=thread_count)

    def find_nodes(self, query):
        start = time.time()
        jobs = []
        random.shuffle(self.remote_stores)
        for store in self.remote_stores:
            if store.available:
                jobs.append((store.find, query))

        queue = pool_apply(self.worker_pool(), jobs)

        timeout = settings.REMOTE_FIND_TIMEOUT
        deadline = start + timeout
        done = 0
        total = len(jobs)

        while done < total:
            wait_time = deadline - time.time()
            nodes = []

            try:
                nodes = queue.get(True, wait_time)

            # ValueError could happen if due to really unlucky timing wait_time
            # is negative.
            except (Queue.Empty, ValueError):
                if time.time() > deadline:
                    log.debug("Timed out in find_nodes after %fs" % timeout)
                    break
                else:
                    continue

            log.debug("Got a find result after %fs" % (time.time() - start))
            done += 1
            for node in nodes or []:
                yield node

        log.debug("Got all find results in %fs" % (time.time() - start))

    def fetch(self, nodes_or_patterns, start_time, end_time, now=None, requestContext=None):
        # Go through all of the remote nodes, and launch a fetch for each one.
        # Each fetch will take place in its own thread, since it's naturally
        # parallel work.

        patterns = []

        for v in nodes_or_patterns:
            if isinstance(v, basestring):
                patterns.append(v)
            else:
                patterns.append(v.path)

        results = []
        for store in self.remote_stores:
            reader = RemoteReader(
                store, {'intervals': []}, bulk_query=patterns)
            result = reader.fetch_list(start_time, end_time, now, requestContext)
            results.append(result)

        def _extract():
            for result in results:
                result = wait_for_result(result)
                for series in result:
                    yield {
                        'pathExpression': series.get('pathExpression', series['name']),
                        'name': series['name'],
                        'time_info': (series['start'], series['end'], series['step']),
                        'values': series['values'],
                    }

        return FetchInProgress(_extract)


class RemoteStore(object):

    def __init__(self, finder, host):
        self.finder = finder
        self.host = host
        self.last_failure = 0
        self.lock = RLock()

    @property
    def available(self):
        return time.time() - self.last_failure > settings.REMOTE_RETRY_DELAY

    def find(self, query):
        return list(FindRequest(self, query).send(query.headers))

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
        log.debug(
            "FindRequest.send(host=%s, query=%s) called" %
            (self.store.host, self.query))

        if headers is None:
            headers = {}

        results = cache.get(self.cacheKey)
        if results is not None:
            log.debug(
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
