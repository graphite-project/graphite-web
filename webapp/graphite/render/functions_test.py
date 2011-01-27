import unittest

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


if __name__ == '__main__':
    unittest.main()
