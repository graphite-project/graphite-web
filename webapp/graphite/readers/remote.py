from urllib import urlencode

from django.conf import settings

from graphite.http_pool import http
from graphite.util import unpickle
from graphite.readers.utils import BaseReader


class RemoteReader(BaseReader):
    __slots__ = (
        'finder',
        'metric_path',
        'intervals',
        'bulk_query',
    )

    def __init__(self, finder, node_info, bulk_query=None):
        self.finder = finder
        self.metric_path = node_info.get('path') or node_info.get('metric_path')
        self.intervals = node_info.get('intervals', [])
        self.bulk_query = set(bulk_query) if bulk_query else (
            [self.metric_path] if self.metric_path else []
        )

    def __repr__(self):
        return '<RemoteReader[%x]: %s %s>' % (id(self), self.finder.host, ','.join(self.bulk_query))

    def get_intervals(self):
        return self.intervals

    def fetch(self, startTime, endTime, now=None, requestContext=None):
        if not self.bulk_query:
            return []

        url = "%s://%s/render/" % (
            'https' if settings.INTRACLUSTER_HTTPS else 'http',
            self.finder.host,
        )

        query_params = [
            ('format', 'pickle'),
            ('local', '1'),
            ('noCache', '1'),
            ('from', str(int(startTime))),
            ('until', str(int(endTime)))
        ]

        for target in self.bulk_query:
            query_params.append(('target', target))

        if now is not None:
            query_params.append(('now', str(int(now))))

        headers = requestContext.get('forwardHeaders') if requestContext else None

        url_full = "%s?%s" % (url, urlencode(query_params))

        self.log_debug("RemoteReader:: Requesting %s" % url_full)
        try:
            result = http.request(
                'POST' if settings.REMOTE_STORE_USE_POST else 'GET',
                url,
                fields=query_params,
                headers=headers,
                timeout=settings.REMOTE_FETCH_TIMEOUT,
            )

            if result.status != 200:
                self.finder.fail()
                self.log_error("RemoteReader:: Error response %d from %s" % (result.status, url_full))
                raise Exception("Error response %d from %s" % (result.status, url_full))

            data = unpickle.loads(result.data)
        except Exception as err:
            self.finder.fail()
            self.log_error("RemoteReader:: Error requesting %s: %s" % (url_full, err))
            raise Exception("Error requesting %s: %s" % (url_full, err))

        self.log_debug("RemoteReader:: Fetched %s" % url_full)
        for i in range(len(data)):
            data[i]['path'] = data[i]['name']

        return data
