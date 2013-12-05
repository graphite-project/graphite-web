import time

from django.conf import settings

from graphite.intervals import Interval, IntervalSet
from graphite.node import LeafNode, BranchNode

import requests

PATH_URL = '{0}/paths'.format(settings.CYANITE_URL)
METRIC_URL = '{0}/metrics'.format(settings.CYANITE_URL)


class CyaniteReader(object):
    def __init__(self, path):
        self.path = path

    def fetch(self, start_time, end_time):
        data = requests.get(METRIC_URL, params={'path': self.path,
                                                'from': start_time,
                                                'to': end_time}).json()
        time_info = data['from'], data['to'], data['step']
        values = [v['metric'] for v in data['data']]
        return time_info, values

    def get_intervals(self):
        # TODO use cyanite info
        start = time.time() - 3600 * 24
        end = max(start, time.time())
        return IntervalSet([Interval(start, end)])


class CyaniteFinder(object):
    def find_nodes(self, query):
        paths = requests.get(PATH_URL, params={'query': query.pattern}).json()
        for path in paths:
            if path['leaf']:
                yield LeafNode(path['path'], CyaniteReader(path['path']))
            else:
                yield BranchNode(path['path'])
