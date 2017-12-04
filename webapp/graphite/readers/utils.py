import abc

from graphite.logger import log


class BaseReader(object):
    __metaclass__ = abc.ABCMeta

    supported = True

    @abc.abstractmethod
    def get_intervals(self):
        """Get the supported interval by a reader.

        Returns:
          IntervalSet(): set of supported intervals.
        """

    @abc.abstractmethod
    def fetch(self, startTime, endTime, now=None, requestContext=None):
        """Fetches points for a given interval.

        Args:
          startTime: int
          endTime: int
          now: int
          requestContext: RequestContext

        Returns:
          (time_info, values)
        """


def merge_with_cache(cached_datapoints, start, step, values, func=None, raw_step=None):
    """Merge values with datapoints from a buffer/cache."""
    consolidated = []

    # Similar to the function in render/datalib:TimeSeries
    def consolidate(func, values):
        usable = [v for v in values if v is not None]
        if not usable:
            return None
        if func == 'sum':
            return sum(usable)
        if func == 'average':
            return float(sum(usable)) / len(usable)
        if func == 'max':
            return max(usable)
        if func == 'min':
            return min(usable)
        if func == 'last':
            return usable[-1]
        raise Exception("Invalid consolidation function: '%s'" % func)

    # if we have a raw_step, start by taking only the last data point for each interval to match what whisper will do
    if raw_step is not None and raw_step > 1:
        consolidated_dict = {}
        for (timestamp, value) in cached_datapoints:
            interval = timestamp - (timestamp % raw_step)
            consolidated_dict[interval] = value
        cached_datapoints = list(consolidated_dict.items())

    # if we have a consolidation function and the step is not the default interval, consolidate to the requested step
    if func and step != raw_step:
        consolidated_dict = {}
        for (timestamp, value) in cached_datapoints:
            interval = timestamp - (timestamp % step)
            if interval in consolidated_dict:
                consolidated_dict[interval].append(value)
            else:
                consolidated_dict[interval] = [value]
        consolidated = [(i, consolidate(func, consolidated_dict[i])) for i in consolidated_dict]
    # otherwise just use the points
    else:
        consolidated = cached_datapoints

    for (interval, value) in consolidated:
        try:
            i = int(interval - start) // step
            if i < 0:
                # cached data point is earlier then the requested data point.
                # meaning we can definitely ignore the cache result.
                # note that we cannot rely on the 'except'
                # in this case since 'values[-n]='
                # is equivalent to 'values[len(values) - n]='
                continue
            values[i] = value
        except BaseException:
            pass

    return values


def CarbonLink():
    """Return a carbonlink instance."""
    # Late import to avoid pulling out too many dependencies with
    # readers.py which is usually imported by plugins.
    from graphite.carbonlink import CarbonLink
    return CarbonLink()


def merge_with_carbonlink(metric, start, step, values, aggregation_method=None, raw_step=None):
    """Get points from carbonlink and merge them with existing values."""
    cached_datapoints = []
    try:
        cached_datapoints = CarbonLink().query(metric)
    except BaseException:
        log.exception("Failed CarbonLink query '%s'" % metric)
        cached_datapoints = []

    if isinstance(cached_datapoints, dict):
        cached_datapoints = list(cached_datapoints.items())

    return merge_with_cache(
        cached_datapoints, start, step, values,
        func=aggregation_method, raw_step=raw_step)
