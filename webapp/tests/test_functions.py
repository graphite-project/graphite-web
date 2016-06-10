import copy
import math
import pytz
from fnmatch import fnmatch

from django.test import TestCase
from django.conf import settings
from mock import patch, call, MagicMock
from datetime import datetime

from graphite.render.datalib import TimeSeries
from graphite.render import functions
from graphite.render.functions import NormalizeEmptyResultError

def return_greater(series, value):
    return [i for i in series if i is not None and i > value]

def return_less(series, value):
    return [i for i in series if i is not None and i < value]


class FunctionsTest(TestCase):
    def test_highest_max(self):
        config = [20, 50, 30, 40]
        seriesList = [range(max_val) for max_val in config]

        # Expect the test results to be returned in descending order
        expected = [
            [seriesList[1]],
            [seriesList[1], seriesList[3]],
            [seriesList[1], seriesList[3], seriesList[2]],
            # Test where num_return == len(seriesList)
            [seriesList[1], seriesList[3], seriesList[2], seriesList[0]],
            # Test where num_return > len(seriesList)
            [seriesList[1], seriesList[3], seriesList[2], seriesList[0]],
        ]
        for index, test in enumerate(expected):
            results = functions.highestMax({}, seriesList, index + 1)
            self.assertEqual(test, results)

    def test_highest_max_empty_series_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.highestMax({}, [], 1))

    def testGetPercentile(self):
        seriesList = [
            ([None, None, 15, 20, 35, 40, 50], 20),
            (range(100), 30),
            (range(200), 60),
            (range(300), 90),
            (range(1, 101), 31),
            (range(1, 201), 61),
            (range(1, 301), 91),
            (range(0, 102), 30),
            (range(1, 203), 61),
            (range(1, 303), 91),
        ]
        for index, conf in enumerate(seriesList):
            series, expected = conf
            result = functions._getPercentile(series, 30)
            self.assertEqual(expected, result, 'For series index <%s> the 30th percentile ordinal is not %d, but %d ' % (index, expected, result))

    def test_integral(self):
        seriesList = [TimeSeries('test', 0, 600, 60, [None, 1, 2, 3, 4, 5, None, 6, 7, 8])]
        expected = [TimeSeries('integral(test)', 0, 600, 60, [None, 1, 3, 6, 10, 15, None, 21, 28, 36])]
        result = functions.integral({}, seriesList)
        self.assertEqual(expected, result, 'integral result incorrect')

    def test_integralByInterval(self):
        seriesList = [TimeSeries('test', 0, 600, 60, [None, 1, 2, 3, 4, 5, None, 6, 7, 8])]
        expected = [TimeSeries("integral(test,'2min')", 0, 600, 60, [0, 1, 2, 5, 4, 9, 0, 6, 7, 15])]
        result = functions.integralByInterval({'startTime' : datetime(1970,1,1)}, seriesList, '2min')
        self.assertEqual(expected, result, 'integralByInterval result incorrect %s %s' %(result, result[0]))

    def test_n_percentile(self):
        seriesList = []
        config = [
            [15, 35, 20, 40, 50],
            range(1, 101),
            range(1, 201),
            range(1, 301),
            range(0, 100),
            range(0, 200),
            range(0, 300),
            # Ensure None values in list has no effect.
            [None, None, None] + range(0, 300),
        ]

        for i, c in enumerate(config):
            seriesList.append(TimeSeries('Test(%d)' % i, 0, 1, 1, c))

        def n_percentile(perc, expected):
            result = functions.nPercentile({}, seriesList, perc)
            self.assertEqual(expected, result)

        n_percentile(30, [[20], [31], [61], [91], [30], [60], [90], [90]])
        n_percentile(90, [[50], [91], [181], [271], [90], [180], [270], [270]])
        n_percentile(95, [[50], [96], [191], [286], [95], [190], [285], [285]])

    def test_sorting_by_total(self):
        seriesList = []
        config = [[1000, 100, 10, 0], [1000, 100, 10, 1]]
        for i, c in enumerate(config):
            seriesList.append(TimeSeries('Test(%d)' % i, 0, 0, 0, c))

        self.assertEqual(1110, functions.safeSum(seriesList[0]))

        result = functions.sortByTotal({}, seriesList)

        self.assertEqual(1111, functions.safeSum(result[0]))
        self.assertEqual(1110, functions.safeSum(result[1]))

    def _generate_series_list(self):
        seriesList = []
        config = [range(101), range(101), [1, None, None, None, None]]

        for i, c in enumerate(config):
            name = "collectd.test-db{0}.load.value".format(i + 1)
            seriesList.append(TimeSeries(name, 0, 1, 1, c))
        return seriesList

    def test_check_empty_lists(self):
        seriesList = []
        config = [[1000, 100, 10, 0], []]
        for i, c in enumerate(config):
            seriesList.append(TimeSeries('Test(%d)' % i, 0, 0, 0, c))

        self.assertTrue(functions.safeIsNotEmpty(seriesList[0]))
        self.assertFalse(functions.safeIsNotEmpty(seriesList[1]))

        result = functions.removeEmptySeries({}, seriesList)

        self.assertEqual(1, len(result))

    def test_remove_above_percentile(self):
        seriesList = self._generate_series_list()
        percent = 50
        results = functions.removeAbovePercentile({}, seriesList, percent)
        for i, result in enumerate(results):
            self.assertListEqual(return_greater(result, percent), [])
            expected_name = "removeAbovePercentile(collectd.test-db{0}.load.value, 50)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_above_percentile_float(self):
        seriesList = self._generate_series_list()
        percent = 0.1
        results = functions.removeAbovePercentile({}, seriesList, percent)
        expected = [[], [], [1]]

        for i, result in enumerate(results):
            self.assertListEqual(return_greater(result, percent), expected[i])
            expected_name = "removeAbovePercentile(collectd.test-db{0}.load.value, 0.1)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_below_percentile(self):
        seriesList = self._generate_series_list()
        percent = 50
        results = functions.removeBelowPercentile({}, seriesList, percent)
        expected = [[], [], [1]]

        for i, result in enumerate(results):
            self.assertListEqual(return_less(result, percent), expected[i])
            expected_name = "removeBelowPercentile(collectd.test-db{0}.load.value, 50)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_below_percentile_float(self):
        seriesList = self._generate_series_list()
        percent = 0.1
        results = functions.removeBelowPercentile({}, seriesList, percent)
        expected = [[0], [0], []]

        for i, result in enumerate(results):
            self.assertListEqual(return_less(result, percent), expected[i])
            expected_name = "removeBelowPercentile(collectd.test-db{0}.load.value, 0.1)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_above_value(self):
        seriesList = self._generate_series_list()
        value = 5
        results = functions.removeAboveValue({}, seriesList, value)
        for i, result in enumerate(results):
            self.assertListEqual(return_greater(result, value), [])
            expected_name = "removeAboveValue(collectd.test-db{0}.load.value, 5)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_above_value_float(self):
        seriesList = self._generate_series_list()
        value = 0.1
        results = functions.removeAboveValue({}, seriesList, value)
        for i, result in enumerate(results):
            self.assertListEqual(return_greater(result, value), [])
            expected_name = "removeAboveValue(collectd.test-db{0}.load.value, 0.1)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_below_value(self):
        seriesList = self._generate_series_list()
        value = 5
        results = functions.removeBelowValue({}, seriesList, value)
        for i, result in enumerate(results):
            self.assertListEqual(return_less(result, value), [])
            expected_name = "removeBelowValue(collectd.test-db{0}.load.value, 5)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_below_value_float(self):
        seriesList = self._generate_series_list()
        value = 0.1
        results = functions.removeBelowValue({}, seriesList, value)
        for i, result in enumerate(results):
            self.assertListEqual(return_less(result, value), [])
            expected_name = "removeBelowValue(collectd.test-db{0}.load.value, 0.1)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_limit(self):
        seriesList = self._generate_series_list()
        limit = len(seriesList) - 1
        results = functions.limit({}, seriesList, limit)
        self.assertEqual(len(results), limit,
            "More than {0} results returned".format(limit),
        )

    def _verify_series_options(self, seriesList, name, value):
        """
        Verify a given option is set and True for each series in a
        series list
        """
        for series in seriesList:
            self.assertIn(name, series.options)
            if value is True:
                test_func = self.assertTrue
            else:
                test_func = self.assertEqual

            test_func(series.options.get(name), value)

    def test_second_y_axis(self):
        seriesList = self._generate_series_list()
        results = functions.secondYAxis({}, seriesList)
        self._verify_series_options(results, "secondYAxis", True)

    def test_draw_as_infinite(self):
        seriesList = self._generate_series_list()
        results = functions.drawAsInfinite({}, seriesList)
        self._verify_series_options(results, "drawAsInfinite", True)

    def test_line_width(self):
        seriesList = self._generate_series_list()
        width = 10
        results = functions.lineWidth({}, seriesList, width)
        self._verify_series_options(results, "lineWidth", width)

    def test_dashed(self):
        seriesList = self._generate_series_list()
        dashLength = 3
        results = functions.dashed({}, seriesList, dashLength)
        self._verify_series_options(results, "dashed", 3)
        for i, result in enumerate(results):
            expected_name = "dashed(collectd.test-db{0}.load.value, 3)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_dashed_default(self):
        seriesList = self._generate_series_list()
        results = functions.dashed({}, seriesList)
        self._verify_series_options(results, "dashed", 5)
        for i, result in enumerate(results):
            expected_name = "dashed(collectd.test-db{0}.load.value, 5)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_dashed_float(self):
        seriesList = self._generate_series_list()
        dashLength = 3.5
        results = functions.dashed({}, seriesList, dashLength)
        self._verify_series_options(results, "dashed", 3.5)
        for i, result in enumerate(results):
            expected_name = "dashed(collectd.test-db{0}.load.value, 3.5)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_transform_null(self):
        seriesList = self._generate_series_list()
        transform = -5
        results = functions.transformNull({}, copy.deepcopy(seriesList), transform)

        for counter, series in enumerate(seriesList):
            if not None in series:
                continue
            # If the None values weren't transformed, there is a problem
            self.assertNotIn(None, results[counter],
                "tranformNull should remove all None values",
            )
            # Anywhere a None was in the original series, verify it
            # was transformed to the given value it should be.
            for i, value in enumerate(series):
                if value is None:
                    result_val = results[counter][i]
                    self.assertEqual(transform, result_val,
                        "Transformed value should be {0}, not {1}".format(transform, result_val),
                    )

    def test_alias(self):
        seriesList = self._generate_series_list()
        substitution = "Ni!"
        results = functions.alias({}, seriesList, substitution)
        for series in results:
            self.assertEqual(series.name, substitution)

    def test_alias_sub(self):
        seriesList = self._generate_series_list()
        substitution = "Shrubbery"
        results = functions.aliasSub({}, seriesList, "^\w+", substitution)
        for series in results:
            self.assertTrue(series.name.startswith(substitution),
                    "aliasSub should replace the name with {0}".format(substitution),
            )

    # TODO: Add tests for * globbing and {} matching to this
    def test_alias_by_node(self):
        seriesList = self._generate_series_list()

        def verify_node_name(*nodes):
            if isinstance(nodes, int):
                node_number = [nodes]

            # Use deepcopy so the original seriesList is unmodified
            results = functions.aliasByNode({}, copy.deepcopy(seriesList), *nodes)

            for i, series in enumerate(results):
                fragments = seriesList[i].name.split('.')
                # Super simplistic. Doesn't match {thing1,thing2}
                # or glob with *, both of what graphite allow you to use
                expected_name = '.'.join([fragments[i] for i in nodes])
                self.assertEqual(series.name, expected_name)

        verify_node_name(1)
        verify_node_name(1, 0)
        verify_node_name(-1, 0)

        # Verify broken input causes broken output
        with self.assertRaises(IndexError):
            verify_node_name(10000)

    def test_alpha(self):
        seriesList = self._generate_series_list()
        alpha = 0.5
        results = functions.alpha({}, seriesList, alpha)
        self._verify_series_options(results, "alpha", alpha)

    def test_color(self):
        seriesList = self._generate_series_list()
        color = "red"
        # Leave the original seriesList unmodified
        results = functions.color({}, copy.deepcopy(seriesList), color)

        for i, series in enumerate(results):
            self.assertTrue(hasattr(series, "color"),
                "The transformed seriesList is missing the 'color' attribute",
            )
            self.assertFalse(hasattr(seriesList[i], "color"),
                "The original seriesList shouldn't have a 'color' attribute",
            )
            self.assertEqual(series.color, color)

    def test_scale(self):
        seriesList = self._generate_series_list()
        multiplier = 2
        # Leave the original seriesList undisturbed for verification
        results = functions.scale({}, copy.deepcopy(seriesList), multiplier)
        for i, series in enumerate(results):
            for counter, value in enumerate(series):
                if value is None:
                    continue
                original_value = seriesList[i][counter]
                expected_value = original_value * multiplier
                self.assertEqual(value, expected_value)

    def test_normalize_empty(self):
      try:
        functions.normalize([])
      except NormalizeEmptyResultError:
        pass

    def _generate_mr_series(self):
        seriesList = [
            TimeSeries('group.server1.metric1',0,1,1,[None]),
            TimeSeries('group.server1.metric2',0,1,1,[None]),
            TimeSeries('group.server2.metric1',0,1,1,[None]),
            TimeSeries('group.server2.metric2',0,1,1,[None]),
        ]
        mappedResult = [
            [seriesList[0],seriesList[1]],
            [seriesList[2],seriesList[3]]
        ]
        return (seriesList,mappedResult)

    def test_mapSeries(self):
        seriesList, expectedResult = self._generate_mr_series()
        results = functions.mapSeries({}, copy.deepcopy(seriesList), 1)
        self.assertEqual(results,expectedResult)

    def test_reduceSeries(self):
        sl, inputList = self._generate_mr_series()
        expectedResult   = [
            TimeSeries('group.server1.reduce.mock',0,1,1,[None]),
            TimeSeries('group.server2.reduce.mock',0,1,1,[None])
        ]
        resultSeriesList = [TimeSeries('mock(series)',0,1,1,[None])]
        mock = MagicMock(return_value = resultSeriesList)
        with patch.dict(functions.SeriesFunctions,{ 'mock': mock }):
            results = functions.reduceSeries({}, copy.deepcopy(inputList), "mock", 2, "metric1","metric2" )
            self.assertEqual(results,expectedResult)
        self.assertEqual(mock.mock_calls,
                         [call({},[inputList[0][0]],[inputList[0][1]]),
                          call({},[inputList[1][0]],[inputList[1][1]])])

    def test_reduceSeries_asPercent(self):
        seriesList = [
            TimeSeries('group.server1.bytes_used',0,1,1,[1]),
            TimeSeries('group.server1.total_bytes',0,1,1,[2]),
            TimeSeries('group.server2.bytes_used',0,1,1,[3]),
            TimeSeries('group.server2.total_bytes',0,1,1,[4]),
        ]
        for series in seriesList:
            series.pathExpression = "tempPath"
        expectedResult   = [
            TimeSeries('group.server1.reduce.asPercent',0,1,1,[50]), #100*1/2
            TimeSeries('group.server2.reduce.asPercent',0,1,1,[75])  #100*3/4
        ]
        mappedResult = [seriesList[0]],[seriesList[1]], [seriesList[2]],[seriesList[3]]
        results = functions.reduceSeries({}, copy.deepcopy(mappedResult), "asPercent", 2, "bytes_used", "total_bytes")
        self.assertEqual(results,expectedResult)

    def test_pow(self):
        seriesList = self._generate_series_list()
        factor = 2
        # Leave the original seriesList undisturbed for verification
        results = functions.pow({}, copy.deepcopy(seriesList), factor)
        for i, series in enumerate(results):
            for counter, value in enumerate(series):
                if value is None:
                    continue
                original_value = seriesList[i][counter]
                expected_value = math.pow(original_value, factor)
                self.assertEqual(value, expected_value)

    def test_squareRoot(self):
        seriesList = self._generate_series_list()
        # Leave the original seriesList undisturbed for verification
        results = functions.squareRoot({}, copy.deepcopy(seriesList))
        for i, series in enumerate(results):
            for counter, value in enumerate(series):
                original_value = seriesList[i][counter]
                if value is None:
                    self.assertEqual(original_value, None)
                    continue
                expected_value = math.pow(original_value, 0.5)
                self.assertEqual(value, expected_value)

    def test_invert(self):
        seriesList = self._generate_series_list()
        # Leave the original seriesList undisturbed for verification
        results = functions.invert({}, copy.deepcopy(seriesList))
        for i, series in enumerate(results):
            for counter, value in enumerate(series):
                original_value = seriesList[i][counter]
                if value is None:
                    continue
                expected_value = math.pow(original_value, -1)
                self.assertEqual(value, expected_value)

    def test_changed(self):
        config = [
            [[1,2,3,4,4,5,5,5,6,7], [0,1,1,1,0,1,0,0,1,1]],
            [[None,None,None,None,0,0,0,None,None,1], [0,0,0,0,0,0,0,0,0,1]]
        ]
        for i, c in enumerate(config):
            name = "collectd.test-db{0}.load.value".format(i + 1)
            series = [TimeSeries(name,0,1,1,c[0])]
            expected = [TimeSeries("changed(%s)" % name,0,1,1,c[1])]
            result = functions.changed({}, series)
            self.assertEqual(result, expected)

    def test_multiplySeriesWithWildcards(self):
        seriesList1 = [
            TimeSeries('web.host-1.avg-response.value',0,1,1,[1,10,11]),
            TimeSeries('web.host-2.avg-response.value',0,1,1,[2,20,21]),
            TimeSeries('web.host-3.avg-response.value',0,1,1,[3,30,31]),
            TimeSeries('web.host-4.avg-response.value',0,1,1,[4,40,41]),
        ]
        seriesList2 = [
            TimeSeries('web.host-4.total-request.value',0,1,1,[4,8,12]),
            TimeSeries('web.host-3.total-request.value',0,1,1,[3,7,11]),
            TimeSeries('web.host-1.total-request.value',0,1,1,[1,5,9]),
            TimeSeries('web.host-2.total-request.value',0,1,1,[2,6,10]),
        ]
        expectedResult = [
            TimeSeries('web.host-1',0,1,1,[1,50,99]),
            TimeSeries('web.host-2',0,1,1,[4,120,210]),
            TimeSeries('web.host-3',0,1,1,[9,210,341]),
            TimeSeries('web.host-4',0,1,1,[16,320,492]),
        ]
        results = functions.multiplySeriesWithWildcards({}, copy.deepcopy(seriesList1+seriesList2), 2,3)
        self.assertEqual(results,expectedResult)

    def test_timeSlice(self):
        seriesList = [
            # series starts at 60 seconds past the epoch and continues for 600 seconds (ten minutes)
            # steps are every 60 seconds
            TimeSeries('test.value',0,600,60,[None,1,2,3,None,5,6,None,7,8,9]),
        ]

        # we're going to slice such that we only include minutes 3 to 8 (of 0 to 9)
        expectedResult = [
            TimeSeries('timeSlice(test.value, 180, 480)',0,600,60,[None,None,None,3,None,5,6,None,7,None,None])
        ]

        results = functions.timeSlice({
            'startTime': datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
            'endTime': datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE)),
            'localOnly': False,
            'data': [],
        }, seriesList, '00:03 19700101', '00:08 19700101')
        self.assertEqual(results, expectedResult)

    def test_legendValue_with_system_preserves_sign(self):
        seriesList = [TimeSeries("foo", 0, 1, 1, [-10000, -20000, -30000, -40000])]
        result = functions.legendValue({}, seriesList, "avg", "si")
        self.assertEqual(result[0].name, "foo                 avg  -25.00k   ")

    def test_linearRegression(self):
        original = functions.evaluateTarget
        try:
            # series starts at 60 seconds past the epoch and continues for 600 seconds (ten minutes)
            # steps are every 60 seconds
            savedSeries = TimeSeries('test.value',180,480,60,[3,None,5,6,None,8]),
            functions.evaluateTarget = lambda x, y: savedSeries

            # input values will be ignored and replaced by regression function
            inputSeries = TimeSeries('test.value',1200,1500,60,[123,None,None,456,None,None,None])
            inputSeries.pathExpression = 'test.value'
            results = functions.linearRegression({
                'startTime': datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                'endTime': datetime(1970, 1, 1, 0, 25, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                'localOnly': False,
                'data': [],
            }, [ inputSeries ], '00:03 19700101', '00:08 19700101')

            # regression function calculated from datapoints on minutes 3 to 8
            expectedResult = [
                TimeSeries('linearRegression(test.value, 180, 480)',1200,1500,60,[20.0,21.0,22.0,23.0,24.0,25.0,26.0])
            ]

            self.assertEqual(results, expectedResult)
        finally:
            functions.evaluateTarget = original

    def test_applyByNode(self):
        seriesList = [
            TimeSeries('servers.s1.disk.bytes_used', 0, 3, 1, [10, 20, 30]),
            TimeSeries('servers.s1.disk.bytes_free', 0, 3, 1, [90, 80, 70]),
            TimeSeries('servers.s2.disk.bytes_used', 0, 3, 1, [1, 2, 3]),
            TimeSeries('servers.s2.disk.bytes_free', 0, 3, 1, [99, 98, 97])
        ]
        for series in seriesList:
            series.pathExpression = series.name

        def mock_data_fetcher(reqCtx, path_expression):
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        expectedResults = [
            TimeSeries('servers.s1.disk.pct_used', 0, 3, 1, [0.10, 0.20, 0.30]),
            TimeSeries('servers.s2.disk.pct_used', 0, 3, 1, [0.01, 0.02, 0.03])
        ]

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            result = functions.applyByNode(
                {
                    'startTime': datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    'endTime': datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    'localOnly': False,
                },
                seriesList, 1,
                'divideSeries(%.disk.bytes_used, sumSeries(%.disk.bytes_*))',
                '%.disk.pct_used'
            )
        self.assertEqual(result, expectedResults)
