from .base import TestCase

import os
import shutil
import time

from django.conf import settings

import whisper
import gzip

from graphite.readers import WhisperReader, FetchInProgress, MultiReader, merge_with_cache
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app
from graphite.node import LeafNode


class MergeWithCacheTests(TestCase):

    maxDiff = None

    def test_merge_with_cache_with_different_step_no_data(self):
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
            cache_results.append((i, None))

        # merge the db results with the cached results
        values = merge_with_cache(
            cached_datapoints=cache_results,
            start=start,
            step=step,
            values=values,
            func='sum'
        )

        # Generate the expected values
        expected_values = range(0, window_size/2, step)
        for i in range(0, window_size/2, step):
            expected_values.append(None)

        self.assertEqual(expected_values, values)

    def test_merge_with_cache_with_different_step_sum(self):
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
        values = merge_with_cache(
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

    def test_merge_with_cache_with_different_step_average(self):
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
        values = merge_with_cache(
            cached_datapoints=cache_results,
            start=start,
            step=step,
            values=values,
            func='average'
        )

        # Generate the expected values
        expected_values = range(0, window_size/2, step)
        for i in range(0, window_size/2, step):
            expected_values.append(1)

        self.assertEqual(expected_values, values)

    def test_merge_with_cache_with_different_step_max(self):
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
        values = merge_with_cache(
            cached_datapoints=cache_results,
            start=start,
            step=step,
            values=values,
            func='max'
        )

        # Generate the expected values
        expected_values = range(0, window_size/2, step)
        for i in range(0, window_size/2, step):
            expected_values.append(1)

        self.assertEqual(expected_values, values)

    def test_merge_with_cache_with_different_step_min(self):
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
        values = merge_with_cache(
            cached_datapoints=cache_results,
            start=start,
            step=step,
            values=values,
            func='min'
        )

        # Generate the expected values
        expected_values = range(0, window_size/2, step)
        for i in range(0, window_size/2, step):
            expected_values.append(1)

        self.assertEqual(expected_values, values)

    def test_merge_with_cache_with_different_step_last(self):
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
        values = merge_with_cache(
            cached_datapoints=cache_results,
            start=start,
            step=step,
            values=values,
            func='last'
        )

        # Generate the expected values
        expected_values = range(0, window_size/2, step)
        for i in range(0, window_size/2, step):
            expected_values.append(1)

        self.assertEqual(expected_values, values)

    def test_merge_with_cache_with_different_step_bad(self):
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
        with self.assertRaisesRegexp(Exception, "Invalid consolidation function: 'bad_function'"):
            values = merge_with_cache(
                cached_datapoints=cache_results,
                start=start,
                step=step,
                values=values,
                func='bad_function'
            )

    # In merge_with_cache, if the `values[i] = value` fails, then
    #  the try block catches the exception and passes.  This tests
    #  that case.
    def test_merge_with_cache_beyond_max_range(self):
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
        for i in range(start+window_size, start+window_size*2, 1):
            cache_results.append((i, None))

        # merge the db results with the cached results
        values = merge_with_cache(
            cached_datapoints=cache_results,
            start=start,
            step=step,
            values=values,
            func='sum'
        )

        # Generate the expected values
        expected_values = range(0, window_size/2, step)
        for i in range(0, window_size/2, step):
            expected_values.append(None)

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
        values = merge_with_cache(
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

#
# Test MultiReader with multiple WhisperReader instances
#
class MultiReaderTests(TestCase):
    start_ts = 0

    # Create/wipe test whisper files
    hostcpu = os.path.join(settings.WHISPER_DIR, 'hosts/hostname/cpu.wsp')
    worker1 = hostcpu.replace('hostname', 'worker1')
    worker2 = hostcpu.replace('hostname', 'worker2')
    worker3 = hostcpu.replace('hostname', 'worker3')
    worker4 = hostcpu.replace('hostname', 'worker4')
    worker4 = worker4.replace('cpu.wsp', 'cpu.wsp.gz')

    def create_whisper_hosts(self):
        self.start_ts = int(time.time())
        try:
            os.makedirs(self.worker1.replace('cpu.wsp', ''))
            os.makedirs(self.worker2.replace('cpu.wsp', ''))
            os.makedirs(self.worker3.replace('cpu.wsp', ''))
            os.makedirs(self.worker4.replace('cpu.wsp.gz', ''))
        except OSError:
            pass

        whisper.create(self.worker1, [(1, 60)])
        whisper.create(self.worker2, [(1, 60)])
        open(self.worker3, 'a').close()

        whisper.update(self.worker1, 1, self.start_ts)
        whisper.update(self.worker2, 2, self.start_ts)

        with open(self.worker1, 'rb') as f_in, gzip.open(self.worker4, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    def wipe_whisper_hosts(self):
        try:
            os.remove(self.worker1)
            os.remove(self.worker2)
            os.remove(self.worker3)
            os.remove(self.worker4)
            shutil.rmtree(os.path.join(settings.WHISPER_DIR, 'hosts'))
        except OSError:
            pass

    def test_MultiReader_init(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        wr1 = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        node1 = LeafNode('hosts.worker1.cpu', wr1)

        wr2 = WhisperReader(self.worker2, 'hosts.worker2.cpu')
        node2 = LeafNode('hosts.worker2.cpu', wr2)

        reader = MultiReader([node1, node2])
        self.assertIsNotNone(reader)

    # Confirm the intervals
    #  Because the intervals returned from Whisper are subsecond,
    #  we truncate to int for this comparison, otherwise it's impossible
    def test_MultiReader_get_intervals(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        wr1 = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        node1 = LeafNode('hosts.worker1.cpu', wr1)

        wr2 = WhisperReader(self.worker2, 'hosts.worker2.cpu')
        node2 = LeafNode('hosts.worker2.cpu', wr2)

        reader = MultiReader([node1, node2])
        intervals = reader.get_intervals()
        for interval in intervals:
          self.assertEqual(int(interval.start), self.start_ts-60)
          self.assertEqual(int(interval.end), self.start_ts)

    # Confirm fetch works.
    def test_MultiReader_fetch(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        wr1 = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        node1 = LeafNode('hosts.worker1.cpu', wr1)

        wr2 = WhisperReader(self.worker2, 'hosts.worker2.cpu')
        node2 = LeafNode('hosts.worker2.cpu', wr2)

        reader = MultiReader([node1, node2])

        results = reader.fetch(self.start_ts-5, self.start_ts)

        self.assertIsInstance(results, FetchInProgress)

        if isinstance(results, FetchInProgress):
          results = results.waitForResults()

        (_, values) = results
        self.assertEqual(values, [None, None, None, None, 1.0])

    # Confirm merge works.
    def test_MultiReader_merge_normal(self):
        results1 = ((1496252939, 1496252944, 1), [None, None, None, None, 1.0])
        results2 = ((1496252939, 1496252944, 1), [1.0, 1.0, 1.0, 1.0, 1.0])
        wr1 = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        node1 = LeafNode('hosts.worker1.cpu', wr1)
        reader = MultiReader([node1])
        (_, values) = reader.merge(results1, results2)
        self.assertEqual(values, [1.0, 1.0, 1.0, 1.0, 1.0])

    def test_MultiReader_merge_results1_finer_than_results2(self):
        results1 = ((1496252939, 1496252944, 1), [1.0, None, None, None, 1.0])
        results2 = ((1496252939, 1496252949, 5), [1.0, 1.0])
        wr1 = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        node1 = LeafNode('hosts.worker1.cpu', wr1)
        reader = MultiReader([node1])
        (_, values) = reader.merge(results1, results2)
        self.assertEqual(values, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])

    def test_MultiReader_merge_results2_finer_than_results1(self):
        results1 = ((1496252939, 1496252949, 5), [1.0, 1.0])
        results2 = ((1496252939, 1496252944, 1), [1.0, None, 1.0, None, 1.0])
        wr1 = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        node1 = LeafNode('hosts.worker1.cpu', wr1)
        reader = MultiReader([node1])
        (_, values) = reader.merge(results1, results2)
        self.assertEqual(values, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])

    def test_MultiReader_merge_results1_missing_some(self):
        results1 = ((1496252939, 1496252944, 1), [1.0, None, None, None, 1.0])
        results2 = ((1496252939, 1496252949, 1), [1.0, 1.0])
        wr1 = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        node1 = LeafNode('hosts.worker1.cpu', wr1)
        reader = MultiReader([node1])
        (_, values) = reader.merge(results1, results2)
        self.assertEqual(values, [1.0, 1.0, None, None, 1.0, None, None, None, None, None])
