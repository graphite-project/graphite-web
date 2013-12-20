import copy
from django.test import TestCase

from graphite.render.datalib import TimeSeries
from graphite.render import functions

def return_greater(series, value):
    return [i for i in series if i is not None and i > value]

def return_less(series, value):
    return [i for i in series if i is not None and i < value]


class FunctionsTest(TestCase):
    def test_highest_max(self):
        config = [20, 50, 30, 40]
        seriesList = [range(max_val) for max_val in config]

        # Expect the test results to be returned in decending order
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

    def test_remove_above_percentile(self):
        seriesList = self._generate_series_list()
        percent = 50
        results = functions.removeAbovePercentile({}, seriesList, percent)
        for result in results:
            self.assertListEqual(return_greater(result, percent), [])

    def test_remove_below_percentile(self):
        seriesList = self._generate_series_list()
        percent = 50
        results = functions.removeBelowPercentile({}, seriesList, percent)
        expected = [[], [], [1]]

        for i, result in enumerate(results):
            self.assertListEqual(return_less(result, percent), expected[i])

    def test_remove_above_value(self):
        seriesList = self._generate_series_list()
        value = 5
        results = functions.removeAboveValue({}, seriesList, value)
        for result in results:
            self.assertListEqual(return_greater(result, value), [])

    def test_remove_below_value(self):
        seriesList = self._generate_series_list()
        value = 5
        results = functions.removeBelowValue({}, seriesList, value)
        for result in results:
            self.assertListEqual(return_less(result, value), [])

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

    def test_transform_null(self):
        seriesList = self._generate_series_list()
        transform = -5
        results = functions.transformNull({}, seriesList, transform)

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
                    self.assertEqual(tranform, result_val,
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
