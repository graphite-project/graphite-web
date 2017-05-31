import functools

from graphite.intervals import IntervalSet
from graphite.logger import log


def CarbonLink():
    """Return a carbonlink instance."""
    # Late import to avoid pulling out too many dependencies with
    # readers.py which is usually imported by plugins.
    from graphite.carbonlink import CarbonLink
    return CarbonLink()


class FetchInProgress(object):

    def __init__(self, wait_callback):
        self.wait_callback = wait_callback

    def waitForResults(self):
        return self.wait_callback()


def merge_with_cache(cached_datapoints, start, step, values, func=None):

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

    if func:
        consolidated_dict = {}
        for (timestamp, value) in cached_datapoints:
            interval = timestamp - (timestamp % step)
            if interval in consolidated_dict:
                consolidated_dict[interval].append(value)
            else:
                consolidated_dict[interval] = [value]
        for interval in consolidated_dict:
            value = consolidate(func, consolidated_dict[interval])
            consolidated.append((interval, value))

    else:
        consolidated = cached_datapoints

    for (interval, value) in consolidated:
        try:
            i = int(interval - start) / step
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


class MultiReader(object):
    __slots__ = ('nodes',)

    def __init__(self, nodes):
        self.nodes = nodes

    def get_intervals(self):
        interval_sets = []
        for node in self.nodes:
            interval_sets.extend(node.intervals.intervals)
        return IntervalSet(sorted(interval_sets))

    def fetch(self, startTime, endTime, now=None, requestContext=None):
        # Start the fetch on each node
        fetches = []

        for n in self.nodes:
            try:
                fetches.append(
                    n.fetch(startTime, endTime, now, requestContext))
            except BaseException:
                log.exception("Failed to initiate subfetch for %s" % str(n))

        def merge_results():
            results = {}

            # Wait for any asynchronous operations to complete
            for i, result in enumerate(fetches):
                if isinstance(result, FetchInProgress):
                    try:
                        results[i] = result.waitForResults()
                    except BaseException:
                        log.exception("Failed to complete subfetch")
                        results[i] = None
                else:
                    results[i] = result

            results = [r for r in results.values() if r is not None]
            if not results:
                raise Exception("All sub-fetches failed")

            return functools.reduce(self.merge, results)

        return FetchInProgress(merge_results)

    def merge(self, results1, results2):
        # Ensure results1 is finer than results2
        if results1[0][2] > results2[0][2]:
            results1, results2 = results2, results1

        time_info1, values1 = results1
        time_info2, values2 = results2
        start1, end1, step1 = time_info1
        start2, end2, step2 = time_info2

        step = step1                # finest step
        start = min(start1, start2)  # earliest start
        end = max(end1, end2)      # latest end
        time_info = (start, end, step)
        values = []

        t = start
        while t < end:
            # Look for the finer precision value first if available
            i1 = (t - start1) / step1

            if len(values1) > i1:
                v1 = values1[i1]
            else:
                v1 = None

            if v1 is None:
                i2 = (t - start2) / step2

                if len(values2) > i2:
                    v2 = values2[i2]
                else:
                    v2 = None

                values.append(v2)
            else:
                values.append(v1)

            t += step

        return (time_info, values)
