from django.conf import settings

from graphite.logger import log
from graphite.readers.utils import BaseReader
from graphite.util import unpickle


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
        for series in self.fetch_multi(startTime, endTime, now, requestContext):
            if series['name'] == self.metric_path:
                return (series['time_info'], series['values'])

    def fetch_multi(self, startTime, endTime, now=None, requestContext=None):
        if not self.bulk_query:
            return []

        query_params = [
            ('format', 'pickle'),
            ('local', '1'),
            ('noCache', '1'),
            ('from', int(startTime)),
            ('until', int(endTime))
        ]

        for target in self.bulk_query:
            query_params.append(('target', target))

        if now is not None:
            query_params.append(('now', int(now)))

        headers = requestContext.get('forwardHeaders') if requestContext else None

        result = self.finder.request(
            '/render/',
            fields=query_params,
            headers=headers,
            timeout=settings.REMOTE_FETCH_TIMEOUT,
        )

        try:
            data = unpickle.loads(result.data)
        except Exception as err:
            self.finder.fail()
            log.exception(
                "RemoteReader[%s] Error decoding render response from %s: %s" %
                (self.finder.host, result.url_full, err))
            raise Exception("Error decoding render response from %s: %s" % (result.url_full, err))

        return [
            {
                'pathExpression': series.get('pathExpression', series['name']),
                'name': series['name'],
                'time_info': (series['start'], series['end'], series['step']),
                'values': series['values'],
            }
            for series in data
        ]
