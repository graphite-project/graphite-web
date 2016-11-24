from .base import BaseTestCase as TestCase

from graphite import readers


class ReadersTest(TestCase):

    maxDiff = None

    def test_merge_with_cache_with_different_step(self):
        # Data values from the Reader:
        start = 1465844460  # (Mon Jun 13 19:01:00 UTC 2016)
        window_size = 7200  # (2 hour)
        step = 60           # (1 minute)

        # Fill in half the data.  Nones for the rest.
        values = range(0, window_size/2, step)
        for i in range(0, window_size/2, step):
            values.append(None)

        # Generate data that would normally come from Carbon.
        # Step will be different since that is what we are testing
        cache_results = []
        for i in range(start+window_size/2, start+window_size, 1):
            cache_results.append((i, 1))

        # merge the db results with the cached results
        values = readers.merge_with_cache(
            cached_datapoints=cache_results,
            start=start,
            step=step,
            values=values,
            func='sum'
        )

        # Generate the expected values
        expected_values = range(0, window_size/2, step)
        for i in range(0, window_size/2, step):
            expected_values.append(60)

        self.assertEqual(expected_values, values)

    def test_merge_with_cache_when_previous_window_in_cache(self):

        start = 1465844460  # (Mon Jun 13 19:01:00 UTC 2016)
        window_size = 3600  # (1 hour)
        step = 60           # (1 minute)

        # simulate db data, no datapoints for the given
        # time window
        values = self._create_none_window(step)

        # simulate cached data with datapoints only
        # from the previous window
        cache_results = []
        prev_window_start = start - window_size
        prev_window_end = prev_window_start + window_size
        for i in range(prev_window_start, prev_window_end, step):
            cache_results.append((i, 1))

        # merge the db results with the cached results
        values = readers.merge_with_cache(
            cached_datapoints=cache_results,
            start=start,
            step=step,
            values=values
        )
        # the merged results should be a None window because:
        # - db results for the window are None
        # - cache does not contain relevant points
        self.assertEqual(self._create_none_window(step), values)

    @staticmethod
    def _create_none_window(points_per_window):
        return [None for _ in range(0, points_per_window)]
