import copy

from .base import TestCase

from graphite.render import glyph
from graphite.render.datalib import TimeSeries
from six.moves import range

class glyphStandaloneFunctionTest(TestCase):
    from datetime import datetime, timedelta
    dt = datetime(2016, 6, 16, 15, 55, 38)
    dt2 = datetime(2016, 6, 17, 15, 55, 38)

    # Convenience function
    def _generate_series_list(self, config=None):
        seriesList = []
        if not config:
            config = [list(range(101)), list(range(101)), [1, None, None, None, None]]

        for i, c in enumerate(config):
            name = "collectd.test-db{0}.load.value".format(i + 1)
            seriesList.append(TimeSeries(name, 0, 1, 1, c))
        return seriesList

    #
    # Testing toSeconds
    #
    def test_toSeconds_invalid_inputs(self):
      with self.assertRaises(AttributeError):
        glyph.toSeconds(None)
      with self.assertRaises(AttributeError):
        glyph.toSeconds('')
      with self.assertRaises(AttributeError):
        glyph.toSeconds(1)

    def test_toSeconds(self):
      self.assertEqual(glyph.toSeconds(self.dt2 - self.dt), 86400)

    #
    # Testing safeArgs()
    #
    def test_safeArgs_None(self):
      with self.assertRaises(TypeError):
        glyph.safeArgs(None)

    def test_safeArgs_number_not_list(self):
      with self.assertRaises(TypeError):
        glyph.safeArgs(1)

    def test_safeArgs_all_strings(self):
      with self.assertRaises(TypeError):
        list(glyph.safeArgs(['a','b','c']))

    def test_safeArgs_list_with_string(self):
      with self.assertRaises(TypeError):
        self.assertEqual(list(glyph.safeArgs(['a',5.1,6])), ['a',5.1,6])

    def test_safeArgs_empty_string(self):
      self.assertEqual(list(glyph.safeArgs('')), [])

    def test_safeArgs_list_all_numbers(self):
      self.assertEqual(list(glyph.safeArgs([1,5.1,6,])), [1,5.1,6])

    def test_safeArgs_list_with_nan(self):
      self.assertEqual(list(glyph.safeArgs([1,5.1,6,float('Nan')])), [1,5.1,6])

    def test_safeArgs_list_with_inf(self):
      self.assertEqual(list(glyph.safeArgs([1,5.1,6,float('inf')])), [1,5.1,6])

    def test_safeArgs_list_with_None(self):
      self.assertEqual(list(glyph.safeArgs([1,5.1,6,None])), [1,5.1,6])

    #
    # Testing safeMin()
    #
    def test_safeMin_None(self):
      with self.assertRaises(TypeError):
        glyph.safeMin(None)

    def test_safeMin_number_not_list(self):
      with self.assertRaises(TypeError):
        glyph.safeMin(1)

    def test_safeMin_empty_string(self):
      self.assertEqual(glyph.safeMin(''), None)

    def test_safeMin_list_with_string(self):
      with self.assertRaises(TypeError):
        glyph.safeMin(['a',10,30])

    def test_safeMin_list_all_numbers(self):
      self.assertEqual(glyph.safeMin([1,5.1,6,]), 1)

    def test_safeMin_list_with_nan(self):
      self.assertEqual(glyph.safeMin([1,5.1,6,float('Nan')]), 1)

    #
    # Testing safeMax()
    #
    def test_safeMax_None(self):
      with self.assertRaises(TypeError):
        glyph.safeMax(None)

    def test_safeMax_number_not_list(self):
      with self.assertRaises(TypeError):
        glyph.safeMax(1)

    def test_safeMax_empty_string(self):
      self.assertEqual(glyph.safeMax(''), None)

    def test_safeMax_list_with_string(self):
      with self.assertRaises(TypeError):
        glyph.safeMax(['a',10,30])

    def test_safeMax_list_all_numbers(self):
      self.assertEqual(glyph.safeMax([1,5.1,6,]), 6)

    def test_safeMax_list_with_nan(self):
      self.assertEqual(glyph.safeMax([1,5.1,6,float('Nan')]), 6)

    #
    # Testing safeSum()
    #
    def test_safeSum_None(self):
      with self.assertRaises(TypeError):
        glyph.safeSum(None)

    def test_safeSum_number_not_list(self):
      with self.assertRaises(TypeError):
        glyph.safeSum(1)

    def test_safeSum_empty_string(self):
      self.assertEqual(glyph.safeSum(''), 0)

    def test_safeSum_list_with_string(self):
      with self.assertRaises(TypeError):
        glyph.safeSum(['a',10,30])

    def test_safeSum_list_all_numbers(self):
      self.assertAlmostEqual(glyph.safeSum([1,5.1,6,]), 12.1, places=4)

    def test_safeSum_list_with_nan(self):
      self.assertAlmostEqual(glyph.safeSum([1,5.1,6,float('Nan')]), 12.1, places=4)

    #
    # Testing any()
    #
    def test_any_None(self):
      with self.assertRaises(TypeError):
        glyph.any(None)

    def test_any_number_not_list(self):
      with self.assertRaises(TypeError):
        glyph.any(1)

    def test_any_empty_string(self):
      self.assertFalse(glyph.any(''))

    def test_any_list_with_false(self):
      self.assertFalse(glyph.any([False]))

    def test_any_list_with_0(self):
      self.assertFalse(glyph.any([0]))

    def test_any_list_with_string(self):
      self.assertTrue(glyph.any(['a',10,30]))

    def test_any_list_all_numbers(self):
      self.assertTrue(glyph.any([1,5.1,6,]))

    def test_any_list_with_nan(self):
      self.assertTrue(glyph.any([1,5.1,6,float('Nan')]), 12.1)

    #
    # Testing dataLimits
    #
    def test_dataLimits_defaults(self):
        seriesList = self._generate_series_list()
        self.assertEqual(glyph.dataLimits(seriesList), (0,100))

    def test_dataLimits_defaults_ymin_positive(self):
        config = [list(range(10, 101)), list(range(10, 101)), [1, None, None, None, None]]
        seriesList = self._generate_series_list(config)
        self.assertEqual(glyph.dataLimits(seriesList), (1,100))

    def test_dataLimits_empty_list(self):
        self.assertEqual(glyph.dataLimits([]), (0.0, 1.0))

    def test_dataLimits_drawNull(self):
        seriesList = self._generate_series_list()
        self.assertEqual(glyph.dataLimits(seriesList, True, False), (0,100))

    def test_dataLimits_stacked(self):
        seriesList = self._generate_series_list()
        self.assertEqual(glyph.dataLimits(seriesList, False, True), (0, 8))

    def test_dataLimits_drawNull_stacked(self):
        seriesList = self._generate_series_list()
        self.assertEqual(glyph.dataLimits(seriesList, True, True), (0, 8))

    def test_dataLimits_drawNull_stacked_no_missing(self):
        config = [list(range(10, 101)), list(range(10, 101)), list(range(100,300))]
        seriesList = self._generate_series_list(config)
        self.assertEqual(glyph.dataLimits(seriesList, True, True), (10, 390))

    def test_dataLimits_drawNull_ymin_positive_missing_data(self):
        config = [list(range(10, 101)), list(range(10, 101)), [1, None, None, None, None]]
        seriesList = self._generate_series_list(config)
        self.assertEqual(glyph.dataLimits(seriesList, True, False), (0.0, 100))

    def test_dataLimits_drawNull_ymax_negative_missing_data(self):
        config = [list(range(-10, -101)), list(range(-10, -101)), [-50, None, None, None, None]]
        seriesList = self._generate_series_list(config)
        self.assertEqual(glyph.dataLimits(seriesList, True, False), (-50, 0.0))

    #
    # Testing sort_stacked
    #
    def test_sort_stacked_invalid_inputs(self):
      with self.assertRaises(TypeError):
        glyph.sort_stacked(None)

      with self.assertRaises(TypeError):
        glyph.sort_stacked(1)

      with self.assertRaises(AttributeError):
        glyph.sort_stacked('string')

    def test_sort_stacked_empty_input(self):
        self.assertEqual(glyph.sort_stacked(''), [])

    def test_sort_stacked_no_stack(self):
        seriesList = self._generate_series_list()
        self.assertEqual(glyph.sort_stacked(seriesList), seriesList)

    def test_sort_stacked_only_stack(self):
        seriesList = self._generate_series_list()
        seriesList[0].options='stacked'
        seriesList[1].options='stacked'
        seriesList[2].options='stacked'
        self.assertEqual(glyph.sort_stacked(copy.deepcopy(seriesList)), seriesList)

    def test_sort_stacked_stack_and_no_stack(self):
        seriesList = self._generate_series_list()
        seriesList[0].options='stacked'
        seriesList[2].options='stacked'
        self.assertEqual(glyph.sort_stacked(copy.deepcopy(seriesList)), [seriesList[0],seriesList[2],seriesList[1]])

    #
    # Testing of format_units
    #
    def test_format_units_defaults(self):
      # Tests (input, result, prefix, 'Error String')
      tests = [
               (1, 1, '', 'format_units(1) != 1'),
               (1.0, 1.0, '', 'format_units(1.0) != 1.0'),
               (0.001, 0.001, '', 'format_units(0.001) != 0.001'),
               (1000, 1.0, 'k', 'format_units(1000) != 1.0 k'),
               (1000000, 1.0, 'M', 'format_units(1000000) != 1.0 M'),
              ]
      for (t,r,p,e) in tests:
          self.assertEqual(glyph.format_units(t), (r, p), e)

    def test_format_units_val_None_defaults(self):
      # Tests (input, result, prefix, 'Error String')
      tests = [
               (1, 1, '', 'format_units(1, None) != 1'),
               (1.0, 1.0,'',  'format_units(1.0, None) != 1.0'),
               (0.001, 0.001, '', 'format_units(0.001, None) != 0.001'),
               (1000, 1.0, 'k', 'format_units(1000, None) != 1.0 k'),
               (1000000, 1.0, 'M', 'format_units(1000000, None) != 1.0 M'),
              ]
      for (t,r,p,e) in tests:
          self.assertEqual(glyph.format_units(t, None), (r, p), e)

    def test_format_units_v_None_si(self):
      # Tests (input, result, prefix, 'Error String')
      tests = [
               (1, 1, '', 'format_units(1, None, \'si\') != 1'),
               (1.0, 1.0, '', 'format_units(1.0, None, \'si\') != 1.0'),
               (0.001, 0.001, '', 'format_units(0.001, None, \'si\') != 0.001'),
               (1000, 1.0, 'k', 'format_units(1000, None, \'si\') != 1.0 k'),
               (1000000, 1.0, 'M', 'format_units(1000000, None, \'si\') != 1.0 M'),
              ]
      for (t,r,p,e) in tests:
          self.assertEqual(glyph.format_units(t, None, 'si'), (r, p), e)

    def test_format_units_v_None_si_units(self):
      # Tests (input, result, prefix, 'Error String')
      tests = [
               (1, 1, 'b', 'format_units(1, None, \'si\', \'b\') != 1'),
               (1.0, 1.0, 'b', 'format_units(1.0, None, \'si\', \'b\') != 1.0'),
               (0.001, 0.001, 'b', 'format_units(0.001, None, \'si\', \'b\') != 0.001'),
               (1000, 1.0, 'kb', 'format_units(1000, None, \'si\', \'b\') != 1.0 kb'),
               (1000000, 1.0, 'Mb', 'format_units(1000000, None, \'si\', \'b\') != 1.0 Mb'),
              ]
      for (t,r,p,e) in tests:
          self.assertEqual(glyph.format_units(t, None, 'si', 'b'), (r, p), e)

    def test_format_units_v_step_si(self):
      # Tests (input, step, result, prefix, 'Error String')
      tests = [
               (1, 100, 1, '', 'format_units(1, 100, \'si\') != 1'),
               (1.0, 100, 1.0, '', 'format_units(1.0, 100, \'si\') != 1.0'),
               (0.001, 100, 0.001, '', 'format_units(0.001, 100, \'si\') != 0.001'),
               (1000, 100, 1000.0, '', 'format_units(1000, 100, \'si\') != 1000.0'),
               (1000000, 100, 1000000.0, '', 'format_units(1000000, 100, \'si\') != 1000000.0'),
              ]
      for (t,s,r,p,e) in tests:
          self.assertEqual(glyph.format_units(t, s, 'si'), (r, p), e)

    def test_format_units_v_step_si_units(self):
      # Tests (input, step, result, prefix, 'Error String')
      tests = [
               (1, 100, 1, 'b', 'format_units(1, 100, \'si\', \'b\') != 1'),
               (1.0, 100, 1.0, 'b', 'format_units(1.0, 100, \'si\', \'b\') != 1.0'),
               (0.001, 100, 0.001, 'b', 'format_units(0.001, 100, \'si\', \'b\') != 0.001'),
               (1000, 100, 1000.0, 'b', 'format_units(1000, 100, \'si\', \'b\') != 1000.0'),
               (1000000, 100, 1000000.0, 'b', 'format_units(1000000, 100, \'si\', \'b\') != 1000000.0'),
              ]
      for (t,s,r,p,e) in tests:
          self.assertEqual(glyph.format_units(t, s, 'si', 'b'), (r, p), e)

    #
    # Testing of find_x_times()
    #
    def test_find_x_times_SEC(self):
      (dt_out, delta_out) = glyph.find_x_times(self.dt, glyph.SEC, 1)
      expected_dt = self.datetime(self.dt.year, self.dt.month, self.dt.day, self.dt.hour, self.dt.minute, self.dt.second)
      expected_delta = self.timedelta(0, 1)
      self.assertEquals(dt_out, expected_dt)
      self.assertEquals(delta_out, expected_delta)

    def test_find_x_times_MIN(self):
      (dt_out, delta_out) = glyph.find_x_times(self.dt, glyph.MIN, 1)
      expected_dt = self.datetime(self.dt.year, self.dt.month, self.dt.day, self.dt.hour, self.dt.minute+1)
      expected_delta = self.timedelta(0, 60)
      self.assertEquals(dt_out, expected_dt)
      self.assertEquals(delta_out, expected_delta)

    def test_find_x_times_HOUR(self):
      (dt_out, delta_out) = glyph.find_x_times(self.dt, glyph.HOUR, 1)
      expected_dt = self.datetime(self.dt.year, self.dt.month, self.dt.day, self.dt.hour+1, 0)
      expected_delta = self.timedelta(0, 3600)
      self.assertEquals(dt_out, expected_dt)
      self.assertEquals(delta_out, expected_delta)

    def test_find_x_times_DAY(self):
      (dt_out, delta_out) =  glyph.find_x_times(self.dt, glyph.DAY, 1)
      expected_dt = self.datetime(self.dt.year, self.dt.month, self.dt.day+1, 0, 0)
      expected_delta = self.timedelta(1)
      self.assertEquals(dt_out, expected_dt)
      self.assertEquals(delta_out, expected_delta)

    def test_find_x_times_xconfigs(self):
      for xconf in glyph.xAxisConfigs:
        glyph.find_x_times(self.dt, xconf['labelUnit'], xconf['labelStep'])
        glyph.find_x_times(self.dt, xconf['majorGridUnit'], xconf['majorGridStep'])
        glyph.find_x_times(self.dt, xconf['minorGridUnit'], xconf['minorGridStep'])

    def test_find_x_times_invalid_input(self):
      with self.assertRaises(ValueError):
          glyph.find_x_times(None, glyph.SEC, 1.0)

      with self.assertRaises(ValueError):
          glyph.find_x_times(self.dt, None, 1.0)

      with self.assertRaises(ValueError):
          glyph.find_x_times(self.dt, glyph.SEC, None)

      with self.assertRaises(ValueError):
          glyph.find_x_times('', glyph.SEC, 1.0)

      with self.assertRaises(ValueError):
          glyph.find_x_times(self.dt, '', 1.0)

      with self.assertRaises(ValueError):
          glyph.find_x_times(self.dt, glyph.SEC, '')

      with self.assertRaises(ValueError):
          glyph.find_x_times(self.dt, glyph.YEAR, 1)

      with self.assertRaises(ValueError):
          glyph.find_x_times(self.dt, glyph.SEC, 0)

      with self.assertRaises(ValueError):
          glyph.find_x_times(self.dt, glyph.SEC, 1.0)

      with self.assertRaises(ValueError):
          glyph.find_x_times(self.dt, glyph.DAY, -1.0)


class AxisTicsTest(TestCase):

    #
    # Testing _AxisTics.checkFinite()
    #

    def test_AxisTics_checkFinite_nan(self):
      with self.assertRaises(glyph.GraphError):
          glyph._AxisTics.checkFinite(float('nan'))

    def test_AxisTics_checkFinite_inf(self):
      with self.assertRaises(glyph.GraphError):
          glyph._AxisTics.checkFinite(float('inf'))

    def test_AxisTics_checkFinite_100(self):
      self.assertEqual(glyph._AxisTics.checkFinite(100), 100)

    #
    # Testing _AxisTics.chooseDelta()
    #

    def test_AxisTics_chooseDelta_0_1(self):
      self.assertAlmostEqual(glyph._AxisTics.chooseDelta(1), 0.1, places=4)

    def test_AxisTics_chooseDelta_very_small(self):
      self.assertAlmostEqual(glyph._AxisTics.chooseDelta(1.0e-10), 1.0, places=4)


class LinearAxisTicsTest(TestCase):

    def test_LinearAxisTics_valid_input(self):
      self.assertTrue(glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary'))

    def test_LinearAxisTics_invalid_min_value(self):
      with self.assertRaises(glyph.GraphError):
          glyph._LinearAxisTics(float('NaN'), 100.0, unitSystem='binary')

    def test_LinearAxisTics_invalid_max_value(self):
      with self.assertRaises(glyph.GraphError):
          glyph._LinearAxisTics(0.0, float('inf'), unitSystem='binary')

    #
    # Testing _LinearAxisTics.applySettings()
    #

    def test_LinearAxisTics_applySettings_axisLimit_min_greater_max(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      with self.assertRaises(glyph.GraphError):
          y.applySettings(axisMin=1000, axisMax=10, axisLimit=None)

    #
    # Testing _LinearAxisTics.reconcileLimits()
    #

    def test_LinearAxisTics_reconcileLimits_defaults(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings()
      self.assertAlmostEqual(y.minValue, 0.0, places=4)
      self.assertAlmostEqual(y.maxValue, 100.0, places=4)

    def test_LinearAxisTics_reconcileLimits_ymin_and_ymax_assert(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=0, axisMax=10, axisLimit=100)
      self.assertAlmostEqual(y.minValue, 0.0, places=4)
      self.assertAlmostEqual(y.maxValue, 10.0, places=4)

    def test_LinearAxisTics_reconcileLimits_ymin_0(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=0, axisMax=None, axisLimit=100)
      self.assertAlmostEqual(y.minValue, 0.0, places=4)
      self.assertAlmostEqual(y.maxValue, 100.0, places=4)

    def test_LinearAxisTics_reconcileLimits_ymax_10(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=10, axisLimit=100)
      self.assertAlmostEqual(y.minValue, 0.0, places=4)
      self.assertAlmostEqual(y.maxValue, 10.0, places=4)

    def test_LinearAxisTics_reconcileLimits_ymax_max(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax='max', axisLimit=100)
      self.assertAlmostEqual(y.minValue, 0.0, places=4)
      self.assertAlmostEqual(y.maxValue, 100.0, places=4)

    def test_LinearAxisTics_reconcileLimits_axisLimit_below_max(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=100, axisLimit=10)
      self.assertAlmostEqual(y.minValue, 0.0, places=4)
      self.assertAlmostEqual(y.maxValue, 10.0, places=4)

    def test_LinearAxisTics_reconcileLimits_axisLimit_above_max(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=10, axisLimit=float('inf'))
      self.assertAlmostEqual(y.minValue, 0.0, places=4)
      self.assertAlmostEqual(y.maxValue, 10.0, places=4)

    def test_LinearAxisTics_reconcileLimits_ymax_0(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMax=0)
      self.assertAlmostEqual(y.minValue, -1.0, places=4)
      self.assertAlmostEqual(y.maxValue, 0.0, places=4)

    def test_LinearAxisTics_reconcileLimits_ymax_negative(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMax=-10)
      self.assertAlmostEqual(y.minValue, -11.0, places=4)
      self.assertAlmostEqual(y.maxValue, -10.0, places=4)

    def test_LinearAxisTics_reconcileLimits_ymin_100(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=100)
      self.assertAlmostEqual(y.minValue, 100.0, places=4)
      self.assertAlmostEqual(y.maxValue, 110.0, places=4)

    def test_LinearAxisTics_reconcileLimits_ymin_200(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=200)
      self.assertAlmostEqual(y.minValue, 200.0, places=4)
      self.assertAlmostEqual(y.maxValue, 220.0, places=4)

    #
    # Testing _LinearAxisTics.makeLabel()
    #

    def test_LinearAxisTics_makeLabel(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=10, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      self.assertEqual(y.makeLabel(2), '2 ')

    def test_LinearAxisTics_makeLabel_2k(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=10, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      self.assertEqual(y.makeLabel(2000), '2.0 Ki ')

    def test_LinearAxisTics_makeLabel_decimal(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      self.assertEqual(y.makeLabel(0.1), '0.10 ')

    def test_LinearAxisTics_makeLabel_small_decimal(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      self.assertEqual(y.makeLabel(0.01), '0.01 ')

    def test_LinearAxisTics_makeLabel_large_span_float(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=100
      self.assertEqual(y.makeLabel(51234.1234), '51.2 k ')

    def test_LinearAxisTics_makeLabel_large_span_int(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=100
      self.assertEqual(y.makeLabel(int(100000)), '100.0 k ')

    def test_LinearAxisTics_makeLabel_med_span_float(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=5
      self.assertEqual(y.makeLabel(50.1234), '50.1 ')

    def test_LinearAxisTics_makeLabel_med_span_int(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=5
      self.assertEqual(y.makeLabel(int(10)), '10.0 ')

    def test_LinearAxisTics_makeLabel_small_span_float(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=1
      self.assertEqual(y.makeLabel(5.1234), '5.12 ')

    def test_LinearAxisTics_makeLabel_small_span_int(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=1
      self.assertEqual(y.makeLabel(int(5)), '5.00 ')

    #
    # Testing _LinearAxisTics.setStep()
    #

    def test_LinearAxisTics_setStep_unset(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.step, None)

    def test_LinearAxisTics_setStep_5(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.setStep(5)
      self.assertEqual(y.step, 5)

    def test_LinearAxisTics_setStep_5_0(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.setStep(5.0)
      self.assertEqual(y.step, 5.0)

    def test_LinearAxisTics_setStep_nan(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      with self.assertRaises(glyph.GraphError):
          y.setStep(float('nan'))

    def test_LinearAxisTics_setStep_inf(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      with self.assertRaises(glyph.GraphError):
          y.setStep(float('inf'))

    def test_LinearAxisTics_setStep_None(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      with self.assertRaises(TypeError):
          y.setStep(None)

    #
    # Testing _LinearAxisTics.generateSteps()
    #

    def test_LinearAxisTics_generateSteps_1(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      for (results, expected) in zip(y.generateSteps(1), [1.0, 2.0, 5.0, 10.0, 20.0]):
        self.assertAlmostEqual(results, expected, places=4)

    def test_LinearAxisTics_generateSteps_binary_1(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.binary=True
      for (results, expected) in zip(y.generateSteps(1), [1.0, 2.0, 4.0, 8.0, 16.0]):
        self.assertAlmostEqual(results, expected, places=4)

    def test_LinearAxisTics_generateSteps_5(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      for (results, expected) in zip(y.generateSteps(5), [5.0, 10.0, 20.0]):
        self.assertAlmostEqual(results, expected, places=4)

    def test_LinearAxisTics_generateSteps_binary_5(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.binary=True
      for (results, expected) in zip(y.generateSteps(5), [8.0, 16.0]):
        self.assertAlmostEqual(results, expected, places=4)

    def test_LinearAxisTics_generateSteps_0(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      #ValueError: math domain error
      with self.assertRaises(ValueError):
        list(y.generateSteps(0))

    #
    # Testing _LinearAxisTics.computeSlop()
    #

    def test_LinearAxisTics_computeSlop_10_5(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.computeSlop(10, 5), None)

    def test_LinearAxisTics_computeSlop_10_3(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.computeSlop(10, 3), None)

    def test_LinearAxisTics_computeSlop_med_maxValue_50_10(self):
      y = glyph._LinearAxisTics(0.0, 100.0, unitSystem='si')
      self.assertAlmostEqual(y.computeSlop(50, 10), 400.0, places=4)

    def test_LinearAxisTics_computeSlop_low_maxValue_10_3(self):
      y = glyph._LinearAxisTics(0, 1, unitSystem='si')
      self.assertAlmostEqual(y.computeSlop(10, 3), 29.0, places=4)

    #
    # Testing _LinearAxisTics.chooseStep()
    #

    def test_LinearAxisTics_chooseStep_default(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.chooseStep(), None)
      self.assertAlmostEqual(y.step, 200, places=4)

    def test_LinearAxisTics_chooseStep_default_divisors(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.chooseStep([4,5,6]), None)
      self.assertAlmostEqual(y.step, 200, places=4)

    def test_LinearAxisTics_chooseStep_bad_divisors(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      with self.assertRaises(glyph.GraphError):
        y.chooseStep([0,1,2])

    def test_LinearAxisTics_chooseStep_min_max_0_0(self):
      y = glyph._LinearAxisTics(0.0, 0.0, unitSystem='si')
      self.assertEqual(y.chooseStep([4,5,6]), None)
      self.assertAlmostEqual(y.step, 0.2, places=5)

    def test_LinearAxisTics_chooseStep_min_max_1_0(self):
      y = glyph._LinearAxisTics(1.0, 1.0, unitSystem='si')
      self.assertEqual(y.chooseStep([4,5,6]), None)
      self.assertAlmostEqual(y.step, 0.05, places=6)

    def test_LinearAxisTics_chooseStep_min_max_neg_1_0(self):
      y = glyph._LinearAxisTics(-1.0, -1.0, unitSystem='si')
      self.assertEqual(y.chooseStep([4,5,6]), None)
      self.assertAlmostEqual(y.step, 0.05, places=6)

    #
    # Testing _LinearAxisTics.chooseLimits()
    # side effects are settings of
    # self.bottom
    # self.top
    # self.span

    def test_LinearAxisTics_chooseLimits_defaults(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings()
      y.chooseStep()
      y.chooseLimits()
      self.assertEqual((y.bottom, y.top, y.span), (0.0, 1000.0, 1000.0))

    def test_LinearAxisTics_chooseLimits_axisMin_0(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=0.0)
      y.chooseStep()
      y.chooseLimits()
      self.assertEqual((y.bottom, y.top, y.span), (0.0, 1000.0, 1000.0))

    def test_LinearAxisTics_chooseLimits_axisMax_0(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMax=0.0)
      y.chooseStep()
      y.chooseLimits()
      self.assertEqual((y.bottom, y.top, y.span), (-1.0, 0.0, 1.0))

    def test_LinearAxisTics_chooseLimits_yMax_0_axisMax_0_1(self):
      y = glyph._LinearAxisTics(0.0, 0.0, unitSystem='si')
      y.applySettings(axisMax=0.1)
      y.chooseStep()
      y.chooseLimits()
      self.assertEqual((y.bottom, y.top, y.span), (0.0, 0.1, 0.1))

    #
    # Testing _LinearAxisTics.getLabelValues()
    #

    def test_LinearAxisTics_getLabelValues_defaults(self):
      y = glyph._LinearAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings()
      y.chooseStep()
      y.chooseLimits()
      self.assertEqual(y.getLabelValues(), [0.0, 200.0, 400.0, 600.0, 800.0, 1000.0])

    def test_LinearAxisTics_getLabelValues_neg(self):
      y = glyph._LinearAxisTics(-1000.0, -1.0, unitSystem='si')
      y.applySettings()
      y.chooseStep()
      y.chooseLimits()
      self.assertEqual(y.getLabelValues(), [-1000.0, -800.0, -600.0, -400.0, -200.0, 0.0])

    def test_LinearAxisTics_getLabelValues_neg_step(self):
      y = glyph._LinearAxisTics(-1000.0, -1.0, unitSystem='si')
      y.applySettings()
      y.chooseStep()
      y.step=-1
      y.chooseLimits()
      with self.assertRaises(glyph.GraphError):
        y.getLabelValues()

    def test_LinearAxisTics_getLabelValues_small_step(self):
      y = glyph._LinearAxisTics(-1000.0, -1.0, unitSystem='si')
      y.applySettings()
      y.chooseStep()
      y.chooseLimits()
      y.step=0.001
      self.assertEqual(y.getLabelValues(), [-1000.0, -800.0, -600.0, -400.0, -200.0, 0.0])


class LogAxisTicsTest(TestCase):

    def test_LogAxisTics_valid_input(self):
      self.assertTrue(glyph._LogAxisTics(0.0, 100.0, unitSystem='binary'))

    def test_LogAxisTics_invalid_min_value(self):
      with self.assertRaises(glyph.GraphError):
          glyph._LogAxisTics(float('NaN'), 100.0, unitSystem='binary')

    def test_LogAxisTics_invalid_max_value(self):
      with self.assertRaises(glyph.GraphError):
          glyph._LogAxisTics(0.0, float('inf'), unitSystem='binary')

    def test_LogAxisTics_invalid_base_value(self):
      with self.assertRaises(glyph.GraphError):
          glyph._LogAxisTics(0.0, 100.0, base=1.0, unitSystem='binary')

    #
    # Testing _LogAxisTics.applySettings()
    #

    def test_LogAxisTics_applySettings_axisLimit_min_greater_max(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      with self.assertRaises(glyph.GraphError):
          y.applySettings(axisMin=1000, axisMax=10, axisLimit=None)

    #
    # Testing _LogAxisTics.reconcileLimits()
    #

    def test_LogAxisTics_reconcileLimits_defaults(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      self.assertEqual(y.reconcileLimits(), None)

    def test_LogAxisTics_reconcileLimits_ymin_0(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=0, axisMax=None, axisLimit=100)
      self.assertEqual(y.reconcileLimits(), None)

    def test_LogAxisTics_reconcileLimits_ymax_10(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=10, axisLimit=100)
      self.assertEqual(y.reconcileLimits(), None)

    def test_LogAxisTics_reconcileLimits_ymax_max(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax='max', axisLimit=100)
      self.assertEqual(y.reconcileLimits(), None)

    def test_LogAxisTics_reconcileLimits_axisLimit_None(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=None)
      self.assertEqual(y.reconcileLimits(), None)

    def test_LogAxisTics_reconcileLimits_axisLimit_below_max(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=100, axisLimit=10)
      self.assertEqual(y.reconcileLimits(), None)

    def test_LogAxisTics_reconcileLimits_axisLimit_above_max(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=10, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)

    #
    # Testing _LogAxisTics.makeLabel()
    #

    def test_LogAxisTics_makeLabel(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=10, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      self.assertEqual(y.makeLabel(2), '2 ')

    def test_LogAxisTics_makeLabel_2k(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=10, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      self.assertEqual(y.makeLabel(2000), '2.0 Ki ')

    def test_LogAxisTics_makeLabel_decimal(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      self.assertEqual(y.makeLabel(0.1), '0.10 ')

    def test_LogAxisTics_makeLabel_small_decimal(self):
      y = glyph._LogAxisTics(0.0, 100.0, unitSystem='binary')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      self.assertEqual(y.makeLabel(0.01), '0.01 ')

    def test_LogAxisTics_makeLabel_large_span_float(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=100
      self.assertEqual(y.makeLabel(51234.1234), '51.2 k ')

    def test_LogAxisTics_makeLabel_large_span_int(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=100
      self.assertEqual(y.makeLabel(int(100000)), '100.0 k ')

    def test_LogAxisTics_makeLabel_med_span_float(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=5
      self.assertEqual(y.makeLabel(50.1234), '50.1 ')

    def test_LogAxisTics_makeLabel_med_span_int(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=5
      self.assertEqual(y.makeLabel(int(10)), '10.0 ')

    def test_LogAxisTics_makeLabel_small_span_float(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=1
      self.assertEqual(y.makeLabel(5.1234), '5.12 ')

    def test_LogAxisTics_makeLabel_small_span_int(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.applySettings(axisMin=None, axisMax=None, axisLimit=float('inf'))
      self.assertEqual(y.reconcileLimits(), None)
      y.span=1
      self.assertEqual(y.makeLabel(int(5)), '5.00 ')

    #
    # Testing _LogAxisTics.setStep()
    #

    def test_LogAxisTics_setStep_unset(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.step, None)

    def test_LogAxisTics_setStep_5(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.setStep(5)
      self.assertEqual(y.step, None)

    def test_LogAxisTics_setStep_5_0(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.setStep(5.0)
      self.assertEqual(y.step, None)

    def test_LogAxisTics_setStep_nan(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.setStep(float('nan'))
      self.assertEqual(y.step, None)

    def test_LogAxisTics_setStep_inf(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.setStep(float('inf'))
      self.assertEqual(y.step, None)

    def test_LogAxisTics_setStep_None(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      y.setStep(None)
      self.assertEqual(y.step, None)

    #
    # Testing _LogAxisTics.chooseStep()
    #

    def test_LogAxisTics_chooseStep_default(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.chooseStep(), None)
      self.assertEqual(y.step, None)

    def test_LogAxisTics_chooseStep_default_divisors(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.chooseStep([4,5,6]), None)
      self.assertEqual(y.step, None)

    def test_LogAxisTics_chooseStep_bad_divisors(self):
      y = glyph._LogAxisTics(0.0, 1000.0, unitSystem='si')
      self.assertEqual(y.chooseStep([0,1,2]), None)
      self.assertEqual(y.step, None)

    def test_LogAxisTics_chooseStep_min_max_0_0(self):
      y = glyph._LogAxisTics(0.0, 0.0, unitSystem='si')
      self.assertEqual(y.chooseStep([4,5,6]), None)
      self.assertEqual(y.step, None)

    def test_LogAxisTics_chooseStep_min_max_1_0(self):
      y = glyph._LogAxisTics(1.0, 1.0, unitSystem='si')
      self.assertEqual(y.chooseStep([4,5,6]), None)
      self.assertEqual(y.step, None)

    def test_LogAxisTics_chooseStep_min_max_neg_1_0(self):
      y = glyph._LogAxisTics(-1.0, -1.0, unitSystem='si')
      self.assertEqual(y.chooseStep([4,5,6]), None)
      self.assertEqual(y.step, None)

    #
    # Testing _LogAxisTics.chooseLimits()
    # side effects are settings of
    # self.bottom
    # self.top
    # self.span

    def test_LogAxisTics_chooseLimits_defaults(self):
      y = glyph._LogAxisTics(1.0, 1000, unitSystem='si')
      y.applySettings()
      y.chooseLimits()
      self.assertEqual((y.bottom, y.top, y.span), (1.0, 1000.0, 999.0))

    def test_LogAxisTics_chooseLimits_axisMin_1(self):
      y = glyph._LogAxisTics(1.0, 1000, unitSystem='si')
      y.applySettings(axisMin=1.0)
      y.chooseLimits()
      self.assertEqual((y.bottom, y.top, y.span), (1.0, 1000.0, 999.0))

    def test_LogAxisTics_chooseLimits_axisMax_0(self):
      y = glyph._LogAxisTics(1, 1000, unitSystem='si')
      y.applySettings(axisMax=1.0)
      y.chooseLimits()
      self.assertEqual((y.bottom, y.top, y.span), (0.1, 1.0, 0.9))

    def test_LogAxisTics_chooseLimits_yMax_0_axisMax_0_1(self):
      y = glyph._LogAxisTics(0.0, 0.0, unitSystem='si')
      y.applySettings(axisMax=0.1)
      with self.assertRaises(glyph.GraphError):
        y.chooseLimits()

    #
    # Testing _LogAxisTics.getLabelValues()
    #

    def test_LogAxisTics_getLabelValues_defaults(self):
      y = glyph._LogAxisTics(1, 1000, unitSystem='si')
      y.applySettings()
      y.chooseLimits()
      self.assertEqual(y.getLabelValues(), [1.0, 10.0, 100.0, 1000.0])

    def test_LogAxisTics_getLabelValues_neg(self):
      y = glyph._LogAxisTics(1, 5, unitSystem='si')
      y.applySettings()
      y.chooseLimits()
      self.assertEqual(y.getLabelValues(), [1.0, 10.0])
