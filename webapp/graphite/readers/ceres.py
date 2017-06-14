from __future__ import absolute_import

from graphite.intervals import Interval, IntervalSet
from graphite.readers.utils import merge_with_carbonlink, BaseReader

try:
    import ceres
except ImportError:
    ceres = False


class CeresReader(BaseReader):
    __slots__ = ('ceres_node', 'real_metric_path')
    supported = bool(ceres)

    def __init__(self, ceres_node, real_metric_path):
        self.ceres_node = ceres_node
        self.real_metric_path = real_metric_path

    def get_intervals(self):
        intervals = []
        for info in self.ceres_node.slice_info:
            (start, end, step) = info
            intervals.append(Interval(start, end))

        return IntervalSet(intervals)

    def fetch(self, startTime, endTime):
        data = self.ceres_node.read(startTime, endTime)
        time_info = (data.startTime, data.endTime, data.timeStep)
        values = list(data.values)

        values = merge_with_carbonlink(
            self.real_metric_path, data.startTime, data.timeStep, values)

        return time_info, values
