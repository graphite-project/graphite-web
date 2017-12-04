import pytz

from datetime import datetime
from mock import mock, patch
import sys

from .base import TestCase
from django.conf import settings

from graphite.render.datalib import TimeSeries, fetchData, _merge_results, prefetchData
from graphite.util import timebounds
from six.moves import range


class TimeSeriesTest(TestCase):

    def test_TimeSeries_init_no_args(self):
      if sys.version_info[0] >= 3:
          msg = '__init__\(\) missing 5 required positional arguments'
      else:
          msg = '__init__\(\) takes at least 6 arguments \(1 given\)'
      with self.assertRaisesRegexp(TypeError, msg):
        TimeSeries()

    def test_TimeSeries_init_string_values(self):
      series = TimeSeries("collectd.test-db.load.value", 0, 2, 1, "ab")
      expected = TimeSeries("collectd.test-db.load.value", 0, 2, 1, ["a","b"])
      self.assertEqual(series, expected)

    def test_TimeSeries_init_tag_parse(self):
      series = TimeSeries("collectd.test-db.load.value;tag=value", 0, 2, 1, [1, 2])
      self.assertEqual(series.tags, {'name': 'collectd.test-db.load.value', 'tag': 'value'})

    def test_TimeSeries_init_tag_parse_fail(self):
      series = TimeSeries("collectd.test-db.load.value;", 0, 2, 1, [1, 2])
      self.assertEqual(series.tags, {'name': 'collectd.test-db.load.value;'})

    def test_TimeSeries_equal_list(self):
      values = list(range(0,100))
      series = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      with self.assertRaises(AssertionError):
        self.assertEqual(values, series)

    def test_TimeSeries_equal_list_color(self):
      values = list(range(0,100))
      series1 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series1.color = 'white'
      series2 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series2.color = 'white'
      self.assertEqual(series1, series2)

    def test_TimeSeries_equal_list_color_bad(self):
      values = list(range(0,100))
      series1 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series2 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series2.color = 'white'
      with self.assertRaises(AssertionError):
        self.assertEqual(series1, series2)

    def test_TimeSeries_equal_list_color_bad2(self):
      values = list(range(0,100))
      series1 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series2 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series1.color = 'white'
      with self.assertRaises(AssertionError):
        self.assertEqual(series1, series2)

    def test_TimeSeries_getInfo(self):
      values = list(range(0,100))
      series = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      self.assertEqual(series.getInfo(), {
        'name': 'collectd.test-db.load.value',
        'values': values,
        'start': 0,
        'step': 1,
        'end': len(values),
        'pathExpression': 'collectd.test-db.load.value',
        'valuesPerPoint': 1,
        'consolidationFunc': 'average',
        'xFilesFactor': 0,
      })

    def test_TimeSeries_consolidate(self):
      values = list(range(0,100))

      series = TimeSeries("collectd.test-db.load.value", 0, len(values)/2, 1, values)
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)

    def test_TimeSeries_iterate(self):
      values = list(range(0,100))
      series = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      for i, val in enumerate(series):
        self.assertEqual(val, values[i])

    def test_TimeSeries_iterate_valuesPerPoint_2_none_values(self):
      values = [None, None, None, None, None]

      series = TimeSeries("collectd.test-db.load.value", 0, len(values)/2, 1, values)
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, [None, None, None])

      values = [None, None, None, None, None, 1, 2, 3, 4]

      series = TimeSeries("collectd.test-db.load.value", 0, len(values)/2, 1, values, xFilesFactor=0.1)
      self.assertEqual(series.valuesPerPoint, 1)
      self.assertEqual(series.xFilesFactor, 0.1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)

      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, [None, None, 1, 2.5, 4])
      self.assertEqual(list(series), list(expected))

      series.xFilesFactor = 0.5
      self.assertEqual(list(series), list(expected))

      series.xFilesFactor = 0.500001
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, [None, None, None, 2.5, None])
      self.assertEqual(list(series), list(expected))

      series.xFilesFactor = 1
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_avg(self):
      values = list(range(0,100))

      series = TimeSeries("collectd.test-db.load.value", 0, len(values)/2, 1, values)
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, [0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5, 16.5, 18.5, 20.5, 22.5, 24.5, 26.5, 28.5, 30.5, 32.5, 34.5, 36.5, 38.5, 40.5, 42.5, 44.5, 46.5, 48.5, 50.5, 52.5, 54.5, 56.5, 58.5, 60.5, 62.5, 64.5, 66.5, 68.5, 70.5, 72.5, 74.5, 76.5, 78.5, 80.5, 82.5, 84.5, 86.5, 88.5, 90.5, 92.5, 94.5, 96.5, 98.5])
      self.assertEqual(list(series), list(expected))

      series.consolidate(3)
      self.assertEqual(series.valuesPerPoint, 3)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, map(float, list(range(1, 100, 3)) + [99]))
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_sum(self):
      values = list(range(0,100))

      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='sum')
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(1,200,4)))
      self.assertEqual(list(series), list(expected))

      series.consolidate(3)
      self.assertEqual(series.valuesPerPoint, 3)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(3,300,9)) + [99])
      self.assertEqual(list(series), list(expected))

      series.xFilesFactor = 0.4
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(3,300,9)) + [None])
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_max(self):
      values = list(range(0,100))

      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='max')
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(1,100,2)))
      self.assertEqual(list(series), list(expected))

      series.consolidate(3)
      self.assertEqual(series.valuesPerPoint, 3)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(2,100,3)) + [99])
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_min(self):
      values = list(range(0,100))

      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='min')
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(0,100,2)))
      self.assertEqual(list(series), list(expected))

      series.consolidate(3)
      self.assertEqual(series.valuesPerPoint, 3)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(0,100,3)))
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_first(self):
      values = list(range(0,100))

      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='first')
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(0,100,2)))
      self.assertEqual(list(series), list(expected))

      series.consolidate(3)
      self.assertEqual(series.valuesPerPoint, 3)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(0,100,3)))
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_last(self):
      values = list(range(0,100))

      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='last')
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(1,100,2)))
      self.assertEqual(list(series), list(expected))

      series.consolidate(3)
      self.assertEqual(series.valuesPerPoint, 3)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, list(range(2,100,3)) + [99])
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_invalid(self):
      values = list(range(0,100))

      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='bogus')
      self.assertEqual(series.valuesPerPoint, 1)

      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      with self.assertRaisesRegexp(Exception, "Invalid consolidation function: 'bogus'"):
        result = list(series)


class DatalibFunctionTest(TestCase):
    def _build_requestContext(self, startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)), endTime=datetime(1970, 1, 1, 0, 59, 0, 0, pytz.timezone(settings.TIME_ZONE)), data=[], tzinfo=pytz.utc):
        """
        Helper method to create request contexts
        Args:
            startTime: datetime
            endTime: datetime
            data: list

        Returns:

        """
        return {
            'template': {},
            'args': ({}, {}),
            'startTime': startTime,
            'endTime': endTime,
            'localOnly': False,
            'data': data,
            'tzinfo': tzinfo
        }

    def test__merge_results(self):
      pathExpr = 'collectd.test-db.load.value'
      startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE))
      endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
      timeInfo = [startTime, endTime, 60]
      result_queue = [
                      [pathExpr, [timeInfo, [0,1,2,3,4,None,None,None,None,None]]],
                      [pathExpr, [timeInfo, [None,None,None,None,None,5,6,7,8,9]]],
                      [pathExpr, [timeInfo, [None,None,None,None,None,None,None,7,8,9]]],
                      [pathExpr, [timeInfo, [0,1,2,3,4,None,None,7,8,9]]]
                     ]

      seriesList = {}
      requestContext = self._build_requestContext(startTime, endTime)
      results = _merge_results(pathExpr, startTime, endTime, result_queue, seriesList, requestContext)
      expectedResults = [
          TimeSeries("collectd.test-db.load.value", startTime, endTime, 60, [0,1,2,3,4,5,6,7,8,9]),
      ]
      self.assertEqual(results, expectedResults)

    @mock.patch('graphite.logger.log.debug')
    def test__merge_results_no_results(self, log_debug):
      pathExpr = 'collectd.test-db.load.value'
      startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE))
      endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
      timeInfo = [startTime, endTime, 60]
      result_queue = [
                      [pathExpr, None],
                     ]

      seriesList = {}
      requestContext = self._build_requestContext(startTime, endTime)
      results = _merge_results(pathExpr, startTime, endTime, result_queue, seriesList, requestContext)
      expectedResults = []
      self.assertEqual(results, expectedResults)
      log_debug.assert_called_with("render.datalib.fetchData :: no results for %s.fetch(%s, %s)" % (pathExpr, startTime, endTime))

    @mock.patch('graphite.logger.log.exception')
    def test__merge_results_bad_results(self, log_exception):
      pathExpr = 'collectd.test-db.load.value'
      startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE))
      endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
      timeInfo = [startTime, endTime, 60]
      result_queue = [
                      [pathExpr, ['invalid input']],
                     ]

      seriesList = {}
      requestContext = self._build_requestContext(startTime, endTime)
      with self.assertRaises(Exception):
        _merge_results(pathExpr, startTime, endTime, result_queue, seriesList, requestContext)
        log_exception.assert_called_with("could not parse timeInfo/values from metric '%s': %s" % (pathExpr, 'need more than 1 value to unpack'))

    def test__merge_results_multiple_series(self):
      pathExpr = 'collectd.test-db.load.value'
      startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE))
      endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
      timeInfo = [startTime, endTime, 60]
      result_queue = [
                      [pathExpr, [timeInfo, [0,1,2,3,4,None,None,None,None,None]]],
                      [pathExpr, [timeInfo, [None,None,None,None,None,5,6,7,8,9]]],
                      [pathExpr, [timeInfo, [None,None,None,None,None,None,None,7,8,9]]],
                      [pathExpr, [timeInfo, [0,1,2,3,4,None,None,7,8,9]]]
                     ]

      seriesList = {
                      'collectd.test-db.cpu.value': TimeSeries("collectd.test-db.cpu.value", startTime, endTime, 60, [0,1,2,3,4,5,6,7,8,9])
                   }
      requestContext = self._build_requestContext(startTime, endTime)
      results = _merge_results(pathExpr, startTime, endTime, result_queue, seriesList, requestContext)
      expectedResults = [
          TimeSeries("collectd.test-db.cpu.value", startTime, endTime, 60, [0,1,2,3,4,5,6,7,8,9]),
          TimeSeries("collectd.test-db.load.value", startTime, endTime, 60, [0,1,2,3,4,5,6,7,8,9]),
      ]
      self.assertEqual(results, expectedResults)

    def test__merge_results_no_remote_store_merge_results(self):
      pathExpr = 'collectd.test-db.load.value'
      startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE))
      endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
      timeInfo = [startTime, endTime, 60]
      result_queue = [
                      [pathExpr, [timeInfo, [0,1,2,3,4,None,None,None,None,None]]],
                      [pathExpr, [timeInfo, [None,None,None,3,4,5,6,7,8,9]]],
                      [pathExpr, [timeInfo, [None,None,None,None,None,None,None,7,8,9]]]
                     ]

      seriesList = {}
      requestContext = self._build_requestContext(startTime, endTime)
      with self.settings(REMOTE_STORE_MERGE_RESULTS=False):
          results = _merge_results(pathExpr, startTime, endTime, result_queue, seriesList, requestContext)
      expectedResults = [
          TimeSeries("collectd.test-db.load.value", startTime, endTime, 60, [None,None,None,3,4,5,6,7,8,9]),
      ]
      self.assertEqual(results, expectedResults)

    def test_fetchData(self):
      pathExpr = 'collectd.test-db.load.value'
      startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE))
      endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
      requestContext = self._build_requestContext(startTime, endTime)
      requestContext['now'] = endTime
      requestContext['forwardHeaders'] = None

      results = fetchData(requestContext, pathExpr)
      expectedResults = []
      self.assertEqual(results, expectedResults)

    def test_prefetchData(self):
      # STORE.finders has no non-local finders
      results = prefetchData({}, [])
      self.assertEqual(results, None)

      # STORE.fetch returns list with None value
      with patch('graphite.render.datalib.STORE.fetch', lambda *_: [None]):
        startTime = datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE))
        endTime = datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
        now = datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))

        requestContext = {
          'startTime': startTime,
          'endTime': endTime,
          'now': now,
          'prefetched': {
            'somekey': 'somedata',
          },
        }

        prefetchData(requestContext, ['test'])

        self.assertEqual(requestContext['prefetched'][timebounds(requestContext)], {})
