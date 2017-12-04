import functools

from graphite.intervals import IntervalSet
from graphite.logger import log
from graphite.readers.utils import BaseReader


class MultiReader(BaseReader):
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
                fetches.append(n.fetch(startTime, endTime, now, requestContext))
            except BaseException:
                log.exception("Failed to initiate subfetch for %s" % str(n))

        results = [
          r for r in fetches
          if r is not None
        ]
        if not results:
            raise Exception("All sub-fetches failed")

        return functools.reduce(self.merge, results)

    @staticmethod
    def merge(results1, results2):
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
            i1 = (t - start1) // step1

            if len(values1) > i1:
                v1 = values1[i1]
            else:
                v1 = None

            if v1 is None:
                i2 = (t - start2) // step2

                if len(values2) > i2:
                    v2 = values2[i2]
                else:
                    v2 = None

                values.append(v2)
            else:
                values.append(v1)

            t += step

        return (time_info, values)
