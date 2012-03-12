import unittest

from django.conf import settings
# This line has to occur before importing functions and datalib.
settings.configure(
    LOG_DIR='.',
    LOG_CACHE_PERFORMANCE='',
    LOG_RENDERING_PERFORMANCE='',
    LOG_METRIC_ACCESS='',
    DATA_DIRS='.',
    CLUSTER_SERVERS='',
    CARBONLINK_HOSTS='',
    CARBONLINK_TIMEOUT=0,
    REMOTE_STORE_RETRY_DELAY=60)

from graphite.render.datalib import TimeSeries
import graphite.render.functions as functions


class FunctionsTest(unittest.TestCase):

    def testHighestMax(self):
        config = [ 20, 50, 30, 40 ]
        seriesList = [range(max_val) for max_val in config]

        # Expect the test results to be returned in decending order
        expected = [
          [seriesList[1]],
          [seriesList[1], seriesList[3]],
          [seriesList[1], seriesList[3], seriesList[2]],
          [seriesList[1], seriesList[3], seriesList[2], seriesList[0]],  # Test where num_return == len(seriesList)
          [seriesList[1], seriesList[3], seriesList[2], seriesList[0]],  # Test where num_return > len(seriesList)
        ]
        num_return = 1
        for test in expected:
          results = functions.highestMax({}, seriesList, num_return)
          self.assertEquals(test, results)
          num_return += 1

    def testHighestMaxEmptySeriesList(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEquals([], functions.highestMax({}, [], 1))

    def percCount(self, series, perc):
      if perc:
        return int(len(series) * (perc / 100.0))
      else:
        return 0

    def testGetPercentile(self):
      seriesList = [
        ([15, 20, 35, 40, 50], 20),
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
        sorted_series = sorted( series )
        result = functions._getPercentile(series, 30)
        self.assertEquals(expected, result, 'For series index <%s> the 30th percentile ordinal is not %d, but %d ' % (index, expected, result))

    def testNPercentile(self):
        seriesList = []
        config = [
            [15, 35, 20, 40, 50],
            range(1, 101),
            range(1, 201),
            range(1, 301),
            range(0, 100),
            range(0, 200),
            range(0, 300),
            [None, None, None] + range(0, 300),  # Ensure None values in list has no affect.
        ]

        for i, c in enumerate(config):
          seriesList.append( TimeSeries('Test(%d)' % i, 0, 0, 0, c) )

        def TestNPercentile(perc, expected):
          result =  functions.nPercentile({}, seriesList, perc)
          self.assertEquals(expected, result)

        TestNPercentile(30, [ [20], [31], [61], [91], [30], [60], [90], [90] ])
        TestNPercentile(90, [ [50], [91], [181], [271], [90], [180], [270], [270] ])
        TestNPercentile(95, [ [50], [96], [191], [286], [95], [190], [285], [285] ])


if __name__ == '__main__':
    unittest.main()
