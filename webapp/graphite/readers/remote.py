import time

from urllib import urlencode
from threading import current_thread, RLock

from django.conf import settings

from graphite.http_pool import http
from graphite.readers import FetchInProgress
from graphite.logger import log
from graphite.util import unpickle
from graphite.worker_pool.pool import pool_apply
from graphite.readers.utils import BaseReader


class InFlight(object):
    """This object is used to cache sub-requests within a single request."""

    def __init__(self, store, requestContext):
        # Make sure we add our data to requestContext.
        if requestContext is None:
            requestContext = {}
        for k in ['inflight_requests', 'inflight_locks']:
            if k not in requestContext:
                requestContext[k] = {}

        self.lock = store.lock
        self.requests = requestContext['inflight_requests']
        self.locks = requestContext['inflight_locks']

    def start_request(self, url, request):
        with self.lock:
            self.requests[url] = request

    def get_request_lock(self, url):
        with self.lock:
            lock = self.locks.get(url, None)
            if not lock:
                self.locks[url] = lock = RLock()
            return lock

    def get_request(self, url):
        with self.lock:
            return self.requests.get(url, None)


class RemoteReader(BaseReader):
    __slots__ = (
        'store',
        'metric_path',
        'intervals',
        'bulk_query',
        'connection')

    def __init__(self, store, node_info, bulk_query=None):
        self.store = store
        self.metric_path = node_info.get(
            'path') or node_info.get('metric_path')
        self.intervals = node_info['intervals']
        self.bulk_query = set(bulk_query) or (
            [self.metric_path] if self.metric_path else []
        )
        self.connection = None

    def __repr__(self):
        return '<RemoteReader[%x]: %s>' % (id(self), self.store.host)

    @staticmethod
    def _log(msg, logger):
        logger(('thread %s at %fs ' %
                (current_thread().name, time.time())) + msg)

    @classmethod
    def log_debug(cls, msg):
        if settings.DEBUG:
            cls._log(msg, log.info)

    @classmethod
    def log_error(cls, msg):
        cls._log(msg, log.exception)

    def get_intervals(self):
        return self.intervals

    def fetch(self, startTime, endTime, now=None, requestContext=None):
        seriesList = self.fetch_list(startTime, endTime, now, requestContext)

        def _fetch(seriesList):
            if seriesList is None:
                return None

            for series in seriesList:
                if series['name'] == self.metric_path:
                    time_info = (
                        series['start'],
                        series['end'],
                        series['step'])
                    return (time_info, series['values'])

            return None

        if isinstance(seriesList, FetchInProgress):
            return FetchInProgress(lambda: _fetch(seriesList.waitForResults()))

        return _fetch(seriesList)

    def fetch_list(self, startTime, endTime, now=None, requestContext=None):
        t = time.time()
        in_flight = InFlight(self.store, requestContext)

        query_params = [
            ('format', 'pickle'),
            ('local', '1'),
            ('noCache', '1'),
            ('from', str(int(startTime))),
            ('until', str(int(endTime)))
        ]

        if not self.bulk_query:
            return []

        for target in self.bulk_query:
            query_params.append(('target', target))

        if now is not None:
            query_params.append(('now', str(int(now))))

        query_string = urlencode(query_params)
        urlpath = '/render/'
        url = "%s://%s%s" % ('https' if settings.INTRACLUSTER_HTTPS else 'http',
                             self.store.host, urlpath)
        url_full = "%s?%s" % (url, query_string)
        headers = requestContext.get('forwardHeaders') if requestContext else None

        lock = in_flight.get_request_lock(url_full)
        with lock:
            request = in_flight.get_request(url_full)
            if request:
                log.debug("RemoteReader:: Returning cached FetchInProgress %s" % url_full)
                return request

            data = self._fetch_list_locked(url, query_string, query_params, headers)
            in_flight.start_request(url, data)

        log.debug(
            "RemoteReader:: Returning %s in %fs" % (url_full, time.time() - t))
        return data

    def _fetch_list_locked(self, url, query_string, query_params, headers):
        url_full = "%s?%s" % (url, query_string)

        jobs = [(self._fetch, url, query_string, query_params, headers)]
        q = pool_apply(self.store.finder.worker_pool(), jobs)

        log.debug('RemoteReader:: Storing FetchInProgress for %s' % url_full)
        return FetchInProgress(_Results(q))

    def _fetch(self, url, query_string, query_params, headers):
        url_full = "%s?%s" % (url, query_string)

        log.debug(
            "RemoteReader:: Starting to execute _fetch %s" % url_full)
        try:
            log.debug("ReadResult:: Requesting %s" % url_full)
            result = http.request(
                'POST' if settings.REMOTE_STORE_USE_POST else 'GET',
                url,
                fields=query_params,
                headers=headers,
                timeout=settings.REMOTE_FETCH_TIMEOUT,
            )

            if result.status != 200:
                self.store.fail()
                self.log_error("ReadResult:: Error response %d from %s" % url_full)
                data = []
            else:
                data = unpickle.loads(result.data)
        except Exception as err:
            self.store.fail()
            self.log_error("ReadResult:: Error requesting %s: %s" % (url_full, err))
            data = []

        log.debug("RemoteReader:: Completed _fetch %s" % url_full)
        return data


class _Results(object):

    def __init__(self, queue):
        self.lock = RLock()
        self.results = None
        self.queue = queue

    def __call__(self):
        with self.lock:
            return self.read_locked()

    def read_locked(self):
        if self.results is not None:
            log.debug(
                'RemoteReader:: retrieve completed (cached) %s' %
                (', '.join([result['path'] for result in self.results])),
            )
            return self.results

        # otherwise we get it from the queue and keep it for later
        results = self.queue.get(block=True)

        for i in range(len(results)):
            results[i]['path'] = results[i]['name']

        if not results:
            log.debug('RemoteReader:: retrieve has received no results')

        self.results = results or []

        log.debug(
            'RemoteReader:: retrieve completed %s' %
            (', '.join([result['path'] for result in results])),
        )
        return self.results
