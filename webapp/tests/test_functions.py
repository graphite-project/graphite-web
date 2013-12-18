from django.test import TestCase

from graphite.render.datalib import TimeSeries
from graphite.render import functions


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
            seriesList.append(TimeSeries('Test(%d)' % i, 0, 0, 0, c))

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
