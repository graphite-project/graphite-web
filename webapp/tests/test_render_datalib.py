from .base import TestCase

from graphite.render.datalib import TimeSeries, nonempty

class TimeSeriesTest(TestCase):

    def test_TimeSeries_init_no_args(self):
      with self.assertRaisesRegexp(TypeError, '__init__\(\) takes at least 6 arguments \(1 given\)'):
        TimeSeries()

    def test_TimeSeries_init_string_values(self):
      series = TimeSeries("collectd.test-db.load.value", 0, 2, 1, "ab")
      expected = TimeSeries("collectd.test-db.load.value", 0, 2, 1, ["a","b"])
      self.assertEqual(series, expected)

    def test_TimeSeries_equal_list(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      with self.assertRaises(AssertionError):
        self.assertEqual(values, series)

    def test_TimeSeries_equal_list_color(self):
      values = range(0,100)
      series1 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series1.color = 'white'
      series2 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series2.color = 'white'
      self.assertEqual(series1, series2)

    def test_TimeSeries_equal_list_color_bad(self):
      values = range(0,100)
      series1 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series2 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series2.color = 'white'
      with self.assertRaises(AssertionError):
        self.assertEqual(series1, series2)

    def test_TimeSeries_equal_list_color_bad2(self):
      values = range(0,100)
      series1 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series2 = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      series1.color = 'white'
      with self.assertRaises(AssertionError):
        self.assertEqual(series1, series2)

    def test_TimeSeries_getInfo(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      self.assertEqual(series.getInfo(), {'name': 'collectd.test-db.load.value', 'values': values, 'start': 0, 'step': 1, 'end': len(values), 'pathExpression': 'collectd.test-db.load.value'} )

    def test_TimeSeries_consolidate(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, len(values)/2, 1, values)
      self.assertEqual(series.valuesPerPoint, 1)
      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)

    def test_TimeSeries_iterate(self):
      values = range(0,100)
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
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_avg(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, len(values)/2, 1, values)
      self.assertEqual(series.valuesPerPoint, 1)
      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, [0.5, 2.5, 4.5, 6.5, 8.5, 10.5, 12.5, 14.5, 16.5, 18.5, 20.5, 22.5, 24.5, 26.5, 28.5, 30.5, 32.5, 34.5, 36.5, 38.5, 40.5, 42.5, 44.5, 46.5, 48.5, 50.5, 52.5, 54.5, 56.5, 58.5, 60.5, 62.5, 64.5, 66.5, 68.5, 70.5, 72.5, 74.5, 76.5, 78.5, 80.5, 82.5, 84.5, 86.5, 88.5, 90.5, 92.5, 94.5, 96.5, 98.5, None])
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_sum(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='sum')
      self.assertEqual(series.valuesPerPoint, 1)
      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, range(1,200,4)+[None])
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_max(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='max')
      self.assertEqual(series.valuesPerPoint, 1)
      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, range(1,100,2)+[None])
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_min(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='min')
      self.assertEqual(series.valuesPerPoint, 1)
      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, range(0,100,2)+[None])
      self.assertEqual(list(series), list(expected))

    def test_TimeSeries_iterate_valuesPerPoint_2_invalid(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, 5, 1, values, consolidate='bogus')
      self.assertEqual(series.valuesPerPoint, 1)
      series.consolidate(2)
      self.assertEqual(series.valuesPerPoint, 2)
      expected = TimeSeries("collectd.test-db.load.value", 0, 5, 1, range(0,100,2)+[None])
      with self.assertRaisesRegexp(Exception, "Invalid consolidation function: 'bogus'"):
        result = list(series)

class DatalibFunctionTest(TestCase):
    def test_nonempty_true(self):
      values = range(0,100)
      series = TimeSeries("collectd.test-db.load.value", 0, len(values), 1, values)
      self.assertTrue(nonempty(series))

    def test_nonempty_false_empty(self):
      series = TimeSeries("collectd.test-db.load.value", 0, 1, 1, [])
      self.assertFalse(nonempty(series))

    def test_nonempty_false_nones(self):
      series = TimeSeries("collectd.test-db.load.value", 0, 4, 1, [None, None, None, None])
      self.assertFalse(nonempty(series))
