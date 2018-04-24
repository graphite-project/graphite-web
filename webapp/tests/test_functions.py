import copy
import inspect
import math
import pytz
import six

from datetime import datetime
from fnmatch import fnmatch
from mock import patch, call, MagicMock
from os.path import dirname, join
from six.moves import range

from .base import TestCase
from django.conf import settings

try:
  from django.urls import reverse
except ImportError:  # Django < 1.10
  from django.core.urlresolvers import reverse

from graphite.errors import NormalizeEmptyResultError
from graphite.functions import _SeriesFunctions, loadFunctions
from graphite.render.datalib import TimeSeries
from graphite.render import functions
from graphite.render.evaluator import evaluateTarget
from graphite.render.grammar import grammar
from graphite.tags.utils import TaggedSeries
from graphite.util import json


def return_greater(series, value):
    return [i for i in series if i is not None and i > value]

def return_less(series, value):
    return [i for i in series if i is not None and i < value]


class FunctionsTest(TestCase):

    def setUp(self):
      super(FunctionsTest, self).setUp()
      # Display more diff.
      self.maxDiff = 1024

    #
    # Test safeSum()
    #

    def test_safeSum_None(self):
        with self.assertRaises(TypeError):
            functions.safeSum(None)

    def test_safeSum_empty_list(self):
        self.assertEqual(functions.safeSum([]), None)

    def test_safeSum_all_numbers(self):
        self.assertEqual(functions.safeSum([1,2,3,4]), 10)

    def test_safeSum_all_None(self):
        self.assertEqual(functions.safeSum([None,None,None,None]), None)

    def test_safeSum_mixed(self):
        self.assertEqual(functions.safeSum([10,None,5,None]), 15)

    #
    # Test safeDiff()
    #

    def test_safeDiff_None(self):
        with self.assertRaises(TypeError):
            functions.safeDiff(None)

    def test_safeDiff_empty_list(self):
        self.assertEqual(functions.safeDiff([]), None)

    def test_safeDiff_all_numbers(self):
        self.assertEqual(functions.safeDiff([1,2,3,4]), -8)

    def test_safeDiff_all_None(self):
        self.assertEqual(functions.safeDiff([None,None,None,None]), None)

    def test_safeDiff_mixed(self):
        self.assertEqual(functions.safeDiff([10,None,5,None]), 5)

    #
    # Test safeLen()
    #

    def test_safeLen_None(self):
        with self.assertRaises(TypeError):
            functions.safeLen(None)

    def test_safeLen_empty_list(self):
        self.assertEqual(functions.safeLen([]), 0)

    def test_safeLen_all_numbers(self):
        self.assertEqual(functions.safeLen([1,2,3,4]), 4)

    def test_safeLen_all_None(self):
        self.assertEqual(functions.safeLen([None,None,None,None]), 0)

    def test_safeLen_mixed(self):
        self.assertEqual(functions.safeLen([10,None,5,None]), 2)

    #
    # Test safeDiv()
    #

    def test_safeDiv_None_None(self):
        self.assertEqual(functions.safeDiv(None, None), None)

    def test_safeDiv_5_None(self):
        self.assertEqual(functions.safeDiv(5, None), None)

    def test_safeDiv_5_0(self):
        self.assertEqual(functions.safeDiv(5, 0), None)

    def test_safeDiv_0_10(self):
        self.assertEqual(functions.safeDiv(0,10), 0)

    def test_safeDiv_10_5(self):
        self.assertEqual(functions.safeDiv(10,5), 2)

    #
    # Test safePow()
    #

    def test_safePow_None_None(self):
        self.assertEqual(functions.safePow(None, None), None)

    def test_safePow_5_None(self):
        self.assertEqual(functions.safePow(5, None), None)

    def test_safePow_5_0(self):
        self.assertEqual(functions.safePow(5, 0), 1.0)

    def test_safePow_0_10(self):
        self.assertEqual(functions.safePow(0,10), 0)

    def test_safePow_10_5(self):
        self.assertEqual(functions.safePow(10,5), 100000.0)

    #
    # Test safeMul()
    #

    def test_safeMul_None_None(self):
        self.assertEqual(functions.safeMul(None, None), None)

    def test_safeMul_5_None(self):
        self.assertEqual(functions.safeMul(5, None), None)

    def test_safeMul_5_0(self):
        self.assertEqual(functions.safeMul(5, 0), 0.0)

    def test_safeMul_0_10(self):
        self.assertEqual(functions.safeMul(0,10), 0)

    def test_safeMul_10_5(self):
        self.assertEqual(functions.safeMul(10,5), 50.0)

    #
    # Test safeSubtract()
    #

    def test_safeSubtract_None_None(self):
        self.assertEqual(functions.safeSubtract(None, None), None)

    def test_safeSubtract_5_None(self):
        self.assertEqual(functions.safeSubtract(5, None), None)

    def test_safeSubtract_5_0(self):
        self.assertEqual(functions.safeSubtract(5, 0), 5.0)

    def test_safeSubtract_0_10(self):
        self.assertEqual(functions.safeSubtract(0,10), -10)

    def test_safeSubtract_10_5(self):
        self.assertEqual(functions.safeSubtract(10,5), 5)

    #
    # Test safeAvg()
    #

    def test_safeAvg_None(self):
        with self.assertRaises(TypeError):
            functions.safeAvg(None)

    def test_safeAvg_empty_list(self):
        self.assertEqual(functions.safeAvg([]), None)

    def test_safeAvg_all_numbers(self):
        self.assertEqual(functions.safeAvg([1,2,3,4]), 2.5)

    def test_safeAvg_all_None(self):
        self.assertEqual(functions.safeAvg([None,None,None,None]), None)

    def test_safeAvg_mixed(self):
        self.assertEqual(functions.safeAvg([10,None,5,None]), 7.5)

    #
    # Test safeMedian()
    #

    def test_safeMedian_None(self):
        with self.assertRaises(TypeError):
            functions.safeMedian(None)

    def test_safeMedian_empty_list(self):
        self.assertEqual(functions.safeMedian([]), None)

    def test_safeMedian_all_numbers_odd_len(self):
        self.assertEqual(functions.safeMedian([1,2,3,4,5]), 3)

    def test_safeMedian_all_numbers_even_len(self):
        self.assertAlmostEqual(functions.safeMedian([1,2,3,4]), 2.5)

    def test_safeMedian_all_None(self):
        self.assertEqual(functions.safeMedian([None,None,None,None]), None)

    def test_safeMedian_mixed(self):
        self.assertAlmostEqual(functions.safeMedian([10,None,5,None]), 7.5)

    #
    # Test safeStdDev()
    #

    def test_safeStdDev_None(self):
        with self.assertRaises(TypeError):
            functions.safeStdDev(None)

    def test_safeStdDev_empty_list(self):
        self.assertEqual(functions.safeStdDev([]), None)

    def test_safeStdDev_all_numbers(self):
        self.assertEqual(functions.safeStdDev([1,2,3,4]), 1.118033988749895)

    def test_safeStdDev_all_None(self):
        self.assertEqual(functions.safeStdDev([None,None,None,None]), None)

    def test_safeStdDev_mixed(self):
        self.assertEqual(functions.safeStdDev([10,None,5,None]), 2.5)

    #
    # Test safeLast()
    #

    def test_safeLast_None(self):
        with self.assertRaises(TypeError):
            functions.safeLast(None)

    def test_safeLast_empty_list(self):
        self.assertEqual(functions.safeLast([]), None)

    def test_safeLast_all_numbers(self):
        self.assertEqual(functions.safeLast([1,2,3,4]), 4)

    def test_safeLast_all_None(self):
        self.assertEqual(functions.safeLast([None,None,None,None]), None)

    def test_safeLast_mixed(self):
        self.assertEqual(functions.safeLast([10,None,5,None]), 5)

    #
    # Test safeMin()
    #

    def test_safeMin_None(self):
        with self.assertRaises(TypeError):
            functions.safeMin(None)

    def test_safeMin_empty_list(self):
        self.assertEqual(functions.safeMin([]), None)

    def test_safeMin_all_numbers(self):
        self.assertEqual(functions.safeMin([1,2,3,4]), 1)

    def test_safeMin_all_None(self):
        self.assertEqual(functions.safeMin([None,None,None,None]), None)

    def test_safeMin_mixed(self):
        self.assertEqual(functions.safeMin([10,None,5,None]), 5)

    #
    # Test safeMax()
    #

    def test_safeMax_None(self):
        with self.assertRaises(TypeError):
            functions.safeMax(None)

    def test_safeMax_empty_list(self):
        self.assertEqual(functions.safeMax([]), None)

    def test_safeMax_all_numbers(self):
        self.assertEqual(functions.safeMax([1,2,3,4]), 4)

    def test_safeMax_all_None(self):
        self.assertEqual(functions.safeMax([None,None,None,None]), None)

    def test_safeMax_mixed(self):
        self.assertEqual(functions.safeMax([10,None,5,None]), 10)


    #
    # Test safeAbs()
    #

    def test_safeAbs_None(self):
        self.assertEqual(functions.safeAbs(None), None)

    def test_safeAbs_empty_list(self):
        with self.assertRaises(TypeError):
          functions.safeAbs([])

    def test_safeAbs_pos_number(self):
        self.assertEqual(functions.safeAbs(1), 1)

    def test_safeAbs_neg_numbers(self):
        self.assertEqual(functions.safeAbs(-1), 1)

    def test_safeAbs_zero(self):
        self.assertEqual(functions.safeAbs(0), 0)

    #
    # Test safeMap()
    #

    def test_safeMap_None(self):
        with self.assertRaises(TypeError):
            functions.safeMap(abs, None)

    def test_safeMap_empty_list(self):
        self.assertEqual(functions.safeMap(abs, []), None)

    def test_safeMap_all_numbers(self):
        self.assertEqual(functions.safeMap(abs, [1,2,3,4]), [1,2,3,4])

    def test_safeMap_all_None(self):
        self.assertEqual(functions.safeMap(abs, [None,None,None,None]), None)

    def test_safeMap_mixed(self):
        self.assertEqual(functions.safeMap(abs, [10,None,5,None]), [10,5])

    #
    # Test gcd()
    #

    def test_gcd_None_None(self):
        with self.assertRaises(TypeError):
            functions.gcd(None, None)

    def test_gcd_5_None(self):
        with self.assertRaises(TypeError):
            functions.gcd(5, None)

    def test_gcd_5_0(self):
        self.assertEqual(functions.gcd(5, 0), 5)

    def test_gcd_0_10(self):
        self.assertEqual(functions.gcd(0,10), 10)

    def test_gcd_10_5(self):
        self.assertEqual(functions.gcd(10,5), 5)

    #
    # Test lcm()
    #

    def test_lcm_None_None(self):
        self.assertEqual(functions.lcm(None, None), None)

    def test_lcm_5_None(self):
        with self.assertRaises(TypeError):
            functions.lcm(5, None)

    def test_lcm_5_0(self):
        self.assertEqual(functions.lcm(5, 0), 0)

    def test_lcm_0_10(self):
        self.assertEqual(functions.lcm(0,10), 0)

    def test_lcm_10_5(self):
        self.assertEqual(functions.lcm(10,5), 10)

    #
    # Test xffValues()
    #

    def test_xffValues_None(self):
        self.assertEqual(functions.xffValues(None, 0.5), False)

    def test_xffValues_empty_list(self):
        self.assertEqual(functions.xffValues([], 0.5), False)

    def test_xffValues_all_numbers(self):
        self.assertEqual(functions.xffValues([1,2,3,4], 0.5), True)

    def test_xffValues_all_None(self):
        self.assertEqual(functions.xffValues([None,None,None,None], 0.5), False)

    def test_xffValues_mixed(self):
        self.assertEqual(functions.xffValues([10,None,5,None], 0.5), True)

    #
    # Test xff()
    #

    def test_xff_None(self):
        self.assertEqual(functions.xff(None, None, 0.5), False)

    def test_xff(self):
        self.assertEqual(functions.xff(1, 2, 0.5), True)

    #
    # Test normalize()
    #

    def test_normalize_empty(self):
        with self.assertRaises(NormalizeEmptyResultError):
            functions.normalize([])

    def test_normalize_None_values(self):
        seriesList = []
        seriesList.append(TimeSeries("collectd.test-db{0}.load.value", 0, 5, 1, [None, None, None, None, None]))
        self.assertEqual(functions.normalize([seriesList]), (seriesList, 0, 5, 1))

    def test_normalize_generate_series_list_input(self):
        seriesList = self._generate_series_list()
        self.assertEqual(functions.normalize([seriesList]), (seriesList, 0, 101, 1))

    def test_normalize_different_steps(self):
        seriesList = [
          TimeSeries("test.1", 0, 120 * 31, 120, values=list(range(1, 32))),
          TimeSeries("test.2", 0, 30 * 120, 30, values=list(range(1, 121))),
        ]

        self.assertEqual(seriesList[0].start, 0)
        self.assertEqual(seriesList[0].end, 120 * 31)
        self.assertEqual(seriesList[0].step, 120)
        self.assertEqual(seriesList[0].valuesPerPoint, 1)
        self.assertEqual(len(list(seriesList[0])), 31)

        self.assertEqual(seriesList[1].start, 0)
        self.assertEqual(seriesList[1].end, 30 * 120)
        self.assertEqual(seriesList[1].step, 30)
        self.assertEqual(seriesList[1].valuesPerPoint, 1)
        self.assertEqual(len(list(seriesList[1])), 120)

        # normalize seriesList
        self.assertEqual(functions.normalize([seriesList]), (seriesList, 0, 3720, 120))

        self.assertEqual(seriesList[0].start, 0)
        self.assertEqual(seriesList[0].end, 120 * 31)
        self.assertEqual(seriesList[0].step, 120)
        self.assertEqual(seriesList[0].valuesPerPoint, 1)
        self.assertEqual(len(list(seriesList[0])), 31)

        self.assertEqual(seriesList[1].start, 0)
        self.assertEqual(seriesList[1].end, 30 * 120)
        self.assertEqual(seriesList[1].step, 30)
        self.assertEqual(seriesList[1].valuesPerPoint, 4)
        self.assertEqual(len(list(seriesList[1])), 30)

    #
    # Test matchSeries()
    #
    def test_matchSeries_assert(self):
        seriesList = self._generate_series_list()
        with self.assertRaisesRegexp(AssertionError, 'The number of series in each argument must be the same'):
            functions.matchSeries(seriesList[0], [])

    def test_matchSeries_empty(self):
        results=functions.matchSeries([],[])
        for i, (series1, series2) in enumerate(results):
            self.assertEqual(series1, [])
            self.assertEqual(series2, [])

    def test_matchSeries(self):
        seriesList1 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db3.load.value',
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db4.load.value'
            ],
            end=1,
            data=[
                [3,30,31],
                [1,10,11],
                [2,20,21],
                [4,40,41]
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db4.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value'
            ],
            end=1,
            data=[
                [4,8,12],
                [3,7,11],
                [1,5,9],
                [2,6,10]
            ]
        )

        expectedResult = [
        [
            TimeSeries('collectd.test-db1.load.value',0,1,1,[1,10,11]),
            TimeSeries('collectd.test-db2.load.value',0,1,1,[2,20,21]),
            TimeSeries('collectd.test-db3.load.value',0,1,1,[3,30,31]),
            TimeSeries('collectd.test-db4.load.value',0,1,1,[4,40,41]),
        ],
        [
            TimeSeries('collectd.test-db1.load.value',0,1,1,[1,5,9]),
            TimeSeries('collectd.test-db2.load.value',0,1,1,[2,6,10]),
            TimeSeries('collectd.test-db3.load.value',0,1,1,[3,7,11]),
            TimeSeries('collectd.test-db4.load.value',0,1,1,[4,8,12]),
        ]]
        results = functions.matchSeries(copy.deepcopy(seriesList1), copy.deepcopy(seriesList2))
        for i, (series1, series2) in enumerate(results):
            self.assertEqual(series1, expectedResult[0][i])
            self.assertEqual(series2, expectedResult[1][i])

    #
    # Test formatPathExpressions()
    #

    def test_formatPathExpressions_empty_list(self):
        self.assertEqual(functions.formatPathExpressions([]), '')

    def test_formatPathExpressions(self):
        seriesList = self._generate_series_list()
        self.assertEqual(functions.formatPathExpressions(seriesList), "collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value")

    #
    # test aggregate()
    #

    def test_aggregate_tags(self):
        seriesList = self._gen_series_list_with_data(
            key=['disk.bytes_used;server=server1', 'disk.bytes_free;server=server1'],
            start=0,
            end=3,
            data=[[10, 20, 30], [90, 80, 70]]
        )

        result = functions.aggregate({}, seriesList, 'sum')
        self.assertEqual(result, [
            TimeSeries('sumSeries(disk.bytes_used;server=server1,disk.bytes_free;server=server1)', 0, 3, 1, [100, 100, 100]),
        ])
        self.assertEqual(result[0].tags, {
          'name': 'sumSeries(disk.bytes_used;server=server1,disk.bytes_free;server=server1)',
          'server': 'server1',
          'aggregatedBy': 'sum',
        })

        seriesList = self._gen_series_list_with_data(
            key=['disk.bytes_used;server=server1', 'disk.bytes_used;server=server2'],
            start=0,
            end=3,
            data=[[10, 20, 30], [90, 80, 70]]
        )

        result = functions.aggregate({}, seriesList, 'sum')
        self.assertEqual(result, [
            TimeSeries('sumSeries(disk.bytes_used;server=server1,disk.bytes_used;server=server2)', 0, 3, 1, [100, 100, 100]),
        ])
        self.assertEqual(result[0].tags, {
          'name': 'disk.bytes_used',
          'aggregatedBy': 'sum',
        })

    #
    # Test sumSeries()
    #

    def test_sumSeries_empty(self):
        self.assertEqual(functions.sumSeries({}, []), [])

    def test_sumSeries(self):
        seriesList = self._generate_series_list()
        data = list(range(0,202,2))
        expected_name = "sumSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.sumSeries({}, [seriesList[0], seriesList[1]])
        self.assertEqual(result, expectedList)

    def test_sumSeriesWithWildcards_empty_series_int_position(self):
        self.assertEqual(functions.sumSeriesWithWildcards({}, [], 0), [])

    def test_sumSeriesWithWildcards(self):
        seriesList = self._generate_series_list()
        data = list(range(0,202,2))
        expected_name = "load.value"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.sumSeriesWithWildcards({}, [seriesList[0], seriesList[1]], 0,1)
        self.assertEqual(result, expectedList)

    def test_averageSeriesWithWildcards_empty_series_int_position(self):
        self.assertEqual(functions.averageSeriesWithWildcards({}, [], 0), [])

    def test_averageSeriesWithWildcards(self):
        seriesList = self._generate_series_list()
        data = list(range(0,101,1))
        expected_name = "load.value"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.averageSeriesWithWildcards({}, [seriesList[0], seriesList[1]], 0,1)
        self.assertEqual(result, expectedList)

    def test_multiplySeriesWithWildcards(self):
        seriesList1 = self._gen_series_list_with_data(
            key=[
                'web.host-1.avg-response.value',
                'web.host-2.avg-response.value',
                'web.host-3.avg-response.value',
                'web.host-4.avg-response.value'
            ],
            end=1,
            data=[
                [1,10,11],
                [2,20,21],
                [3,30,31],
                [4,40,41]
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'web.host-4.avg-response.value',
                'web.host-3.avg-response.value',
                'web.host-1.avg-response.value',
                'web.host-2.avg-response.value'
            ],
            end=1,
            data=[
                [4,8,12],
                [3,7,11],
                [1,5,9],
                [2,6,10]
            ]
        )

        expectedResult = [
            TimeSeries('web.host-1',0,1,1,[1,50,99]),
            TimeSeries('web.host-2',0,1,1,[4,120,210]),
            TimeSeries('web.host-3',0,1,1,[9,210,341]),
            TimeSeries('web.host-4',0,1,1,[16,320,492]),
        ]

        results = functions.multiplySeriesWithWildcards({}, copy.deepcopy(seriesList1+seriesList2), 2,3)
        self.assertEqual(results,expectedResult)

    def test_diffSeries(self):
        seriesList = self._generate_series_list()
        data = [0] * 101
        expected_name = "diffSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.diffSeries({}, [seriesList[0], seriesList[1]])
        self.assertEqual(result, expectedList)

    def test_aggregate_median(self):
        seriesList = self._generate_series_list()
        data = list(range(0,101))
        expected_name = "medianSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.aggregate({}, [seriesList[0], seriesList[1]], 'median')
        self.assertEqual(result, expectedList)

    def test_aggregate_stripSeries(self):
        seriesList = self._generate_series_list()
        data = list(range(0,101))
        expected_name = "medianSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.aggregate({}, [seriesList[0], seriesList[1]], 'medianSeries')
        self.assertEqual(result, expectedList)

    def test_aggregate_invalidFunc(self):
        with self.assertRaisesRegexp(Exception, "Unsupported aggregation function: blahSeries"):
            functions.aggregate({}, [], 'blahSeries')

    def test_aggregate_emptySeries(self):
        result = functions.aggregate({}, [], 'sum')
        self.assertEqual(result, [])

    def test_averageSeries(self):
        seriesList = self._generate_series_list()
        data = list(range(0,101))
        expected_name = "averageSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.averageSeries({}, [seriesList[0], seriesList[1]])
        self.assertEqual(result, expectedList)

    def test_stddevSeries(self):
        seriesList = self._generate_series_list()
        data = [0.0] * 101
        expected_name = "stddevSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.stddevSeries({}, [seriesList[0], seriesList[1]])
        self.assertEqual(result, expectedList)

    def test_minSeries(self):
        seriesList = self._generate_series_list()
        data = list(range(0,101))
        expected_name = "minSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.minSeries({}, [seriesList[0], seriesList[1]])
        self.assertEqual(result, expectedList)

    def test_maxSeries(self):
        seriesList = self._generate_series_list()
        data = list(range(0,101))
        expected_name = "maxSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.maxSeries({}, [seriesList[0], seriesList[1]])
        self.assertEqual(result, expectedList)

    def test_rangeOfSeries(self):
        seriesList = self._generate_series_list()
        data = [0.0] * 101
        expected_name = "rangeOfSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.rangeOfSeries({}, [seriesList[0], seriesList[1]])
        self.assertEqual(result, expectedList)

    def test_percentileOfSeries_0th_percentile(self):
        with self.assertRaisesRegexp(ValueError, 'The requested percent is required to be greater than 0'):
            functions.percentileOfSeries({}, [], 0)

    def test_percentileOfSeries_empty_series(self):
        series = []
        expected = []
        result = functions.percentileOfSeries({}, series, 90)
        self.assertEqual(result, expected)

    def test_percentileOfSeries(self):
        seriesList = self._generate_series_list()
        data = list(range(0,101))
        expected_name = "percentileOfSeries(collectd.test-db1.load.value,90)"
        expectedList = [TimeSeries(expected_name, 0, len(data), 1, data)]
        result = functions.percentileOfSeries({}, [seriesList[0], seriesList[1]], 90)
        self.assertEqual(result, expectedList)

    def testGetPercentile_empty_points(self):
        self.assertEqual(functions._getPercentile([], 30), None)

    def testGetPercentile_percentile_0(self):
        seriesList = [
            ([None, None, 15, 20, 35, 40, 50], 15),
            (list(range(100)), 0),
            (list(range(200)), 0),
            (list(range(300)), 0),
            (list(range(1, 101)), 1),
            (list(range(1, 201)), 1),
            (list(range(1, 301)), 1),
            (list(range(0, 102)), 0),
            (list(range(1, 203)), 1),
            (list(range(1, 303)), 1),
        ]
        for index, conf in enumerate(seriesList):
            series, expected = conf
            result = functions._getPercentile(series, 0, True)
            self.assertEqual(expected, result, 'For series index <%s> the 0th percentile ordinal is not %d, but %d ' % (index, expected, result))


    def testGetPercentile_interpolated(self):
        seriesList = [
            ([None, None, 15, 20, 35, 40, 50], 19.0),
            (list(range(100)), 29.3),
            (list(range(200)), 59.3),
            (list(range(300)), 89.3),
            (list(range(1, 101)), 30.3),
            (list(range(1, 201)), 60.3),
            (list(range(1, 301)), 90.3),
            (list(range(0, 102)), 29.9),
            (list(range(1, 203)), 60.9),
            (list(range(1, 303)), 90.9),
        ]
        for index, conf in enumerate(seriesList):
            series, expected = conf
            result = functions._getPercentile(series, 30, True)
            self.assertAlmostEqual(expected, result, 4, 'For series index <%s> the 30th percentile ordinal is not %g, but %g' % (index, expected, result))

    def testGetPercentile(self):
        seriesList = [
            ([None, None, 15, 20, 35, 40, 50], 20),
            (list(range(100)), 30),
            (list(range(200)), 60),
            (list(range(300)), 90),
            (list(range(1, 101)), 31),
            (list(range(1, 201)), 61),
            (list(range(1, 301)), 91),
            (list(range(0, 102)), 30),
            (list(range(1, 203)), 61),
            (list(range(1, 303)), 91),
        ]
        for index, conf in enumerate(seriesList):
            series, expected = conf
            result = functions._getPercentile(series, 30)
            self.assertEqual(expected, result, 'For series index <%s> the 30th percentile ordinal is not %d, but %d ' % (index, expected, result))

    def test_keepLastValue(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value',
                'collectd.test-db6.load.value',
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None],
                [1,None,3,None,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,None],
            ]
        )

        expectedResult = [
            TimeSeries('keepLastValue(collectd.test-db1.load.value)',0,1,1,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
            TimeSeries('keepLastValue(collectd.test-db2.load.value)',0,1,1,[None,2,2,4,4,6,6,8,8,10,10,12,12,14,14,16,16,18,18,20]),
            TimeSeries('keepLastValue(collectd.test-db3.load.value)',0,1,1,[1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None]),
            TimeSeries('keepLastValue(collectd.test-db4.load.value)',0,1,1,[1,2,3,4,4,6,6,6,9,10,11,11,13,None,None,None,None,18,19,20]),
            TimeSeries('keepLastValue(collectd.test-db5.load.value)',0,1,1,[1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,18,18]),
            TimeSeries('keepLastValue(collectd.test-db6.load.value)',0,1,1,[1,1,3,3,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,19]),
        ]
        results = functions.keepLastValue({}, seriesList, 2)
        self.assertEqual(results, expectedResult)

    def test_interpolate(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        expectedResult = [
            TimeSeries('interpolate(collectd.test-db1.load.value)',0,1,1,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
            TimeSeries('interpolate(collectd.test-db2.load.value)',0,1,1,[None,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
            TimeSeries('interpolate(collectd.test-db3.load.value)',0,1,1,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None]),
            TimeSeries('interpolate(collectd.test-db4.load.value)',0,1,1,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
            TimeSeries('interpolate(collectd.test-db5.load.value)',0,1,1,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]),
        ]
        results = functions.interpolate({}, seriesList)
        self.assertEqual(results, expectedResult)

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

    def test_delay(self):
        source = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,list(range(18)) + [None, None]),
        ]
        delay = 2
        expectedList = [
            TimeSeries('delay(collectd.test-db1.load.value,2)',0,1,1,[None, None] + list(range(18))),
        ]
        gotList = functions.delay({}, source, delay)
        self.assertEqual(len(gotList), len(expectedList))
        for got, expected in zip(gotList, expectedList):
            self.assertEqual(got, expected)

    def test_delay_too_many_steps(self):
        source = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,list(range(20))),
        ]
        delay = 25
        expectedList = [
            TimeSeries('delay(collectd.test-db1.load.value,25)',0,1,1,[None]*20),
        ]
        gotList = functions.delay({}, source, delay)
        self.assertEqual(len(gotList), len(expectedList))
        for got, expected in zip(gotList, expectedList):
            self.assertEqual(got, expected)

    def test_delay_negative(self):
        source = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,[None,None] + list(range(2,20))),
        ]
        delay = -2
        expectedList = [
            TimeSeries('delay(collectd.test-db1.load.value,-2)',0,1,1,list(range(2,20)) + [None,None]),
        ]
        gotList = functions.delay({}, source, delay)
        self.assertEqual(len(gotList), len(expectedList))
        for got, expected in zip(gotList, expectedList):
            self.assertEqual(got, expected)

    def test_delay_negative_too_many_steps(self):
        source = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,list(range(20))),
        ]
        delay = -25
        expectedList = [
            TimeSeries('delay(collectd.test-db1.load.value,-25)',0,1,1,[None]*20),
        ]
        gotList = functions.delay({}, source, delay)
        self.assertEqual(len(gotList), len(expectedList))
        for got, expected in zip(gotList, expectedList):
            self.assertEqual(got, expected)

    def test_asPercent_error(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db1.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
            ]
        )


        with self.assertRaisesRegexp(ValueError, "asPercent second argument must be missing, a single digit, reference exactly 1 series or reference the same number of series as the first argument"):
            functions.asPercent({}, seriesList, seriesList2)

    def test_asPercent_no_seriesList2(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        expectedResult = [
            TimeSeries('asPercent(collectd.test-db1.load.value,sumSeries(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value))',0,1,1,[25.0, 20.0, 50.0, 33.33, 100.0, 20.0, 33.33, 25.0, 25.0, 20.0, 25.0, 25.0, 25.0, 25.0, 33.33, 25.0, 33.33, 25.0, 50.0, 33.33]),
            TimeSeries('asPercent(collectd.test-db2.load.value,sumSeries(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value))',0,1,1,[None, 20.0, None, 33.33, None, 20.0, None, 25.0, None, 20.0, None, 25.0, None, 25.0, None, 25.0, None, 25.0, None, 33.33]),
            TimeSeries('asPercent(collectd.test-db3.load.value,sumSeries(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value))',0,1,1,[25.0, 20.0, None, None, None, 20.0, 33.33, 25.0, 25.0, 20.0, 25.0, 25.0, 25.0, 25.0, 33.33, 25.0, 33.33, None, None, None]),
            TimeSeries('asPercent(collectd.test-db4.load.value,sumSeries(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value))',0,1,1,[25.0, 20.0, 50.0, 33.33, None, 20.0, None, None, 25.0, 20.0, 25.0, None, 25.0, None, None, None, None, 25.0, 50.0, 33.33]),
            TimeSeries('asPercent(collectd.test-db5.load.value,sumSeries(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value))',0,1,1,[25.0, 20.0, None, None, None, 20.0, 33.33, 25.0, 25.0, 20.0, 25.0, 25.0, 25.0, 25.0, 33.33, 25.0, 33.33, 25.0, None, None]),
        ]

        result = functions.asPercent({}, seriesList)

        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_asPercent_integer(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        expectedResult = [
            TimeSeries('asPercent(collectd.test-db1.load.value,10)',0,1,1,[10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0, 110.0, 120.0, 130.0, 140.0, 150.0, 160.0, 170.0, 180.0, 190.0, 200.0]),
            TimeSeries('asPercent(collectd.test-db2.load.value,10)',0,1,1,[None, 20.0, None, 40.0, None, 60.0, None, 80.0, None, 100.0, None, 120.0, None, 140.0, None, 160.0, None, 180.0, None, 200.0]),
            TimeSeries('asPercent(collectd.test-db3.load.value,10)',0,1,1,[10.0, 20.0, None, None, None, 60.0, 70.0, 80.0, 90.0, 100.0, 110.0, 120.0, 130.0, 140.0, 150.0, 160.0, 170.0, None, None, None]),
            TimeSeries('asPercent(collectd.test-db4.load.value,10)',0,1,1,[10.0, 20.0, 30.0, 40.0, None, 60.0, None, None, 90.0, 100.0, 110.0, None, 130.0, None, None, None, None, 180.0, 190.0, 200.0]),
            TimeSeries('asPercent(collectd.test-db5.load.value,10)',0,1,1,[10.0, 20.0, None, None, None, 60.0, 70.0, 80.0, 90.0, 100.0, 110.0, 120.0, 130.0, 140.0, 150.0, 160.0, 170.0, 180.0, None, None])
        ]

        result = functions.asPercent({}, seriesList, 10)

        for i, series in enumerate(result):
            for k, v in enumerate(series):
              if type(v) is float:
                series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_asPercent_seriesList2_single(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
            ]
        )


        expectedResult = [
            TimeSeries('asPercent(collectd.test-db1.load.value,collectd.test-db1.load.value)',0,1,1,[100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0]),
            TimeSeries('asPercent(collectd.test-db2.load.value,collectd.test-db1.load.value)',0,1,1,[None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0]),
            TimeSeries('asPercent(collectd.test-db3.load.value,collectd.test-db1.load.value)',0,1,1,[100.0, 100.0, None, None, None, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, None, None, None]),
            TimeSeries('asPercent(collectd.test-db4.load.value,collectd.test-db1.load.value)',0,1,1,[100.0, 100.0, 100.0, 100.0, None, 100.0, None, None, 100.0, 100.0, 100.0, None, 100.0, None, None, None, None, 100.0, 100.0, 100.0]),
            TimeSeries('asPercent(collectd.test-db5.load.value,collectd.test-db1.load.value)',0,1,1,[100.0, 100.0, None, None, None, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, None, None])
        ]

        result = functions.asPercent({}, seriesList, seriesList2)

        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_asPercent_seriesList2_multi(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        expectedResult = [
            TimeSeries('asPercent(collectd.test-db1.load.value,collectd.test-db1.load.value)',0,1,1,[100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0]),
            TimeSeries('asPercent(collectd.test-db2.load.value,collectd.test-db2.load.value)',0,1,1,[None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0]),
            TimeSeries('asPercent(collectd.test-db3.load.value,collectd.test-db3.load.value)',0,1,1,[100.0, 100.0, None, None, None, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, None, None, None]),
            TimeSeries('asPercent(collectd.test-db4.load.value,collectd.test-db4.load.value)',0,1,1,[100.0, 100.0, 100.0, 100.0, None, 100.0, None, None, 100.0, 100.0, 100.0, None, 100.0, None, None, None, None, 100.0, 100.0, 100.0]),
            TimeSeries('asPercent(collectd.test-db5.load.value,collectd.test-db5.load.value)',0,1,1,[100.0, 100.0, None, None, None, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, None, None])
        ]

        result = functions.asPercent({}, seriesList, seriesList2)

        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_asPercent_seriesList2_nodes_total(self):
        self.maxDiff = None

        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value',
                'collectd.test-db1.load.avg',
                'collectd.test-db2.load.avg',
                'collectd.test-db3.load.avg',
                'collectd.test-db4.load.avg',
                'collectd.test-db6.load.avg',
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None],
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None],
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.total',
                'collectd.test-db2.load.total',
                'collectd.test-db3.load.total',
                'collectd.test-db4.load.total',
                'collectd.test-db5.load.total',
                'collectd.test-db5.load.total2',
                'collectd.test-db7.load.total',
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None],
            ]
        )

        expectedResult = [
            TimeSeries('asPercent(collectd.test-db1.load.value,collectd.test-db1.load.total)',0,1,1,[100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0]),
            TimeSeries('asPercent(collectd.test-db1.load.avg,collectd.test-db1.load.total)',0,1,1,[100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0]),
            TimeSeries('asPercent(collectd.test-db2.load.value,collectd.test-db2.load.total)',0,1,1,[None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0]),
            TimeSeries('asPercent(collectd.test-db2.load.avg,collectd.test-db2.load.total)',0,1,1,[None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0, None, 100.0]),
            TimeSeries('asPercent(collectd.test-db3.load.value,collectd.test-db3.load.total)',0,1,1,[100.0, 100.0, None, None, None, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, None, None, None]),
            TimeSeries('asPercent(collectd.test-db3.load.avg,collectd.test-db3.load.total)',0,1,1,[100.0, 100.0, None, None, None, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, None, None, None]),
            TimeSeries('asPercent(collectd.test-db4.load.value,collectd.test-db4.load.total)',0,1,1,[100.0, 100.0, 100.0, 100.0, None, 100.0, None, None, 100.0, 100.0, 100.0, None, 100.0, None, None, None, None, 100.0, 100.0, 100.0]),
            TimeSeries('asPercent(collectd.test-db4.load.avg,collectd.test-db4.load.total)',0,1,1,[100.0, 100.0, 100.0, 100.0, None, 100.0, None, None, 100.0, 100.0, 100.0, None, 100.0, None, None, None, None, 100.0, 100.0, 100.0]),
            TimeSeries('asPercent(collectd.test-db5.load.value,sumSeries(collectd.test-db5.load.total,collectd.test-db5.load.total2))',0,1,1,[50.0, 50.0, None, None, None, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, None, None]),
            TimeSeries('asPercent(collectd.test-db6.load.avg,MISSING)',0,1,1,[None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None]),
            TimeSeries('asPercent(MISSING,collectd.test-db7.load.total)',0,1,1,[None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None]),
        ]

        result = functions.asPercent({}, seriesList, seriesList2, 1)

        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_asPercent_seriesList2_nodes_no_total(self):
        self.maxDiff = None

        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value',
                'collectd.test-db1.load.avg',
                'collectd.test-db2.load.avg',
                'collectd.test-db3.load.avg',
                'collectd.test-db4.load.avg',
                'collectd.test-db6.load.avg',
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None],
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None],
            ]
        )

        expectedResult = [
            TimeSeries('asPercent(collectd.test-db1.load.value,sumSeries(collectd.test-db1.load.value,collectd.test-db1.load.avg))',0,1,1,[50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0]),
            TimeSeries('asPercent(collectd.test-db1.load.avg,sumSeries(collectd.test-db1.load.value,collectd.test-db1.load.avg))',0,1,1,[50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0]),
            TimeSeries('asPercent(collectd.test-db2.load.value,sumSeries(collectd.test-db2.load.value,collectd.test-db2.load.avg))',0,1,1,[None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0]),
            TimeSeries('asPercent(collectd.test-db2.load.avg,sumSeries(collectd.test-db2.load.value,collectd.test-db2.load.avg))',0,1,1,[None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0, None, 50.0]),
            TimeSeries('asPercent(collectd.test-db3.load.value,sumSeries(collectd.test-db3.load.value,collectd.test-db3.load.avg))',0,1,1,[50.0, 50.0, None, None, None, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, None, None, None]),
            TimeSeries('asPercent(collectd.test-db3.load.avg,sumSeries(collectd.test-db3.load.value,collectd.test-db3.load.avg))',0,1,1,[50.0, 50.0, None, None, None, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, 50.0, None, None, None]),
            TimeSeries('asPercent(collectd.test-db4.load.value,sumSeries(collectd.test-db4.load.value,collectd.test-db4.load.avg))',0,1,1,[50.0, 50.0, 50.0, 50.0, None, 50.0, None, None, 50.0, 50.0, 50.0, None, 50.0, None, None, None, None, 50.0, 50.0, 50.0]),
            TimeSeries('asPercent(collectd.test-db4.load.avg,sumSeries(collectd.test-db4.load.value,collectd.test-db4.load.avg))',0,1,1,[50.0, 50.0, 50.0, 50.0, None, 50.0, None, None, 50.0, 50.0, 50.0, None, 50.0, None, None, None, None, 50.0, 50.0, 50.0]),
            TimeSeries('asPercent(collectd.test-db5.load.value,collectd.test-db5.load.value)',0,1,1,[100.0, 100.0, None, None, None, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, None, None]),
            TimeSeries('asPercent(collectd.test-db6.load.avg,collectd.test-db6.load.avg)',0,1,1,[100.0, 100.0, None, None, None, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, None, None]),
        ]

        result = functions.asPercent({}, seriesList, None, 1)

        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_asPercent_seriesList2_nodes_invalid_total(self):
        self.maxDiff = None

        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
            ]
        )

        with self.assertRaises(ValueError):
            functions.asPercent({}, seriesList, 1000, 1)

    def test_divideSeries_error(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db1.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
            ]
        )

        with self.assertRaisesRegexp(ValueError, "divideSeries second argument must reference exactly 1 series \(got 2\)"):
            functions.divideSeries({}, seriesList, seriesList2)


    def test_divideSeries_seriesList2_single(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        seriesList2 = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
        ]
        expectedResult = [
            TimeSeries('divideSeries(collectd.test-db1.load.value,collectd.test-db1.load.value)',0,1,1,[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
            TimeSeries('divideSeries(collectd.test-db2.load.value,collectd.test-db1.load.value)',0,1,1,[None, 1.0, None, 1.0, None, 1.0, None, 1.0, None, 1.0, None, 1.0, None, 1.0, None, 1.0, None, 1.0, None, 1.0]),
            TimeSeries('divideSeries(collectd.test-db3.load.value,collectd.test-db1.load.value)',0,1,1,[1.0, 1.0, None, None, None, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, None, None, None]),
            TimeSeries('divideSeries(collectd.test-db4.load.value,collectd.test-db1.load.value)',0,1,1,[1.0, 1.0, 1.0, 1.0, None, 1.0, None, None, 1.0, 1.0, 1.0, None, 1.0, None, None, None, None, 1.0, 1.0, 1.0]),
            TimeSeries('divideSeries(collectd.test-db5.load.value,collectd.test-db1.load.value)',0,1,1,[1.0, 1.0, None, None, None, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, None, None])
        ]

        result = functions.divideSeries({}, seriesList, seriesList2)

        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_divideSeriesLists(self):
        seriesList1 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value1',
                'collectd.test-db2.load.value1'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value2',
                'collectd.test-db2.load.value2'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,19,18,None,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1],
            ]
        )

        expectedResult = [
            TimeSeries('divideSeries(collectd.test-db1.load.value1,collectd.test-db1.load.value2)',0,1,1,[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
            TimeSeries('divideSeries(collectd.test-db2.load.value1,collectd.test-db2.load.value2)',0,1,1,[None, 0.11, None, None, None, 0.4, None, 0.62, None, 0.91, None, 1.33, None, 2.0, None, 3.2, None, 6.0, None, 20.0]),
        ]

        result = functions.divideSeriesLists({}, seriesList1, seriesList2)

        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_multiplySeries_single(self):
        seriesList = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
        ]
        self.assertEqual(functions.multiplySeries({}, seriesList), seriesList)

    def test_multiplySeries(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        expectedResult = [
            TimeSeries('multiplySeries(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value)',0,1,1,[None, 32.0, None, None, None, 7776.0, None, None, None, 100000.0, None, None, None, None, None, None, None, None, None, None]),
        ]

        result = functions.multiplySeries({}, seriesList)
        self.assertEqual(result, expectedResult)

    def _verify_series_consolidationFunc(self, seriesList, value):
        """
        Verify the consolidationFunc is set to the specified value
        """
        for series in seriesList:
            self.assertEqual(series.consolidationFunc, value)

    def test_cumulative(self):
        seriesList = self._generate_series_list()
        self._verify_series_consolidationFunc(seriesList, "average")
        results = functions.cumulative({}, seriesList)
        self._verify_series_consolidationFunc(results, "sum")

    def test_consolidateBy(self):
        seriesList = self._generate_series_list()
        self._verify_series_consolidationFunc(seriesList, "average")
        avail_funcs = ['sum', 'average', 'min', 'max', 'first', 'last']
        for func in avail_funcs:
            results = functions.consolidateBy({}, seriesList, func)
            self._verify_series_consolidationFunc(results, func)

    def _verify_series_xFilesFactor(self, seriesList, value):
        """
        Verify the consolidationFunc is set to the specified value
        """
        for series in seriesList:
            self.assertEqual(series.xFilesFactor, value)

    def test_xFilesFactor(self):
        seriesList = self._generate_series_list()
        self._verify_series_xFilesFactor(seriesList, 0)
        requestContext = {}
        results = functions.setXFilesFactor(requestContext, seriesList, 0.5)
        self._verify_series_xFilesFactor(results, 0.5)
        self.assertEqual(requestContext['xFilesFactor'], 0.5)

    def test_weightedAverage(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        expectedResult = [
            TimeSeries('weightedAverage(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value, collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value, 1)',0,1,1,[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
        ]

        result = functions.weightedAverage({}, seriesList, seriesList2, 1)
        self.assertEqual(result, expectedResult)

    def test_weightedAverage_mismatched_series(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [None,2,None,4,None,6,None,8,None,10,None,12,None,14,None,16,None,18,None,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db5.load.value'
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,None,None,None],
                [1,2,3,4,None,6,None,None,9,10,11,None,13,None,None,None,None,18,19,20],
                [1,2,None,None,None,6,7,8,9,10,11,12,13,14,15,16,17,18,None,None]
            ]
        )

        expectedResult = [
            TimeSeries('weightedAverage(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db5.load.value, collectd.test-db1.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value,collectd.test-db5.load.value, 1)',0,1,1,[0.75,1.5,1.5,2.0,5.0,4.5,7.0,8.0,6.75,7.5,8.25,12.0,9.75,14.0,15.0,16.0,17.0,12.0,9.5,10.0]),
        ]

        result = functions.weightedAverage({}, seriesList, seriesList2, 1)
        self.assertEqual(result, expectedResult)

    def test_weightedAverage_empty_productlist(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
            ]
        )

        seriesList2 = self._gen_series_list_with_data(
            key=[
                'collectd.test-db2.load.value',
            ],
            end=1,
            data=[
                [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
            ]
        )

        expectedResult = []

        result = functions.weightedAverage({}, seriesList, seriesList2, 1)
        self.assertEqual(result, expectedResult)

    def test_scaleToSeconds(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,2,None,4,None,6,None,8,None,10],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('scaleToSeconds(collectd.test-db1.load.value,30)',0,600,60,[0.5,1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,5.0]),
            TimeSeries('scaleToSeconds(collectd.test-db2.load.value,30)',0,600,60,[None,1.0,None,2.0,None,3.0,None,4.0,None,5.0]),
            TimeSeries('scaleToSeconds(collectd.test-db3.load.value,30)',0,600,60,[0.5,1.0,None,None,None,3.0,3.5,4.0,4.5,5.0]),
            TimeSeries('scaleToSeconds(collectd.test-db4.load.value,30)',0,600,60,[0.5,1.0,1.5,2.0,2.5,3.0,3.5,4.0,4.5,None]),
        ]

        result = functions.scaleToSeconds({}, seriesList, 30)
        self.assertEqual(result, expectedResult)

    def test_absolute(self):
        seriesList = self._gen_series_list_with_data(key='collectd.test-db1.load.value',start=0,end=21,step=1,data=[-10,-9,-8,-7,None,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10])
        expected = [
            TimeSeries('absolute(collectd.test-db1.load.value)',0,21,1,[10,9,8,7,None,5,4,3,2,1,0,1,2,3,4,5,6,7,8,9,10]),
        ]
        self.assertEqual(functions.absolute({}, seriesList), expected)

    def test_offset(self):
        seriesList = self._gen_series_list_with_data(key='collectd.test-db1.load.value',start=0,end=21,step=1,data=[-10,-9,-8,-7,None,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10])
        expected = [
            TimeSeries('offset(collectd.test-db1.load.value,10)',0,21,1,[0,1,2,3,None,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
        ]
        self.assertEqual(functions.offset({}, seriesList, 10), expected)

    def test_offsetToZero(self):
        seriesList = self._gen_series_list_with_data(key='collectd.test-db1.load.value',start=0,end=21,step=1,data=[-10,-9,-8,-7,None,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10])

        expected = [
            TimeSeries('offsetToZero(collectd.test-db1.load.value)',0,21,1,[0,1,2,3,None,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),
        ]
        self.assertEqual(functions.offsetToZero({}, seriesList), expected)

    def test_derivative(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[None, 1, 2, 3, 4, 5, None, 6, 7, 8])
        expected = [TimeSeries('derivative(test)', 0, 600, 60, [None, None, 1, 1, 1, 1, None, None, 1, 1])]
        result = functions.derivative({}, seriesList)
        self.assertEqual(expected, result, 'derivative result incorrect')

    def test_nonNegativeDerivative(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[None, 1, 2, 3, 4, 5, None, 3, 2, 1])
        expected = [TimeSeries('nonNegativeDerivative(test)', 0, 600, 60, [None, None, 1, 1, 1, 1, None, None, None, None])]
        result = functions.nonNegativeDerivative({}, seriesList)
        self.assertEqual(expected, result, 'nonNegativeDerivative result incorrect')

    def test_nonNegativeDerivative_max(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[0, 1, 2, 3, 4, 5, 0, 1, 2, 3])
        expected = [TimeSeries('nonNegativeDerivative(test)', 0, 600, 60, [None, 1, 1, 1, 1, 1, 1, 1, 1, 1])]
        result = functions.nonNegativeDerivative({}, seriesList,5)
        self.assertEqual(expected, result, 'nonNegativeDerivative result incorrect')

    def test_perSecond(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[0, 120, 240, 480, 960, 1920, 3840, 7680, 15360, 60 ** 256 + 15360 ])
        expected = [TimeSeries('perSecond(test)', 0, 600, 60, [None, 2, 2, 4, 8, 16, 32, 64, 128, 60 ** 255])]
        result = functions.perSecond({}, seriesList)
        self.assertEqual(list(expected[0]), list(result[0]))
        self.assertEqual(expected, result)

        # verify against scaleToSeconds(nonNegativeDerivative(<series>, <maxValue>), 1)
        result = functions.scaleToSeconds({}, functions.nonNegativeDerivative({}, seriesList), 1)
        self.assertEqual(list(expected[0]), list(result[0]))

    def test_perSecond_float(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[0, 90, 186, 291, 411, 561, 747, 136, 336, 60**256 + 336])
        expected = [TimeSeries('perSecond(test)', 0, 600, 60, [None, 1.5, 1.6, 1.75, 2, 2.5, 3.1, 6.5, 3.333333, None])]
        result = functions.perSecond({}, seriesList, maxValue=1000)
        self.assertEqual(list(expected[0]), list(result[0]))
        self.assertEqual(expected, result)

        # verify against scaleToSeconds(nonNegativeDerivative(<series>, <maxValue>), 1)
        result = functions.scaleToSeconds({}, functions.nonNegativeDerivative({}, seriesList, maxValue=1000), 1)
        self.assertEqual(list(expected[0]), list(result[0]))

    def test_perSecond_nones(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[0, 60, None, 180, None, None, 360, 420, None, 540])
        expected = [TimeSeries('perSecond(test)', 0, 600, 60, [None, 1, None, None, None, None, None, 1, None, None])]
        result = functions.perSecond({}, seriesList)
        self.assertEqual(list(expected[0]), list(result[0]))
        self.assertEqual(expected, result)

        # verify against scaleToSeconds(nonNegativeDerivative(<series>, <maxValue>), 1)
        result = functions.scaleToSeconds({}, functions.nonNegativeDerivative({}, seriesList), 1)
        self.assertEqual(list(expected[0]), list(result[0]))

    def test_perSecond_max(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[0, 120, 240, 480, 960, 900, 120, 240, 119, 479])
        expected = [TimeSeries('perSecond(test)', 0, 600, 60, [None, 2, 2, 4, None, None, None, 2, 6, 6])]
        result = functions.perSecond({}, seriesList, 480)
        self.assertEqual(list(expected[0]), list(result[0]))
        self.assertEqual(expected, result)

        # verify against scaleToSeconds(nonNegativeDerivative(<series>, <maxValue>), 1)
        result = functions.scaleToSeconds({}, functions.nonNegativeDerivative({}, seriesList, 480), 1)
        self.assertEqual(list(expected[0]), list(result[0]))

    def test_integral(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[None, 1, 2, 3, 4, 5, None, 6, 7, 8])
        expected = [TimeSeries('integral(test)', 0, 600, 60, [None, 1, 3, 6, 10, 15, None, 21, 28, 36])]
        result = functions.integral({}, seriesList)
        self.assertEqual(expected, result, 'integral result incorrect')

    def test_integralByInterval(self):
        seriesList = self._gen_series_list_with_data(key='test',start=0,end=600,step=60,data=[None, 1, 2, 3, 4, 5, None, 6, 7, 8])
        expected = [TimeSeries("integralByInterval(test,'2min')", 0, 600, 60, [0, 1, 2, 5, 4, 9, 0, 6, 7, 15])]
        result = functions.integralByInterval({'startTime' : datetime(1970,1,1)}, seriesList, '2min')
        self.assertEqual(expected, result, 'integralByInterval result incorrect %s %s' %(result, expected))

    def test_stacked(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,2,None,4,None,6,None,8,None,10],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('stacked(collectd.test-db1.load.value)',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('stacked(collectd.test-db2.load.value)',0,600,60,[None,4,None,8,None,12,None,16,None,20]),
            TimeSeries('stacked(collectd.test-db3.load.value)',0,600,60,[2,6,None,None,None,18,14,24,18,30]),
            TimeSeries('stacked(collectd.test-db4.load.value)',0,600,60,[3,8,6,12,10,24,21,32,27,None]),
        ]
        for series in expectedResult:
            series.options = {'stacked': True}

        requestContext = {}
        result = functions.stacked(requestContext, seriesList)

        self.assertEqual(result, expectedResult)
        self.assertEqual(requestContext, {'totalStack': {'__DEFAULT__': [3,8,6,12,10,24,21,32,27,30]}})

    def test_stacked_with_name(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,2,None,4,None,6,None,8,None,10],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,4,None,8,None,12,None,16,None,20]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[2,6,None,None,None,18,14,24,18,30]),
            TimeSeries('collectd.test-db4.load.value',0,600,60,[3,8,6,12,10,24,21,32,27,None]),
        ]
        for series in expectedResult:
            series.options = {'stacked': True}

        requestContext = {'totalStack': {'my_fun_stack': [0,0,0,0,0,0,0,0,0,0]}}
        result = functions.stacked(requestContext, seriesList, 'my_fun_stack')

        self.assertEqual(result, expectedResult)
        self.assertEqual(requestContext, {'totalStack': {'my_fun_stack': [3,8,6,12,10,24,21,32,27,30]}})

    def test_areaBetween(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,10]
            ]
        )

        expectedResult = [
            TimeSeries('areaBetween(collectd.test-db2.load.value)',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('areaBetween(collectd.test-db2.load.value)',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
        ]
        expectedResult[0].options = {'stacked': True, 'invisible': True}
        expectedResult[1].options = {'stacked': True}

        requestContext = {}
        result = functions.areaBetween(requestContext, seriesList)

        self.assertEqual(result, expectedResult)

    def test_cactiStyle(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value Current:10.00    Max:10.00    Min:1.00    ',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db2.load.value Current:nan      Max:nan      Min:nan     ',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value Current:10.00    Max:10.00    Min:1.00    ',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('collectd.test-db4.load.value Current:9.00     Max:9.00     Min:1.00    ',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]
        for series in expectedResult:
            series.options = {}

        requestContext = {}
        result = functions.cactiStyle(requestContext, seriesList)
        self.assertEqual(result, expectedResult)

    def test_cactiStyle_units(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value Current:10.00 b    Max:10.00 b    Min:1.00 b    ',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db2.load.value Current:nan        Max:nan        Min:nan       ',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value Current:10.00 b    Max:10.00 b    Min:1.00 b    ',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('collectd.test-db4.load.value Current:9.00 b     Max:9.00 b     Min:1.00 b    ',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]
        for series in expectedResult:
            series.options = {}

        requestContext = {}
        result = functions.cactiStyle(requestContext, seriesList, units="b")
        self.assertEqual(result, expectedResult)


    def test_cactiStyle_emptyList(self):
        result = functions.cactiStyle({}, [])
        self.assertEqual(result, [])

    def test_cactiStyle_binary(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value Current:10.00    Max:10.00    Min:1.00    ',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db2.load.value Current:nan      Max:nan      Min:nan     ',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value Current:10.00    Max:10.00    Min:1.00    ',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('collectd.test-db4.load.value Current:9.00     Max:9.00     Min:1.00    ',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]
        for series in expectedResult:
            series.options = {}

        requestContext = {}
        result = functions.cactiStyle(requestContext, seriesList, "binary")
        self.assertEqual(result, expectedResult)

    def test_cactiStyle_binary_units(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value Current:10.00 b    Max:10.00 b    Min:1.00 b    ',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db2.load.value Current:nan        Max:nan        Min:nan       ',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value Current:10.00 b    Max:10.00 b    Min:1.00 b    ',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('collectd.test-db4.load.value Current:9.00 b     Max:9.00 b     Min:1.00 b    ',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]
        for series in expectedResult:
            series.options = {}

        requestContext = {}
        result = functions.cactiStyle(requestContext, seriesList, "binary", "b")
        self.assertEqual(result, expectedResult)


    def test_n_percentile(self):
        config = [
            [15, 35, 20, 40, 50],
            list(range(1, 101)),
            list(range(1, 201)),
            list(range(1, 301)),
            list(range(0, 100)),
            list(range(0, 200)),
            list(range(0, 300)),
            # Ensure None values in list has no effect.
            [None, None, None] + list(range(0, 300)),
        ]

        def n_percentile(perc, expect):
            seriesList = []
            expected = []
            for i, c in enumerate(config):
                seriesList.append(TimeSeries('Test(%d)' % i, 0, len(c), 1, c))
                expected.append(TimeSeries('nPercentile(Test(%d), %d)' % (i, perc), 0, len(c), 1, expect[i]*len(c)))
            result = functions.nPercentile({}, seriesList, perc)
            self.assertEqual(expected, result)

        n_percentile(30, [[20], [31], [61], [91], [30], [60], [90], [90]])
        n_percentile(90, [[50], [91], [181], [271], [90], [180], [270], [270]])
        n_percentile(95, [[50], [96], [191], [286], [95], [190], [285], [285]])

    def test_averageOutsidePercentile_30(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=100,
            data=[
                [7]*100,
                [5]*100,
                [10]*100,
                [1]*100
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
        ]

        result = functions.averageOutsidePercentile({}, seriesList, 30)
        self.assertEqual(result, expectedResult)

    def test_averageOutsidePercentile_70(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=100,
            data=[
                [7]*100,
                [5]*100,
                [10]*100,
                [1]*100
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
        ]

        result = functions.averageOutsidePercentile({}, seriesList, 70)
        self.assertEqual(result, expectedResult)

    def test_removeBetweenPercentile_30(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=100,
            data=[
                [7]*100,
                [5]*100,
                [10]*100,
                [1]*100
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
        ]

        result = functions.removeBetweenPercentile({}, seriesList, 30)
        self.assertEqual(result, expectedResult)

    def test_removeBetweenPercentile_70(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value'
            ],
            end=100,
            data=[
                [7]*100,
                [5]*100,
                [10]*100,
                [1]*100
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
        ]

        result = functions.removeBetweenPercentile({}, seriesList, 70)
        self.assertEqual(result, expectedResult)

    def test_sortByName(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db3.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db1.load.value'
            ],
            end=100,
            data=[
                [10]*100,
                [5]*100,
                [1]*100,
                [7]*100
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,100,1,[7]*100),
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
        ]

        result = functions.sortByName({}, seriesList)
        self.assertEqual(result, expectedResult)

    def test_sortByName_natural(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db3.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db1.load.value'
            ],
            end=100,
            data=[
                [10]*100,
                [5]*100,
                [1]*100,
                [7]*100
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,100,1,[7]*100),
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
        ]

        result = functions.sortByName({}, seriesList, True)
        self.assertEqual(result, expectedResult)

    def test_sorting_by_total(self):
        seriesList = []
        config = [[1000, 100, 10, 0], [1000, 100, 10, 1]]
        for i, c in enumerate(config):
            seriesList.append(TimeSeries('Test(%d)' % i, 0, 0, 0, c))

        self.assertEqual(1110, functions.safeSum(seriesList[0]))

        result = functions.sortByTotal({}, seriesList)

        self.assertEqual(1111, functions.safeSum(result[0]))
        self.assertEqual(1110, functions.safeSum(result[1]))

    def test_sortByMaxima(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db3.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db1.load.value'
            ],
            end=100,
            data=[
                [10]*100,
                [5]*100,
                [1]*100,
                [7]*100
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db1.load.value',0,100,1,[7]*100),
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
        ]

        result = functions.sortByMaxima({}, seriesList)
        self.assertEqual(result, expectedResult)

    def test_sortByMinima(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db3.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db4.load.value',
                'collectd.test-db1.load.value'
            ],
            end=100,
            data=[
                [10]*100,
                [5]*100,
                [1]*100,
                [7]*100
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db1.load.value',0,100,1,[7]*100),
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
        ]

        result = functions.sortByMinima({}, seriesList)
        self.assertEqual(result, expectedResult)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_useSeriesAbove(self):
        seriesList = self._gen_series_list_with_data(
            key=['test.foo'],
            start=0,
            end=600,
            step=60,
            data=[10,10,10,3,10,5,6,10,7,10,10]
        )

        def mock_data_fetcher(reqCtx, path_expression):
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            inputSeries = TimeSeries('test.value',600,1200,60,[0,1,2,3,4,5,6,7,8,9])
            inputSeries.pathExpression = 'test.value'
            results = functions.useSeriesAbove(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                [ inputSeries ],
                8,
                "value",
                "foo"
            )

        expectedResults = [
            TimeSeries('test.foo',0,600,60,[10, 10, 10, 3, 10, 5, 6, 10, 7, 10, 10])
        ]

        self.assertEqual(results, expectedResults)

    def test_useSeriesAbove_no_match(self):
        inputSeries = TimeSeries('test.value',600,1200,60,[0,1,2,3,4,5,6,7,8,9])
        inputSeries.pathExpression = 'test.value'
        results = functions.useSeriesAbove(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            [ inputSeries ],
            20,
            "value",
            "foo"
        )

        expectedResults = []

        self.assertEqual(results, expectedResults)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_useSeriesAbove_fetch_returns_None(self):
        def mock_data_fetcher(reqCtx, path_expression):
            return []

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            inputSeries = TimeSeries('test.value',600,1200,60,[0,1,2,3,4,5,6,7,8,9])
            inputSeries.pathExpression = 'test.value'
            results = functions.useSeriesAbove(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                [ inputSeries ],
                8,
                "value",
                "foo"
            )

        expectedResults = []

        self.assertEqual(results, expectedResults)

    def test_fallbackSeries(self):
        inputSeries = self._gen_series_list_with_data(
            key=['test.foo', 'test.bar'],
            start=0,
            end=600,
            step=60,
            data=[[10,10,10,3,10,5,6,10,7,10,10], [0,1,2,3,4,5,6,7,8,9]]
        )

        results = functions.fallbackSeries(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            [ inputSeries[0] ],
            [ inputSeries[1] ]
        )

        self.assertEqual(results, [inputSeries[0]])

    def test_fallbackSeries_empty(self):
        inputSeries = self._gen_series_list_with_data(
            key=['test.foo', 'test.bar'],
            start=0,
            end=600,
            step=60,
            data=[[10,10,10,3,10,5,6,10,7,10,10], [0,1,2,3,4,5,6,7,8,9]]
        )

        results = functions.fallbackSeries(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            [ ],
            [ inputSeries[1] ]
        )

        self.assertEqual(results, [inputSeries[1]])

    def test_mostDeviant(self):
        inputSeries = self._gen_series_list_with_data(
            key=['test.foo', 'test.bar', 'test.baz', 'test.blah'],
            start=0,
            end=600,
            step=60,
            data=[[10,10,10,3,10,5,6,10,7,10,10], [0,1,2,3,4,5,6,7,8,9], [1,1,1,1,1,1,1,1,1,1], [5,5,5,5,5,5,5,5,5,5]]
        )

        results = functions.mostDeviant(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            inputSeries,
            2
        )

        self.assertEqual(results, [inputSeries[1], inputSeries[0]])

    def test_stdev(self):
        inputSeries = self._gen_series_list_with_data(
            key=['test.foo'],
            start=0,
            end=600,
            step=60,
            data=[0,1,2,3,4,5,6,7,8,9]
        )

        results = functions.stdev(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            inputSeries,
            2
        )

        expectedResults = [
            TimeSeries('stdev(test.foo,2)',0,600,60,[0.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
        ]

        self.assertEqual(results, expectedResults)

    def test_stdev_Nones(self):
        inputSeries = self._gen_series_list_with_data(
            key=['test.foo'],
            start=0,
            end=600,
            step=60,
            data=[None]*10
        )

        results = functions.stdev(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            inputSeries,
            2
        )

        expectedResults = [
            TimeSeries('stdev(test.foo,2)',0,600,60,[None, None, None, None, None, None, None, None, None, None])
        ]

        self.assertEqual(results, expectedResults)

    def test_sinFunction(self):

        results = functions.sinFunction(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            "sine test",
            10
        )

        expectedResults = [
            TimeSeries('sine test',600,1200,60,[0.4418244833187319, 2.624330297809573, -5.440716964379951, 7.73928862147125, -9.301280920157128, 9.978032744219705, -9.705134889047493, 8.508560145797974, -6.502191365954637, 3.876982770359131])
        ]

        self.assertEqual(results, expectedResults)

    def test_check_empty_lists(self):
        seriesList = []
        config = [[1000, 100, 10, 0], [2000, 200, None, None], [None, None, None, None]]
        for i, c in enumerate(config):
            seriesList.append(TimeSeries('Test(%d)' % i, 0, 3, 1, c))

        self.assertTrue(functions.xffValues(seriesList[0], 0))
        self.assertTrue(functions.xffValues(seriesList[0], 0.25))
        self.assertTrue(functions.xffValues(seriesList[0], 0.5))
        self.assertTrue(functions.xffValues(seriesList[0], 0.75))
        self.assertTrue(functions.xffValues(seriesList[0], 1))

        self.assertTrue(functions.xffValues(seriesList[1], 0))
        self.assertTrue(functions.xffValues(seriesList[1], 0.25))
        self.assertTrue(functions.xffValues(seriesList[1], 0.5))
        self.assertFalse(functions.xffValues(seriesList[1], 0.75))
        self.assertFalse(functions.xffValues(seriesList[1], 1))

        self.assertFalse(functions.xffValues(seriesList[2], 0))
        self.assertFalse(functions.xffValues(seriesList[2], 0.25))
        self.assertFalse(functions.xffValues(seriesList[2], 0.5))
        self.assertFalse(functions.xffValues(seriesList[2], 0.75))
        self.assertFalse(functions.xffValues(seriesList[2], 1))

        result = functions.removeEmptySeries({}, seriesList)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0][0], 1000)
        self.assertEqual(result[1][0], 2000)

        result = functions.removeEmptySeries({}, seriesList, 0)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0][0], 1000)
        self.assertEqual(result[1][0], 2000)

        result = functions.removeEmptySeries({}, seriesList, 0.25)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0][0], 1000)
        self.assertEqual(result[1][0], 2000)

        result = functions.removeEmptySeries({}, seriesList, 0.5)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0][0], 1000)
        self.assertEqual(result[1][0], 2000)

        result = functions.removeEmptySeries({}, seriesList, 0.75)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0][0], 1000)

        result = functions.removeEmptySeries({}, seriesList, 1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0][0], 1000)


    def test_unique(self):
        seriesList = [
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
            TimeSeries('collectd.test-db2.load.value',0,100,1,[7]*100),
        ]

        expectedResult = [
            TimeSeries('collectd.test-db3.load.value',0,100,1,[10]*100),
            TimeSeries('collectd.test-db2.load.value',0,100,1,[5]*100),
            TimeSeries('collectd.test-db4.load.value',0,100,1,[1]*100),
        ]

        result = functions.unique({}, seriesList)
        self.assertEqual(result, expectedResult)

    def test_randomWalkFunction(self):
        # mock randomWalk's random.random() call to always return 1
        def not_random():
            return 1

        with patch('graphite.render.functions.random.random', not_random):
            results = functions.randomWalkFunction(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                "The.time.series"
            )

        expectedResults = [
            TimeSeries('The.time.series',600,1200,60,[0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5])
        ]

        self.assertEqual(results, expectedResults)

    def test_remove_above_percentile(self):
        seriesList = self._generate_series_list()
        percent = 50
        results = functions.removeAbovePercentile({}, seriesList, percent)
        for i, result in enumerate(results):
            self.assertEqual(return_greater(result, percent), [])
            expected_name = "removeAbovePercentile(collectd.test-db{0}.load.value, 50)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_above_percentile_float(self):
        seriesList = self._generate_series_list()
        percent = 0.1
        results = functions.removeAbovePercentile({}, seriesList, percent)
        expected = [[], [], [1]]

        for i, result in enumerate(results):
            self.assertEqual(return_greater(result, percent), expected[i])
            expected_name = "removeAbovePercentile(collectd.test-db{0}.load.value, 0.1)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_below_percentile(self):
        seriesList = self._generate_series_list()
        percent = 50
        results = functions.removeBelowPercentile({}, seriesList, percent)
        expected = [[], [], [1]]

        for i, result in enumerate(results):
            self.assertEqual(return_less(result, percent), expected[i])
            expected_name = "removeBelowPercentile(collectd.test-db{0}.load.value, 50)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_below_percentile_float(self):
        seriesList = self._generate_series_list()
        percent = 0.1
        results = functions.removeBelowPercentile({}, seriesList, percent)
        expected = [[0], [0], []]

        for i, result in enumerate(results):
            self.assertEqual(return_less(result, percent), expected[i])
            expected_name = "removeBelowPercentile(collectd.test-db{0}.load.value, 0.1)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_above_value(self):
        seriesList = self._generate_series_list()
        value = 5
        results = functions.removeAboveValue({}, seriesList, value)
        for i, result in enumerate(results):
            self.assertEqual(return_greater(result, value), [])
            expected_name = "removeAboveValue(collectd.test-db{0}.load.value, 5)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_above_value_float(self):
        seriesList = self._generate_series_list()
        value = 0.1
        results = functions.removeAboveValue({}, seriesList, value)
        for i, result in enumerate(results):
            self.assertEqual(return_greater(result, value), [])
            expected_name = "removeAboveValue(collectd.test-db{0}.load.value, 0.1)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_below_value(self):
        seriesList = self._generate_series_list()
        value = 5
        results = functions.removeBelowValue({}, seriesList, value)
        for i, result in enumerate(results):
            self.assertEqual(return_less(result, value), [])
            expected_name = "removeBelowValue(collectd.test-db{0}.load.value, 5)".format(i + 1)
            self.assertEqual(expected_name, result.name)

    def test_remove_below_value_float(self):
        seriesList = self._generate_series_list()
        value = 0.1
        results = functions.removeBelowValue({}, seriesList, value)
        for i, result in enumerate(results):
            self.assertEqual(return_less(result, value), [])
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

    def test_vertical_line(self):
        requestContext = self._build_requestContext(
            startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970,1,1,1,2,0,0,pytz.timezone(settings.TIME_ZONE)),
            tzinfo=pytz.utc
        )
        result = functions.verticalLine(requestContext, "01:0019700101", "foo")
        expectedResult = [ TimeSeries('foo',3600,3600,1.0,[1.0, 1.0]), ]
        expectedResult[0].options = {'drawAsInfinite': True}
        self.assertEqual(result, expectedResult)

    def test_vertical_line_color(self):
        requestContext = self._build_requestContext(
            startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970,1,1,1,2,0,0,pytz.timezone(settings.TIME_ZONE)),
            tzinfo=pytz.utc
        )
        result = functions.verticalLine(requestContext, "01:0019700101", "foo", "white")
        expectedResult = [ TimeSeries('foo',3600,3600,1.0,[1.0, 1.0]), ]
        expectedResult[0].options = {'drawAsInfinite': True}
        expectedResult[0].color = "white"
        self.assertEqual(result, expectedResult)

    def test_vertical_line_before_start(self):
        requestContext = self._build_requestContext(
            startTime=datetime(1971,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1971,1,1,1,2,0,0,pytz.timezone(settings.TIME_ZONE)),
            tzinfo=pytz.utc
        )
        with self.assertRaisesRegexp(ValueError, "verticalLine\(\): timestamp 3600 exists before start of range"):
            result = functions.verticalLine(requestContext, "01:0019700101", "foo")

    def test_vertical_line_after_end(self):
        requestContext = self._build_requestContext(
            startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970,1,1,1,2,0,0,pytz.timezone(settings.TIME_ZONE)),
            tzinfo=pytz.utc
        )
        with self.assertRaisesRegexp(ValueError, "verticalLine\(\): timestamp 31539600 exists after end of range"):
            result = functions.verticalLine(requestContext, "01:0019710101", "foo")

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

    def test_transform_null_reference(self):
        seriesList = self._generate_series_list()
        transform = -5
        referenceSeries = copy.deepcopy(seriesList[0])
        for k, v in enumerate(referenceSeries):
            if k % 2 != 0:
              referenceSeries[k] = None

        results = functions.transformNull({}, copy.deepcopy(seriesList), transform, [referenceSeries])

        for counter, series in enumerate(seriesList):
            if not None in series:
                continue

            # Anywhere a None was in the original series, verify it
            # was transformed to the given value if a value existed
            # in the reference series
            for i, value in enumerate(series):
                if value is None and referenceSeries[i] is not None:
                    result_val = results[counter][i]
                    self.assertEqual(transform, result_val,
                        "Transformed value should be {0}, not {1}".format(transform, result_val),
                    )

    def test_transform_null_reference_empty(self):
        seriesList = self._generate_series_list()
        transform = -5
        referenceSeries = []

        results = functions.transformNull({}, copy.deepcopy(seriesList), transform, [referenceSeries])

        for counter, series in enumerate(seriesList):
            if not None in series:
                continue
            # If the None values weren't transformed, there is a problem
            self.assertNotIn(None, results[counter],
                "tranformNull should remove all None values",
            )
            # Anywhere a None was in the original series, verify it
            # was transformed to the given value if a value existed
            for i, value in enumerate(series):
                if value is None:
                    result_val = results[counter][i]
                    self.assertEqual(transform, result_val,
                        "Transformed value should be {0}, not {1}".format(transform, result_val),
                    )

    def test_isNonNull(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('isNonNull(collectd.test-db1.load.value)',0,600,60,[1,1,1,1,1,1,1,1,1,1]),
            TimeSeries('isNonNull(collectd.test-db2.load.value)',0,600,60,[0,0,0,0,0,0,0,0,0,0]),
            TimeSeries('isNonNull(collectd.test-db3.load.value)',0,600,60,[1,1,0,0,0,1,1,1,1,1]),
            TimeSeries('isNonNull(collectd.test-db4.load.value)',0,600,60,[1,1,1,1,1,1,1,1,1,0]),
        ]
        for series in expectedResult:
            series.options = {}

        requestContext = {}
        result = functions.isNonNull(requestContext, seriesList)
        self.assertEqual(result, expectedResult)

    def test_identity(self):
        expectedResult = [
            TimeSeries('my_series', 3600, 3660, 60, [3600]),
        ]
        requestContext = {
                          'startTime': datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
                          'endTime':datetime(1970,1,1,1,1,0,0,pytz.timezone(settings.TIME_ZONE))
                         }
        result = functions.identity(requestContext, "my_series")
        self.assertEqual(result, expectedResult)

    def test_countSeries(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('countSeries(collectd.test-db1.load.value,collectd.test-db2.load.value,collectd.test-db3.load.value,collectd.test-db4.load.value)',0,600,60,[4,4,4,4,4,4,4,4,4,4]),
        ]
        for series in expectedResult:
            series.options = {}

        requestContext = {}
        result = functions.countSeries(requestContext, seriesList)
        self.assertEqual(result, expectedResult)

    def test_empty_countSeries(self):
        expectedResult = [
            TimeSeries('0',0,600,300,[0,0,0]),
        ]

        # requestContext = {
        #     'startTime': datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
        #     'endTime': datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
        # }
        requestContext = self._build_requestContext(startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),endTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)))
        result = functions.countSeries(requestContext)
        self.assertEqual(result, expectedResult)

    def test_group(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        requestContext = {}
        result = functions.group(requestContext, seriesList[0], seriesList[1], seriesList[2], seriesList[3])
        self.assertEqual(result, [1,2,3,4,5,6,7,8,9,10,None,None,None,None,None,None,None,None,None,None,1,2,None,None,None,6,7,8,9,10,1,2,3,4,5,6,7,8,9,None])

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

    def test_alias_query(self):

        # Create input series
        seriesList = self._gen_series_list_with_data(
            key=['chan.pow.1', 'chan.pow.2', 'chan.pow.3'],
            start=0,
            end=1,
            data=[
                [0, 30], [10, 40], [20, 50]
            ]
        )

        # Intermediate lookup series
        lookupSeries = self._gen_series_list_with_data(
            key=['chan.freq.1', 'chan.freq.2', 'chan.freq.3'],
            start=0,
            end=1,
            data=[
                [0, 101], [0, 102], [0, 103]
            ]
        )

        # Expected result
        expectedResult = [
            TimeSeries("Channel 101 MHz", 0, 1, 1, [0, 30]),
            TimeSeries("Channel 102 MHz", 0, 1, 1, [10, 40]),
            TimeSeries("Channel 103 MHz", 0, 1, 1, [20, 50])
        ]

        def mock_evaluateTarget(requestContext, target):
            for series in lookupSeries:
                if series.name == target:
                    return [series]
            return []

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            # Perform query - this one will not find a matching metric
            with self.assertRaises(Exception):
                functions.aliasQuery({}, seriesList, 'chan\.pow\.([0-9]+)', 'chan.fred.\\1', 'Channel %d MHz')

            # Perform query - this one will find a matching metric
            results = functions.aliasQuery({}, seriesList, 'chan\.pow\.([0-9]+)', 'chan.freq.\\1', 'Channel %d MHz')

            # Check results
            self.assertEqual(results, expectedResult)

            # Custom safeLast() function
            def noneSafeLast(x):
                return None
            with patch('graphite.render.functions.safeLast', noneSafeLast):

                # Perform query - this one will fail to return a current value for the matched metric
                with self.assertRaises(Exception):
                    functions.aliasQuery({}, seriesList, 'chan\.pow\.([0-9]+)', 'chan.freq.\\1', 'Channel %d MHz')

    # TODO: Add tests for * globbing and {} matching to this
    def test_alias_by_node(self):
        seriesList = self._generate_series_list()

        def verify_node_name(cases, expected, *nodes):
            if isinstance(nodes, int):
                node_number = [nodes]

            # Use deepcopy so the original seriesList is unmodified
            results = functions.aliasByNode({}, copy.deepcopy(cases), *nodes)

            for i, series in enumerate(results):
                if expected:
                    expected_name = expected[i]
                else:
                    fragments = seriesList[i].name.split('.')
                    # Super simplistic. Doesn't match {thing1,thing2}
                    # or glob with *, both of what graphite allow you to use
                    expected_name = '.'.join([fragments[i] for i in nodes])
                self.assertEqual(series.name, expected_name)

        verify_node_name(seriesList, None, 1)
        verify_node_name(seriesList, None, 1, 0)
        verify_node_name(seriesList, None, -1, 0)

        # Verify broken input causes broken output
        with self.assertRaises(IndexError):
            verify_node_name(seriesList, None, 10000)

        # Additiona tests
        seriesList = []
        names = [
            "collectd.test-db1.load.value",
            "sum(collectd.test-db1.load.value)",
            "sum(sum(collectd.test-db1.load.value))",
            "divide(collectd.test-db1.load.value, 5)",
        ]
        expected = ["test-db1"] * len(names)
        for name in names:
            series = TimeSeries(name, 0, 1, 1, [1])
            seriesList.append(series)

        verify_node_name(seriesList, expected, 1)

        series = TimeSeries('collectd.load;host=test-db1;instance=value', 0, 1, 1, [1])
        series.pathExpression = 'seriesByTag("name=collectd.load", "host=test-db1")'

        verify_node_name([series], ['load'], 1)
        verify_node_name([series], ['test-db1'], 'host')
        verify_node_name([series], ['test-db1.load'], 'host', 1)
        verify_node_name([series], ['test-db1.load.'], 'host', 1, 2)
        verify_node_name([series], ['test-db1.load.'], 'host', 1, 'foo')
        verify_node_name([series], ['test-db1.'], 'host', '1')

    def test_aliasByMetric(self):
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db1.load.value',
                'collectd.test-db2.load.value',
                'collectd.test-db3.load.value',
                'collectd.test-db4.load.value',
                'scaleToSeconds(collectd.test-db5.load.value, 1)',
                'sumSeries(collectd.test-db6.load.value)',
                'a',
                'a.b',
                'a.b.c'
            ],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None],
                [1,2,3,4,5,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,10]
            ]
        )

        expectedResult = [
            TimeSeries('value',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('value',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('value',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
            TimeSeries('value',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('value',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('a', 0, 600, 60, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            TimeSeries('b', 0, 600, 60, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
            TimeSeries('c', 0, 600, 60, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        ]

        requestContext = {}
        result = functions.aliasByMetric(requestContext, seriesList)
        self.assertEqual(result, expectedResult)

    def test_groupByNode(self):
        seriesList, inputList = self._generate_mr_series()

        def verify_groupByNode(expectedResult, nodeNum, seriesList):
            results = functions.groupByNode({}, copy.deepcopy(seriesList), nodeNum, "keepLastValue")

            self.assertEqual(results, expectedResult)

        expectedResult   = [
            TimeSeries('group',0,1,1,[None]),
        ]
        verify_groupByNode(expectedResult, 0, seriesList)

        expectedResult   = [
            TimeSeries('server1',0,1,1,[None]),
            TimeSeries('server2',0,1,1,[None]),
        ]
        verify_groupByNode(expectedResult, 1, seriesList)

        # Additiona tests
        seriesList = []
        names = [
            "collectd.test-db1.load.value",
            "sum(collectd.test-db1.load.value)",
            "sum(sum(collectd.test-db1.load.value))",
            "divide(collectd.test-db1.load.value, 5)",
            "scaleToSeconds(divide(collectd.test-db1.load.value, 5),1)",
        ]
        expectedResult = []
        for name in names:
            series = TimeSeries(name, 0, 1, 1, [1])
            seriesList.append(series)
        for expected in ["value"] * len(names):
            series = TimeSeries(expected, 0, 1, 1, [1])
            expectedResult.append(series)
        for i, series in enumerate(seriesList):
          verify_groupByNode([expectedResult[i]], 3, [series])


    def test_groupByNodes(self):
        seriesList, inputList = self._generate_mr_series()

        def verify_groupByNodes(expectedResult, func, *nodes):
            if isinstance(nodes, int):
                node_number = [nodes]

            results = functions.groupByNodes({}, copy.deepcopy(seriesList), func, *nodes)

            self.assertEqual(results, expectedResult)

        expectedResult = [
            TimeSeries('server1',0,1,1,[None]),
            TimeSeries('server2',0,1,1,[None]),
        ]
        verify_groupByNodes(expectedResult, "keepLastValue", 1)

        expectedResult = [
            TimeSeries('server1.metric1',0,1,1,[None]),
            TimeSeries('server1.metric2',0,1,1,[None]),
            TimeSeries('server2.metric1',0,1,1,[None]),
            TimeSeries('server2.metric2',0,1,1,[None]),
        ]
        verify_groupByNodes(expectedResult, "keepLastValue", 1, 2)

        expectedResult = [
            TimeSeries('server1.group',0,1,1,[None]),
            TimeSeries('server2.group',0,1,1,[None]),
        ]
        verify_groupByNodes(expectedResult, "keepLastValue", 1, 0)

        expectedResult = [
            TimeSeries('server1.group',0,1,1,[None]),
            TimeSeries('server2.group',0,1,1,[None]),
        ]
        verify_groupByNodes(expectedResult, "range",  1, 0)

    def test_exclude(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('collectd.test-db4.load.value',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]

        requestContext = {}
        result = functions.exclude(requestContext, seriesList, '.*db2')
        self.assertEqual(result, expectedResult)

    def test_grep(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
        ]

        requestContext = {}
        result = functions.grep(requestContext, seriesList, '.*db2')
        self.assertEqual(result, expectedResult)

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

    def test_substr(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('test-db1.load',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('test-db2.load',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('test-db3.load',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('test-db4.load',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]

        requestContext = {}
        result = functions.substr(requestContext, seriesList, 1, 3)
        self.assertEqual(result, expectedResult)

    def test_substr_no_args(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('collectd.test-db4.load.value',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]

        requestContext = {}
        result = functions.substr(requestContext, seriesList)
        self.assertEqual(result, expectedResult)

    def test_substr_function_no_args(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('collectd.test-db4.load.value',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]

        requestContext = {}
        result = functions.substr(requestContext, seriesList)
        self.assertEqual(result, expectedResult)

    def test_substr_function(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('test-db1.load',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('test-db2.load',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('test-db3.load',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
            TimeSeries('test-db4.load',0,600,60,[1,2,3,4,5,6,7,8,9,None]),
        ]

        requestContext = {}
        result = functions.substr(requestContext, seriesList, 1, 3)
        self.assertEqual(result, expectedResult)

    def test_logarithm(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [-1,-2,None,None,None,-6,-7,-8,-9,-10],
                [1,2,3,4,5,6,7,8,9,None]
            ]
        )

        expectedResult = [
            TimeSeries('log(collectd.test-db1.load.value, 10)',0,600,60,[0.0,0.30103,0.4771213,0.60206,0.69897,0.7781513,0.845098,0.90309,0.9542425,1.0]),
            TimeSeries('log(collectd.test-db2.load.value, 10)',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('log(collectd.test-db3.load.value, 10)',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('log(collectd.test-db4.load.value, 10)',0,600,60,[0.0,0.30103,0.4771213,0.60206,0.69897,0.7781513,0.845098,0.90309,0.9542425,None]),
        ]

        requestContext = {}
        result = functions.logarithm(requestContext, seriesList)
        # Round values to 7 digits for easier equality testing
        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,7)
        self.assertEqual(result, expectedResult)


    def test_maximumAbove(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,6,7,8,9,10],
                [1,2,3,4,5,4,3,2,1,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,6,7,8,9,10]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,6,7,8,9,10]),
        ]

        requestContext = {}
        result = functions.maximumAbove(requestContext, seriesList, 5)
        self.assertEqual(result, expectedResult)

    def test_maximumAbove_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.maximumAbove({}, [], 1))

    def test_minimumAbove(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,6,7,8,9,10],
                [None,None,None,None,None,None,None,None,None,None],
                [10,9,None,None,None,6,7,8,9,10],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db3.load.value',0,600,60,[10,9,None,None,None,6,7,8,9,10]),
            TimeSeries('collectd.test-db4.load.value',0,600,60,[10,9,8,7,6,7,8,9,10,None]),
        ]

        requestContext = {}
        result = functions.minimumAbove(requestContext, seriesList, 5)
        self.assertEqual(result, expectedResult)

    def test_minimumAbove_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.minimumAbove({}, [], 1))

    def test_maximumBelow(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,2,1,0],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,4,3,2,1,0]),
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,4,3,2,1,0]),
        ]

        requestContext = {}
        result = functions.maximumBelow(requestContext, seriesList, 5)
        self.assertEqual(result, expectedResult)

    def test_maximumBelow_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.maximumBelow({}, [], 1))

    def test_minimumBelow(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,2,1,0],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,4,3,2,1,0]),
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,4,3,2,1,0]),
        ]

        requestContext = {}
        result = functions.minimumBelow(requestContext, seriesList, 5)
        self.assertEqual(result, expectedResult)

    def test_minimumBelow_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.minimumBelow({}, [], 1))

    def test_highestCurrent(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )
        expectedResult = [
            TimeSeries('collectd.test-db4.load.value',0,600,60,[10,9,8,7,6,7,8,9,10,None]),
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,4,3,5,6,7]),
        ]

        requestContext = {}
        result = functions.highestCurrent(requestContext, seriesList, 2)
        self.assertEqual(result, expectedResult)

    def test_highestCurrent_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.highestCurrent({}, [], 1))

    def test_highest_max(self):
        config = [20, 50, 30, 40]
        seriesList = [list(range(max_val)) for max_val in config]

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

    def test_lowestCurrent(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,4,3,2,1,0]),
        ]

        requestContext = {}
        result = functions.lowestCurrent(requestContext, seriesList, 2)
        self.assertEqual(result, expectedResult)

    def test_lowestCurrent_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.lowestCurrent({}, [], 1))

    def test_currentAbove(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,4,3,5,6,7]),
            TimeSeries('collectd.test-db4.load.value',0,600,60,[10,9,8,7,6,7,8,9,10,None]),
        ]

        requestContext = {}
        result = functions.currentAbove(requestContext, seriesList, 2)
        self.assertEqual(result, expectedResult)

    def test_currentAbove_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.currentAbove({}, [], 1))

    def test_currentBelow(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,4,3,2,1,0]),
        ]

        requestContext = {}
        result = functions.currentBelow(requestContext, seriesList, 2)
        self.assertEqual(result, expectedResult)

    def test_currentBelow_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.currentBelow({}, [], 1))

    def test_highestAverage(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db4.load.value',0,600,60,[10,9,8,7,6,7,8,9,10,None]),
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,4,3,5,6,7]),
        ]

        requestContext = {}
        result = functions.highestAverage(requestContext, seriesList, 2)
        self.assertEqual(result, expectedResult)

    def test_highestAverage_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.highestAverage({}, [], 1))

    def test_lowestAverage(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,4,3,2,1,0]),
        ]

        requestContext = {}
        result = functions.lowestAverage(requestContext, seriesList, 2)
        self.assertEqual(result, expectedResult)

    def test_lowestAverage_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.lowestAverage({}, [], 1))

    def test_averageAbove(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,4,3,5,6,7]),
            TimeSeries('collectd.test-db4.load.value',0,600,60,[10,9,8,7,6,7,8,9,10,None]),
        ]

        requestContext = {}
        result = functions.averageAbove(requestContext, seriesList, 2)
        self.assertEqual(result, expectedResult)

    def test_averageAbove_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.averageAbove({}, [], 1))

    def test_averageBelow(self):
        seriesList = [
            TimeSeries('collectd.test-db1.load.value',0,600,60,[1,2,3,4,5,4,3,5,6,7]),
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,4,3,2,1,0]),
            TimeSeries('collectd.test-db4.load.value',0,600,60,[10,9,8,7,6,7,8,9,10,None]),
        ]
        expectedResult = [
            TimeSeries('collectd.test-db2.load.value',0,600,60,[None,None,None,None,None,None,None,None,None,None]),
            TimeSeries('collectd.test-db3.load.value',0,600,60,[1,2,None,None,None,4,3,2,1,0]),
        ]

        requestContext = {}
        result = functions.averageBelow(requestContext, seriesList, 2)
        self.assertEqual(result, expectedResult)

    def test_averageBelow_empty_list(self):
        # Test the function works properly with an empty seriesList provided.
        self.assertEqual([], functions.averageBelow({}, [], 1))

    def test_constantLine(self):
        requestContext = {'startTime': datetime(2014,3,12,2,0,0,2,pytz.timezone(settings.TIME_ZONE)), 'endTime':datetime(2014,3,12,3,0,0,2,pytz.timezone(settings.TIME_ZONE))}
        results = functions.constantLine(requestContext, [1])

    def test_aggregateLine_default(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('aggregateLine(collectd.test-db1.load.value, 4)', 3600, 3660, 30, [4.0, 4.0, 4.0]),
            TimeSeries('aggregateLine(collectd.test-db2.load.value, None)', 3600, 3660, 30, [None, None, None]),
            TimeSeries('aggregateLine(collectd.test-db3.load.value, 1.85714)', 3600, 3660, 30, [1.8571428571428572, 1.8571428571428572, 1.8571428571428572]),
            TimeSeries('aggregateLine(collectd.test-db4.load.value, 8.22222)', 3600, 3660, 30, [8.222222222222221, 8.222222222222221, 8.222222222222221]),
        ]
        requestContext = self._build_requestContext(
            startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970,1,1,1,1,0,0,pytz.timezone(settings.TIME_ZONE))
        )

        result = functions.aggregateLine(
            requestContext,
            seriesList
        )
        self.assertEqual(result, expectedResult)

    def test_aggregateLine_avg(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('aggregateLine(collectd.test-db1.load.value, 4)', 0, 600, 60, [4.0] * 10),
            TimeSeries('aggregateLine(collectd.test-db2.load.value, None)', 0, 600, 60, [None] * 10),
            TimeSeries('aggregateLine(collectd.test-db3.load.value, 1.85714)', 0, 600, 60, [1.8571428571428572] * 10),
            TimeSeries('aggregateLine(collectd.test-db4.load.value, 8.22222)', 0, 600, 60, [8.222222222222221] * 10),
        ]
        result = functions.aggregateLine(
            self._build_requestContext(
                startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE))
            ),
            seriesList,
            'avg',
            keepStep=True
        )
        self.assertEqual(result, expectedResult)

    def test_aggregateLine_min(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('aggregateLine(collectd.test-db1.load.value, 1)', 3600, 3600, 0, [1.0, 1.0, 1.0]),
            TimeSeries('aggregateLine(collectd.test-db2.load.value, None)', 3600, 3600, 0, [None, None, None]),
            TimeSeries('aggregateLine(collectd.test-db3.load.value, 0)', 3600, 3600, 0, [0.0, 0.0, 0.0]),
            TimeSeries('aggregateLine(collectd.test-db4.load.value, 6)', 3600, 3600, 0, [6.0, 6.0, 6.0]),
        ]
        result = functions.aggregateLine(
            self._build_requestContext(
                startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE))
            ),
            seriesList,
            'min'
        )
        self.assertEqual(result, expectedResult)

    def test_aggregateLine_max(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        expectedResult = [
            TimeSeries('aggregateLine(collectd.test-db1.load.value, 7)', 0, 600, 60, [7.0] * 10),
            TimeSeries('aggregateLine(collectd.test-db2.load.value, None)', 0, 600, 60, [None] * 10),
            TimeSeries('aggregateLine(collectd.test-db3.load.value, 4)', 0, 600, 60, [4.0] * 10),
            TimeSeries('aggregateLine(collectd.test-db4.load.value, 10)', 0, 600, 60, [10.0] * 10),
        ]
        result = functions.aggregateLine(
            self._build_requestContext(
                startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE))
            ),
            seriesList,
            'max',
            keepStep=True
        )
        self.assertEqual(result, expectedResult)

    def test_aggregateLine_bad(self):
        seriesList = self._gen_series_list_with_data(
            key=['collectd.test-db1.load.value', 'collectd.test-db2.load.value', 'collectd.test-db3.load.value', 'collectd.test-db4.load.value'],
            end=600,
            step=60,
            data=[
                [1,2,3,4,5,4,3,5,6,7],
                [None,None,None,None,None,None,None,None,None,None],
                [1,2,None,None,None,4,3,2,1,0],
                [10,9,8,7,6,7,8,9,10,None]
            ]
        )

        with self.assertRaisesRegexp(ValueError, '^Unsupported aggregation function: bad$'):
          result = functions.aggregateLine(
            self._build_requestContext(
                startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE))
            ),
            seriesList,
            'bad'
        )

    def test_threshold_default(self):
        expectedResult = [
            TimeSeries('7', 3600, 3600, 0, [7.0, 7.0, 7.0]),
        ]
        result = functions.threshold(self._build_requestContext(startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)), endTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE))), 7)
        self.assertEqual(result, expectedResult)

    def test_threshold_label_color(self):
        expectedResult = [
            TimeSeries('MyLine', 3600, 3600, 0, [7.0, 7.0, 7.0]),
        ]
        expectedResult[0].color='blue'
        result = functions.threshold(self._build_requestContext(startTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE)), endTime=datetime(1970,1,1,1,0,0,0,pytz.timezone(settings.TIME_ZONE))), 7, 'MyLine', 'blue')
        self.assertEqual(result, expectedResult)

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

    def test_mapSeries(self):
        seriesList, expectedResult = self._generate_mr_series()
        results = functions.mapSeries({}, copy.deepcopy(seriesList), 1)
        self.assertEqual(results,expectedResult)

    def test_reduceSeries(self):
        sl, inputList = self._generate_mr_series()
        expectedResult   = [
            TimeSeries('group.server2.reduce.mock',0,1,1,[None]),
            TimeSeries('group.server2.reduce.mock',0,1,1,[None])
        ]
        resultSeriesList = [TimeSeries('mock(series)',0,1,1,[None])]
        mock = MagicMock(return_value = resultSeriesList)
        with patch.dict(_SeriesFunctions,{ 'mock': mock }):
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

    def test_powSeries(self):
        seriesList = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,[1,2,3,4,5,6,7,8,9,0,312.1]),
            TimeSeries('collectd.test-db2.load.value',0,1,1,[1,3,5,7,None,6,4,8,0,10,234.2]),
        ]
        expectedResult = [
            TimeSeries('powSeries(collectd.test-db1.load.value,collectd.test-db2.load.value)',0,1,1,[1.0,8.0,243.0,16384.0,None,46656.0,2401.0,16777216.0,1.0,0.0,None]),
        ]

        result = functions.powSeries({}, seriesList)
        self.assertEqual(result, expectedResult)

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

    def test_round(self):
        seriesList = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,[1.111,2.222,3.333,4.444,5.555,6.666,7.777,8.888,9.999,0,None]),
        ]
        expectedResult = [
            TimeSeries('round(collectd.test-db1.load.value)',0,1,1,[1,2,3,4,6,7,8,9,10,0,None]),
        ]

        result = functions.roundFunction({}, seriesList)
        self.assertEqual(list(result[0]), list(expectedResult[0]))
        self.assertEqual(result, expectedResult)

    def test_round_precision(self):
        seriesList = [
            TimeSeries('collectd.test-db1.load.value',0,1,1,[1.111,2.222,3.333,4.444,5.555,6.666,7.777,8.888,9.999,0,None]),
        ]
        expectedResult = [
            TimeSeries('round(collectd.test-db1.load.value,2)',0,1,1,[1.11,2.22,3.33,4.44,5.55,6.67,7.78,8.89,10.0,0.0,None]),
        ]

        result = functions.roundFunction({}, seriesList, 2)
        self.assertEqual(list(result[0]), list(expectedResult[0]))
        self.assertEqual(result, expectedResult)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_timeStack(self):
        self.maxDiff = None

        def mock_data_fetcher(reqCtx, path_expression):
            seriesList = self._gen_series_list_with_data(
                key=['test.value'],
                start=reqCtx['startTime'],
                end=reqCtx['endTime'],
                step=60,
                data=[None,None,None,3,None,5,6,None,7,None,None]
            )
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        requestContext = self._build_requestContext(
            startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
        )
        requestContext['args'] = [grammar.parseString('test.value')]

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            #Input data is ignored and replaced with subsequent calls to evaluateTarget to get new data
            inputSeries = TimeSeries('test.value',600,1200,60,[0,1,2,3,4,5,6,7,8,9])
            results = functions.timeStack(
                requestContext,
                [ inputSeries ],
                "10minutes",
                0,
                3
            )

        expectedResults = [
            TimeSeries('timeShift(test.value, -10minutes, 0)',600,1200,60,[None,None,None,3,None,5,6,None,7,None,None]),
            TimeSeries('timeShift(test.value, -10minutes, 1)',600,1200,60,[None,None,None,3,None,5,6,None,7,None,None]),
            TimeSeries('timeShift(test.value, -10minutes, 2)',600,1200,60,[None,None,None,3,None,5,6,None,7,None,None]),
        ]

        self.assertEqual(results, expectedResults)

    def test_timeStack_emptySeries(self):
        # Input of an empty series will result in no timeshifting attempted
        results = functions.timeStack(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            [ ],
            "-10minutes",
            0,
            3
        )
        expectedResult = [ ]
        self.assertEqual(results, expectedResult)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_timeShift(self):
        seriesList = self._gen_series_list_with_data(
            key=['test.value'],
            start=0,
            end=600,
            step=60,
            data=[None,None,None,3,None,5,6,None,7,None,None]
        )

        def mock_data_fetcher(reqCtx, path_expression):
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        requestContext = self._build_requestContext(
            startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
        )
        requestContext['args'] = [grammar.parseString('test.value')]

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            # input values will be ignored and replaced by mocked timeshifted values
            inputSeries = TimeSeries('test.value',600,1200,60,[0,1,2,3,4,5,6,7,8,9])
            results = functions.timeShift(
                requestContext,
                [ inputSeries ],
                "-10minutes"
            )

        expectedResults = [
            TimeSeries('timeShift(test.value, "-10minutes")',600,1200,60,[None,None,None,3,None,5,6,None,7,None,None])
        ]

        self.assertEqual(results, expectedResults)

    def test_timeShift_emptySeries(self):
        # Input of an empty series will result in no timeshifting attempted
        results = functions.timeShift(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            [ ],
            "-10minutes"
        )
        expectedResult = [ ]
        self.assertEqual(results, expectedResult)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_timeShift_resetEnd_False(self):
        # Test if the timeseries returns data past the end of the original end-time is kept
        # with resetEnd set to False
        seriesList = self._gen_series_list_with_data(
            key=['test.value'],
            start=1200,
            end=1860,
            step=60,
            data=[None,None,None,3,None,5,6,None,7,None,None,8]
        )

        def mock_data_fetcher(reqCtx, path_expression):
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        requestContext = self._build_requestContext(
            startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
        )
        requestContext['args'] = [grammar.parseString('test.value')]

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            # Input data is replaced with calls to evaluateTarget with new start/end times set
            inputSeries = TimeSeries('test.value',600,1200,60,[0,1,2,3,4,5,6,7,8,9])
            results = functions.timeShift(
                requestContext,
                [ inputSeries ],
                "+10minutes",
                False
            )

        expectedResults = [
            TimeSeries('timeShift(test.value, "+10minutes")',600,1260,60,[None,None,None,3,None,5,6,None,7,None,None,8])
        ]

        self.assertEqual(results, expectedResults)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_timeShift_alignDST(self):
        seriesList = self._gen_series_list_with_data(
            key=['test.value'],
            start=0,
            end=600,
            step=60,
            data=[None,None,None,3,None,5,6,None,7,None,None]
        )

        def mock_data_fetcher(reqCtx, path_expression):
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        requestContext = self._build_requestContext(
            startTime=datetime(1970, 1, 1, 0, 10, 0, 0, pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE))
        )
        requestContext['args'] = [grammar.parseString('test.value')]

        with self.settings(TIME_ZONE='Europe/Berlin'):
            with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
                inputSeries = TimeSeries('test.value',600,1200,60,[0,1,2,3,4,5,6,7,8,9])
                inputSeries.pathExpression = 'test.value'
                results = functions.timeShift(
                    requestContext,
                    [ inputSeries ],
                    "-10minutes",
                    True,
                    True
                )

        expectedResults = [
            TimeSeries('timeShift(test.value, "-10minutes")',600,1200,60,[None,None,None,3,None,5,6,None,7,None,None])
        ]

        self.assertEqual(results, expectedResults)

    def test_timeSlice(self):
        # series starts at 60 seconds past the epoch and continues for 600 seconds (ten minutes)
        # steps are every 60 seconds
        seriesList = self._gen_series_list_with_data(
            key='test.value',
            start=0,
            end=600,
            step=60,
            data=[None,1,2,3,None,5,6,None,7,8,9]
        )

        # we're going to slice such that we only include minutes 3 to 8 (of 0 to 9)
        expectedResult = [
            TimeSeries('timeSlice(test.value, 180, 480)',0,600,60,[None,None,None,3,None,5,6,None,7,None,None])
        ]

        results = functions.timeSlice(
            self._build_requestContext(
                startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
            ),
            seriesList,
            '00:03 19700101',
            '00:08 19700101'
        )
        self.assertEqual(results, expectedResult)

    def test_legendValue_with_system_preserves_sign(self):
        seriesList = self._gen_series_list_with_data(
            key='foo',
            start=0,
            end=3,
            data=[-10000, -20000, -30000, -40000]
        )
        expectedResult = [TimeSeries("foo                 avg  -25.00k   ", 0, 3, 1, [-10000, -20000, -30000, -40000])]
        result = functions.legendValue({}, seriesList, "avg", "si")
        self.assertEqual(result, expectedResult)

    def test_legendValue_all(self):
        seriesList = self._gen_series_list_with_data(
            key=['foo', 'bar','baz'],
            start=0,
            end=4,
            data=[[10000, 20000, -30000, -40000, None], [0, 10000, 20000, -30000, -40000], [None, None, None, None, None]]
        )
        expectedResult = [TimeSeries("foo (avg: -10000.0) (total: -40000) (min: -40000) (max: 20000) (last: -40000)", 0, 4, 1, [10000, 20000, -30000, -40000, None]),
                          TimeSeries("bar (avg: -8000.0) (total: -40000) (min: -40000) (max: 20000) (last: -40000)", 0, 4, 1, [0, 10000, 20000, -30000, -40000]),
                          TimeSeries("baz (avg: None) (total: None) (min: None) (max: None) (last: None)", 0, 4, 1, [None, None, None, None, None])]
        result = functions.legendValue({}, seriesList, "avg", "total", "min", "max", "last")
        self.assertEqual(result, expectedResult)

    def test_legendValue_all_si(self):
        seriesList = self._gen_series_list_with_data(
            key=['foo', 'bar','baz'],
            start=0,
            end=4,
            data=[[10000, 20000, -30000, -40000, None], [0, 10000, 20000, -30000, -40000], [None, None, None, None, None]]
        )
        expectedResult = [TimeSeries("foo                 avg  -10.00k   total-40.00k   min  -40.00k   max  20.00k    last -40.00k   ", 0, 4, 1, [10000, 20000, -30000, -40000, None]),
                          TimeSeries("bar                 avg  -8.00k    total-40.00k   min  -40.00k   max  20.00k    last -40.00k   ", 0, 4, 1, [0, 10000, 20000, -30000, -40000]),
                          TimeSeries("baz                 avg  None      totalNone      min  None      max  None      last None      ", 0, 4, 1, [None, None, None, None, None])]
        result = functions.legendValue({}, seriesList, "avg", "total", "min", "max", "last", "si")
        self.assertEqual(result, expectedResult)

    def test_legendValue_all_binary(self):
        seriesList = self._gen_series_list_with_data(
            key=['foo', 'bar','baz'],
            start=0,
            end=4,
            data=[[10000, 20000, -30000, -40000, None], [0, 10000, 20000, -30000, -40000], [None, None, None, None, None]]
        )
        expectedResult = [TimeSeries("foo                 avg  -9.77Ki   total-39.06Ki  min  -39.06Ki  max  19.53Ki   last -39.06Ki  ", 0, 4, 1, [10000, 20000, -30000, -40000, None]),
                          TimeSeries("bar                 avg  -7.81Ki   total-39.06Ki  min  -39.06Ki  max  19.53Ki   last -39.06Ki  ", 0, 4, 1, [0, 10000, 20000, -30000, -40000]),
                          TimeSeries("baz                 avg  None      totalNone      min  None      max  None      last None      ", 0, 4, 1, [None, None, None, None, None])]
        result = functions.legendValue({}, seriesList, "avg", "total", "min", "max", "last", "binary")
        self.assertEqual(result, expectedResult)

    def test_legendValue_invalid_none(self):
        seriesList = self._gen_series_list_with_data(
            key=['foo', 'bar','baz'],
            start=0,
            end=4,
            data=[[10000, 20000, -30000, -40000, None], [0, 10000, 20000, -30000, -40000], [None, None, None, None, None]]
        )

        expectedResult = [TimeSeries("foo (avg: -10000.0) (bogus: (?))", 0, 4, 1, [10000, 20000, -30000, -40000, None]),
                          TimeSeries("bar (avg: -8000.0) (bogus: (?))", 0, 4, 1, [0, 10000, 20000, -30000, -40000]),
                          TimeSeries("baz (avg: None) (bogus: (?))", 0, 4, 1, [None, None, None, None, None])]

        result = functions.legendValue({}, seriesList, "avg", "bogus")
        self.assertEqual(result, expectedResult)


    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_linearRegression(self):
        seriesList = self._gen_series_list_with_data(
            key=['test.value'],
            start=180,
            end=480,
            step=60,
            data=[3,None,5,6,None,8]
        )

        def mock_data_fetcher(reqCtx, path_expression):
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        requestContext = self._build_requestContext(
            startTime=datetime(1970, 1, 1, 0, 20, 0, 0, pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970, 1, 1, 0, 25, 0, 0, pytz.timezone(settings.TIME_ZONE))
        )
        requestContext['args'] = [grammar.parseString('test.value')]

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            # input values will be ignored and replaced by regression function
            inputSeries = TimeSeries('test.value',1200,1500,60,[123,None,None,456,None,None,None])
            results = functions.linearRegression(
                requestContext,
                [ inputSeries ],
                '00:03 19700101',
                '00:08 19700101'
            )

        # regression function calculated from datapoints on minutes 3 to 8
        expectedResult = [
            TimeSeries('linearRegression(test.value, 180, 480)',1200,1500,60,[20.0,21.0,22.0,23.0,24.0,25.0,26.0])
        ]

        self.assertEqual(results, expectedResult)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_applyByNode(self):
        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free','servers.s2.disk.bytes_used','servers.s2.disk.bytes_free'],
            start=0,
            end=3,
            data=[[10, 20, 30], [90, 80, 70], [1, 2, 3], [99, 98, 97]]
        )

        def mock_data_fetcher(reqCtx, path_expression):
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        expectedResults = [
            TimeSeries('divideSeries(servers.s1.disk.bytes_used,sumSeries(servers.s1.disk.bytes_used,servers.s1.disk.bytes_free))', 0, 3, 1, [0.10, 0.20, 0.30]),
            TimeSeries('divideSeries(servers.s2.disk.bytes_used,sumSeries(servers.s2.disk.bytes_used,servers.s2.disk.bytes_free))', 0, 3, 1, [0.01, 0.02, 0.03])
        ]

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            result = functions.applyByNode(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 1,
                'divideSeries(%.disk.bytes_used, sumSeries(%.disk.bytes_*))'
            )
        self.assertEqual(result, expectedResults)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_applyByNode_newName(self):
        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free','servers.s2.disk.bytes_used','servers.s2.disk.bytes_free'],
            start=0,
            end=3,
            data=[[10, 20, 30], [90, 80, 70], [1, 2, 3], [99, 98, 97]]
        )

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
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 1,
                'divideSeries(%.disk.bytes_used, sumSeries(%.disk.bytes_*))',
                '%.disk.pct_used'
            )
        self.assertEqual(result, expectedResults)

    def test_movingWindow_invalidFunc(self):
        request_context = self._build_requestContext(
            startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
            endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
        )

        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=25,
            data=list(range(20, 25))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=10,
                end=25,
                data=list(range(10, 25))
            )

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            with self.assertRaisesRegexp(ValueError, '^Unsupported aggregation function: invalid$'):
                functions.movingWindow(request_context, seriesList, 5, 'invalid')

    def test_movingWindow_xFilesFactor(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=30,
            data=list(range(0, 10))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=10,
                end=30,
                data=[None] * 10 + list(range(0, 10))
            )

        expectedResults = [
            TimeSeries('movingAverage(collectd.test-db0.load.value,10)', 20, 30, 1, [None, None, None, None, None, 2.0, 2.5, 3.0, 3.5, 4.0])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingWindow(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10, 'average', 0.5
            )
        self.assertEqual(list(result[0]), list(expectedResults[0]))
        self.assertEqual(result, expectedResults)

    def test_movingMedian_emptySeriesList(self):
        self.assertEqual(functions.movingMedian({},[],""), [])

    def test_movingMedian_evaluateTarget_returns_none(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=25,
            data=list(range(10, 25))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=10,
                end=25,
                data=[None, None, None, None, None, None, None, None, None, None, None, None, None, None, None]
            )

        expectedResults = [
            TimeSeries('movingMedian(collectd.test-db0.load.value,10)', 20, 25, 1, [None, None, None, None, None])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMedian(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingMedian_evaluateTarget_returns_half_none(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=30,
            data=list(range(10, 110))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=10,
                end=30,
                data=[None] * 10 + list(range(0, 10))
            )

        expectedResults = [
            TimeSeries('movingMedian(collectd.test-db0.load.value,10)', 20, 30, 1, [None, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMedian(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(list(result[0]), list(expectedResults[0]))
        self.assertEqual(result, expectedResults)

    def test_movingMedian_evaluateTarget_returns_empty_list(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 110))
        )

        def mock_evaluateTarget(requestContext, targets):
            return []

        expectedResults = []

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMedian(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 60
            )
        self.assertEqual(result, expectedResults)

    def test_movingMedian_integerWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 110))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=600,
                end=700,
                data=list(range(0, 100))
            )

        expectedResults = [
            TimeSeries('movingMedian(collectd.test-db0.load.value,60)', 660, 700, 1, [x - 0.5 for x in range(30, 70)]),
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMedian(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 60
            )
        self.assertEqual(list(result[0]), list(expectedResults[0]))
        self.assertEqual(result, expectedResults)

    def test_movingMedian_stringWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 610))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=600,
                end=700,
                data=list(range(0, 100))
            )

        expectedResults = [
            TimeSeries('movingMedian(collectd.test-db0.load.value,"-1min")', 660, 700, 1, [x - 0.5 for x in range(30, 70)]),
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMedian(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, "-1min"
            )
        self.assertEqual(list(result[0]), list(expectedResults[0]))
        self.assertEqual(result, expectedResults)

    def test_movingAverage_emptySeriesList(self):
        self.assertEqual(functions.movingAverage({},[],""), [])

    def test_movingAverage_evaluateTarget_returns_none(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=25,
            data=list(range(0, 25))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=10,
                end=25,
                data=[None, None, None, None, None, None, None, None, None, None, None, None, None, None, None]
            )

        expectedResults = [
            TimeSeries('movingAverage(collectd.test-db0.load.value,10)', 20, 25, 1, [None, None, None, None, None])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingAverage(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingAverage_evaluateTarget_returns_half_none(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=30,
            data=list(range(0, 10))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=10,
                end=30,
                data=[None] * 10 + list(range(0, 10))
            )

        expectedResults = [
            TimeSeries('movingAverage(collectd.test-db0.load.value,10)', 20, 30, 1, [None, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingAverage(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(list(result[0]), list(expectedResults[0]))
        self.assertEqual(result, expectedResults)

    def test_movingAverage_evaluateTarget_returns_empty_list(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 110))
        )

        def mock_evaluateTarget(requestContext, targets):
            return []

        expectedResults = []

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingAverage(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 60
            )
        self.assertEqual(result, expectedResults)

    def test_movingAverage_integerWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 110))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=600,
                end=700,
                data=list(range(0, 100))
            )

        def frange(x,y,jump):
            while x<y:
              yield x
              x+=jump
        expectedResults = [
            TimeSeries('movingAverage(collectd.test-db0.load.value,60)', 660, 700, 1, frange(29.5, 69.5, 1)),
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingAverage(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 60
            )
        self.assertEqual(result, expectedResults)

    def test_movingAverage_stringWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 110))
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=600,
                end=700,
                data=list(range(0, 100))
            )

        def frange(x,y,jump):
            while x<y:
              yield x
              x+=jump

        expectedResults = [
            TimeSeries('movingAverage(collectd.test-db0.load.value,"-1min")', 660, 700, 1, frange(29.5, 69.5, 1)),
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingAverage(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, "-1min"
            )
        self.assertEqual(result, expectedResults)

    def test_movingMin_emptySeriesList(self):
        self.assertEqual(functions.movingMin({},[],""), [])

    def test_movingMin_evaluateTarget_returns_none(self):
        start = 10
        end = start + 15
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=start + 10,
            end=end,
            data=list(range(start, end))
        )

        def mock_evaluateTarget(requestContext, targets):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', 10, 25, 1, [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None])
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        expectedResults = [
            TimeSeries('movingMin(collectd.test-db0.load.value,10)', 20, 25, 1, [None, None, None, None, None])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMin(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingMin_evaluateTarget_returns_half_none(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=30,
            data=[2, 1] * 5
        )

        def mock_evaluateTarget(requestContext, targets):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', 10, 30, 1, [None] * 10 + [2, 1] * 5)
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        expectedResults = [
            TimeSeries('movingMin(collectd.test-db0.load.value,10)', 20, 30, 1, [None, 2, 1, 1, 1, 1, 1, 1, 1, 1] )
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMin(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingMin_evaluateTarget_returns_empty_list(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 10 + 100))
        )

        def mock_evaluateTarget(requestContext, targets):
            return []

        expectedResults = []

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMin(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 60
            )
        self.assertEqual(result, expectedResults)

    def test_movingMin_integerWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=30,
            data=[10, 1] * 5
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=10,
                end=30,
                data=[None] * 10 + [10, 1] * 5
            )

        expectedResults = [
            TimeSeries('movingMin(collectd.test-db0.load.value,10)', 20, 30, 1, [None, 10] + [1] * 8)
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMin(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingMin_stringWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=[10, 1] * 50
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=600,
                end=700,
                data=[10, 1] * 50
            )

        expectedResults = [
            TimeSeries('movingMin(collectd.test-db0.load.value,"-1min")', 660, 700, 1, [1]*40),
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMin(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, "-1min"
            )
        self.assertEqual(result, expectedResults)

    def test_movingMax_emptySeriesList(self):
        self.assertEqual(functions.movingMax({},[],""), [])

    def test_movingMax_evaluateTarget_returns_none(self):
        start = 10
        end = start + 15
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=start + 10,
            end=end,
            data=list(range(start, end))
        )

        def mock_evaluateTarget(requestContext, targets):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', 10, 25, 1, [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None])
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        expectedResults = [
            TimeSeries('movingMax(collectd.test-db0.load.value,10)', 20, 25, 1, [None, None, None, None, None])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMax(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingMax_evaluateTarget_returns_half_none(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=50,
            data=[1, 2] * 5
        )

        def mock_evaluateTarget(requestContext, targets):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', 10, 30, 1, [None] * 10 + [1, 2] * 5)
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        expectedResults = [
            TimeSeries('movingMax(collectd.test-db0.load.value,10)', 20, 30, 1, [None, 1, 2, 2, 2, 2, 2, 2, 2, 2])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMax(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingMax_evaluateTarget_returns_empty_list(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 10 + 100))
        )

        def mock_evaluateTarget(requestContext, targets):
            return []

        expectedResults = []

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMax(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 60
            )
        self.assertEqual(result, expectedResults)

    def test_movingMax_integerWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=30,
            data=[1, 2] * 5
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=10,
                end=30,
                data=[None] * 10 + [1, 2] * 5
            )

        expectedResults = [
            TimeSeries('movingMax(collectd.test-db0.load.value,10)', 20, 30, 1, [None, 1, 2, 2, 2, 2, 2, 2, 2, 2])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMax(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingMax_stringWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=[1, 10] * 50
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(
                key='collectd.test-db0.load.value',
                start=600,
                end=700,
                data=[1, 10] * 50
            )

        expectedResults = [
            TimeSeries('movingMax(collectd.test-db0.load.value,"-1min")', 660, 700, 1, [10] * 40),
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingMax(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, "-1min"
            )
        self.assertEqual(result, expectedResults)

    def test_movingSum_emptySeriesList(self):
        self.assertEqual(functions.movingSum({},[],""), [])

    def test_holtWintersAnalysis_None(self):
        seriesList = TimeSeries('collectd.test-db0.load.value', 660, 700, 1, [None])
        expectedResults = {
            'predictions': TimeSeries('holtWintersForecast(collectd.test-db0.load.value)', 660, 700, 1, [None]),
            'deviations': TimeSeries('holtWintersDeviation(collectd.test-db0.load.value)', 660, 700, 1, [0]),
            'seasonals': [0],
            'slopes': [0],
            'intercepts': [None]
        }

        result = functions.holtWintersAnalysis(seriesList)
        self.assertEqual(result, expectedResults)

    def test_movingSum_evaluateTarget_returns_none(self):
        start = 10
        end = start + 15
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=start + 10,
            end=end,
            data=list(range(start, end))
        )

        def mock_evaluateTarget(requestContext, targets):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', 10, 25, 1, [None, None, None, None, None, None, None, None, None, None, None, None, None, None, None])
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        expectedResults = [
            TimeSeries('movingSum(collectd.test-db0.load.value,10)', 20, 25, 1, [None, None, None, None, None])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingSum(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingSum_evaluateTarget_returns_half_none(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=20,
            end=30,
            data=list(range(0, 10))
        )

        def mock_evaluateTarget(requestContext, targets):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', 10, 30, 1, [None] * 10 + list(range(0, 10)))
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        expectedResults = [
            TimeSeries('movingSum(collectd.test-db0.load.value,10)', 20, 30, 1, [None, 0.0, 1.0, 3.0, 6.0, 10.0, 15.0, 21.0, 28.0, 36.0])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingSum(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 10
            )
        self.assertEqual(result, expectedResults)

    def test_movingSum_evaluateTarget_returns_empty_list(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=list(range(10, 10 + 100))
        )

        def mock_evaluateTarget(requestContext, targets):
            return []

        expectedResults = []

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingSum(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 60
            )
        self.assertEqual(result, expectedResults)

    def test_movingSum_integerWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=[1] * 100
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(key='collectd.test-db0.load.value', start=600, end=700, step=1, data=[1] * 100)

        expectedResults = [
            TimeSeries('movingSum(collectd.test-db0.load.value,60)', 660, 700, 1, [60.0]*40)
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingSum(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, 60
            )
        self.assertEqual(result, expectedResults)

    def test_movingSum_stringWindowSize(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=610,
            end=710,
            data=[1] * 100
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(key='collectd.test-db0.load.value', start=600, end=700, step=1, data=[1] * 100)

        expectedResults = [
            TimeSeries('movingSum(collectd.test-db0.load.value,"-1min")', 660, 700, 1, [60.0]*40),
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.movingSum(
                self._build_requestContext(
                    startTime=datetime(1970, 1, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList, "-1min"
            )
        self.assertEqual(result, expectedResults)

    def test_holtWintersForecast(self):
        def gen_seriesList(start=0):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', start+600, start+700, 1, list(range(start, start+100))),
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        seriesList = gen_seriesList(10)

        def mock_evaluateTarget(requestContext, targets):
            return gen_seriesList()

        expectedResults = [
            TimeSeries('holtWintersForecast(collectd.test-db0.load.value)', 605400, 700, 1, [])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.holtWintersForecast(
                self._build_requestContext(
                    startTime=datetime(1970, 2, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 2, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList
            )
        self.assertEqual(result, expectedResults)

    def test_holtWintersConfidenceBands(self):
        points=10
        step=600
        start_time=2678400 # 1970-02-01
        week_seconds=7*86400

        def hw_range(x,y,jump):
            while x<y:
              yield (x/jump)%10
              x+=jump

        def gen_seriesList(start=0, points=10):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', start, start+(points*step), step, hw_range(0, points*step, step)),
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        seriesList = gen_seriesList(start_time, points)

        def mock_evaluateTarget(requestContext, targets):
            return gen_seriesList(start_time-week_seconds, (week_seconds/step)+points)

        expectedResults = [
            TimeSeries('holtWintersConfidenceLower(collectd.test-db0.load.value)', start_time, start_time+(points*step), step, [0.2841206166091448, 1.0581027098774411, 0.3338172102994683, 0.5116859493263242, -0.18199175514936972, 0.2366173792019426, -1.2941554508809152, -0.513426806531049, -0.7970905542723132, 0.09868900726536012]),
            TimeSeries('holtWintersConfidenceUpper(collectd.test-db0.load.value)', start_time, start_time+(points*step), step, [8.424944558327624, 9.409422251880809, 10.607070189221787, 10.288439865038768, 9.491556863132963, 9.474595784593738, 8.572310478053845, 8.897670449095346, 8.941566968508148, 9.409728797779282])
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.holtWintersConfidenceBands(
                self._build_requestContext(
                    startTime=datetime(1970, 2, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 2, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList
            )
        self.assertEqual(result, expectedResults)

    def test_holtWintersConfidenceArea(self):
        points=10
        step=600
        start_time=2678400 # 1970-02-01
        week_seconds=7*86400

        def hw_range(x,y,jump):
            while x<y:
              yield (x/jump)%10
              x+=jump

        def gen_seriesList(start=0, points=10):
            seriesList = [
                TimeSeries('collectd.test-db0.load.value', start, start+(points*step), step, hw_range(0, points*step, step)),
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        seriesList = gen_seriesList(start_time, points)

        def mock_evaluateTarget(requestContext, targets):
            return gen_seriesList(start_time-week_seconds, (week_seconds/step)+points)

        expectedResults = [
            TimeSeries('holtWintersConfidenceArea(collectd.test-db0.load.value)', start_time, start_time+(points*step), step, [0.2841206166091448, 1.0581027098774411, 0.3338172102994683, 0.5116859493263242, -0.18199175514936972, 0.2366173792019426, -1.2941554508809152, -0.513426806531049, -0.7970905542723132, 0.09868900726536012]),
            TimeSeries('holtWintersConfidenceArea(collectd.test-db0.load.value)', start_time, start_time+(points*step), step, [8.424944558327624, 9.409422251880809, 10.607070189221787, 10.288439865038768, 9.491556863132963, 9.474595784593738, 8.572310478053845, 8.897670449095346, 8.941566968508148, 9.409728797779282]),
        ]
        expectedResults[0].options = {'invisible': True, 'stacked': True}
        expectedResults[1].options = {'stacked': True}

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.holtWintersConfidenceArea(
                self._build_requestContext(
                    startTime=datetime(1970, 2, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 2, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList
            )
        self.assertEqual(result, expectedResults)

    def test_holtWintersAberration(self):
        points=10
        step=600
        start_time=2678400 # 1970-02-01
        week_seconds=7*86400

        def hw_range(x,y,jump,t=0):
            while x<y:
              yield t+(x/jump)%10
              x+=jump

        def gen_seriesList(start=0, points=10):
            seriesList = [
              TimeSeries('collectd.test-db0.load.value', start, start+(points*step), step, hw_range(0, points*step, step)),
              TimeSeries('collectd.test-db1.load.value', start, start+(points*step), step, hw_range(0, points*step, step, t=10)),
            ]
            for series in seriesList:
                series.pathExpression = series.name
            return seriesList

        seriesList = gen_seriesList(start_time, points)

        def mock_evaluateTarget(requestContext, targets):
            return gen_seriesList(start_time-week_seconds, (week_seconds/step)+points)

        expectedResults = [
            TimeSeries('holtWintersAberration(collectd.test-db0.load.value)', start_time, start_time+(points*step), step, [-0.2841206166091448, -0.05810270987744115, 0, 0, 0, 0, 0, 0, 0, 0]),
            TimeSeries('holtWintersAberration(collectd.test-db1.load.value)', start_time, start_time+(points*step), step, [-0.284120616609151, -0.05810270987744737, 0, 0, 0, 0, 0, 0, 0, 0]),
        ]

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.holtWintersAberration(
                self._build_requestContext(
                    startTime=datetime(1970, 2, 1, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE)),
                    endTime=datetime(1970, 2, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))
                ),
                seriesList
            )
        self.assertEqual(result, expectedResults)

    def test_smartSummarize_alignTo_1year(self):
        start_time = datetime(1970, 1, 1, 0, 30, 0, 0, pytz.utc)
        end_time = datetime(1970, 1, 1, 4, 0, 0, 0, pytz.utc)
        step = 1
        bucketSize = '1hour'
        alignTo = 'years'

        expectedResults = {
            'sum' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "sum")', 0, 14400, 3600, [6478200, 19438200, 32398200, 45358200]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "sum")', 0, 14400, 3600, [-6478200, -19438200, -32398200, -45358200]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "sum")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "sum")', 0, 14400, 3600, [6478200, 19438200, 32398200, 45358200])
            ],
            'avg' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "avg")', 0, 14400, 3600, [1799.5, 5399.5, 8999.5, 12599.5]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "avg")', 0, 14400, 3600, [-1799.5, -5399.5, -8999.5, -12599.5]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "avg")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "avg")', 0, 14400, 3600, [1799.5, 5399.5, 8999.5, 12599.5])
            ],
            'last' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "last")', 0, 14400, 3600, [3599, 7199, 10799, 14399]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "last")', 0, 14400, 3600, [-3599, -7199, -10799, -14399]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "last")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "last")', 0, 14400, 3600, [3599, 7199, 10799, 14399])
            ],
            'max' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "max")', 0, 14400, 3600, [3599, 7199, 10799, 14399]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "max")', 0, 14400, 3600, [0, -3600, -7200, -10800]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "max")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "max")', 0, 14400, 3600, [3599, 7199, 10799, 14399])
            ],
            'min' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "min")', 0, 14400, 3600, [0, 3600, 7200, 10800]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "min")', 0, 14400, 3600, [-3599, -7199, -10799, -14399]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "min")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "min")', 0, 14400, 3600, [0, 3600, 7200, 10800])
            ],
        }

        self._assert_smartsummarize(start_time, end_time, step, bucketSize, alignTo, expectedResults)

    def test_smartSummarize_alignTo_months(self):
        start_time = datetime(1970, 1, 1, 0, 30, 0, 0, pytz.utc)
        end_time = datetime(1970, 1, 1, 4, 0, 0, 0, pytz.utc)
        step = 1
        bucketSize = '1hour'
        alignTo = 'months'

        expectedResults = {
            'sum' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "sum")', 0, 14400, 3600, [6478200, 19438200, 32398200, 45358200]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "sum")', 0, 14400, 3600, [-6478200, -19438200, -32398200, -45358200]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "sum")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "sum")', 0, 14400, 3600, [6478200, 19438200, 32398200, 45358200])
            ],
            'avg' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "avg")', 0, 14400, 3600, [1799.5, 5399.5, 8999.5, 12599.5]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "avg")', 0, 14400, 3600, [-1799.5, -5399.5, -8999.5, -12599.5]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "avg")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "avg")', 0, 14400, 3600, [1799.5, 5399.5, 8999.5, 12599.5])
            ],
            'last' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "last")', 0, 14400, 3600, [3599, 7199, 10799, 14399]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "last")', 0, 14400, 3600, [-3599, -7199, -10799, -14399]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "last")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "last")', 0, 14400, 3600, [3599, 7199, 10799, 14399])
            ],
            'max' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "max")', 0, 14400, 3600, [3599, 7199, 10799, 14399]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "max")', 0, 14400, 3600, [0, -3600, -7200, -10800]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "max")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "max")', 0, 14400, 3600, [3599, 7199, 10799, 14399])
            ],
            'min' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "min")', 0, 14400, 3600, [0, 3600, 7200, 10800]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "min")', 0, 14400, 3600, [-3599, -7199, -10799, -14399]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "min")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "min")', 0, 14400, 3600, [0, 3600, 7200, 10800])
            ],
        }

        self._assert_smartsummarize(start_time, end_time, step, bucketSize, alignTo, expectedResults)

    def test_smartSummarize_alignTo_weeks_on_thursday(self):
        self.maxDiff = None

        start_time = datetime(1970, 1, 3, 0, 30, 0, 0, pytz.utc)
        end_time = datetime(1970, 1, 1, 4, 0, 0, 0, pytz.utc)
        step = 1
        bucketSize = '4hours'
        alignTo = 'weeks4'

        expectedResults = {
            'sum' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "4hours", "sum")', 0, 14400, 14400, [103672800]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "4hours", "sum")', 0, 14400, 14400, [-103672800]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "4hours", "sum")', 0, 14400, 14400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "4hours", "sum")', 0, 14400, 14400, [103672800])
            ],
            'avg' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "4hours", "avg")', 0, 14400, 14400, [7199.5]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "4hours", "avg")', 0, 14400, 14400, [-7199.5]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "4hours", "avg")', 0, 14400, 14400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "4hours", "avg")', 0, 14400, 14400, [7199.5])
            ],
            'last' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "4hours", "last")', 0, 14400, 14400, [14399]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "4hours", "last")', 0, 14400, 14400, [-14399]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "4hours", "last")', 0, 14400, 14400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "4hours", "last")', 0, 14400, 14400, [14399])
            ],
            'max' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "4hours", "max")', 0, 14400, 14400, [14399]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "4hours", "max")', 0, 14400, 14400, [0]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "4hours", "max")', 0, 14400, 14400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "4hours", "max")', 0, 14400, 14400, [14399])
            ],
            'min' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "4hours", "min")', 0, 14400, 14400, [0]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "4hours", "min")', 0, 14400, 14400, [-14399]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "4hours", "min")', 0, 14400, 14400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "4hours", "min")', 0, 14400, 14400, [0])
            ],
        }

        self._assert_smartsummarize(start_time, end_time, step, bucketSize, alignTo, expectedResults)

    def test_smartSummarize_alignTo_days(self):
        start_time = datetime(1970, 1, 1, 23, 59, 59, 0, pytz.utc)
        end_time = datetime(1970, 1, 2, 0, 0, 0, 0, pytz.utc)
        step = 60
        bucketSize = '1d'
        alignTo = 'days'

        expectedResults = {
            'sum' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1d", "sum")', 0, 86400, 86400, [62164800]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1d", "sum")', 0, 86400, 86400, [-62164800]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1d", "sum")', 0, 86400, 86400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1d", "sum")', 0, 86400, 86400, [1036080])
            ],
            'avg' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1d", "avg")', 0, 86400, 86400, [43170.0]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1d", "avg")', 0, 86400, 86400, [-43170.0]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1d", "avg")', 0, 86400, 86400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1d", "avg")', 0, 86400, 86400, [719.5])
            ],
            'last' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1d", "last")', 0, 86400, 86400, [86340]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1d", "last")', 0, 86400, 86400, [-86340]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1d", "last")', 0, 86400, 86400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1d", "last")', 0, 86400, 86400, [1439])
            ],
            'max' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1d", "max")', 0, 86400, 86400, [86340]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1d", "max")', 0, 86400, 86400, [0]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1d", "max")', 0, 86400, 86400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1d", "max")', 0, 86400, 86400, [1439])
            ],
            'min' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1d", "min")', 0, 86400, 86400, [0]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1d", "min")', 0, 86400, 86400, [-86340]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1d", "min")', 0, 86400, 86400, [None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1d", "min")', 0, 86400, 86400, [0])
            ],
        }

        self._assert_smartsummarize(start_time, end_time, step, bucketSize, alignTo, expectedResults)

    def test_smartSummarize_alignTo_hours(self):
        start_time = datetime(1970, 1, 1, 0, 30, 0, 0, pytz.utc)
        end_time = datetime(1970, 1, 1, 4, 0, 0, 0, pytz.utc)
        step = 1
        bucketSize = '1hour'
        alignTo = 'hours'

        expectedResults = {
            'sum' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "sum")', 0, 14400, 3600, [6478200, 19438200, 32398200, 45358200]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "sum")', 0, 14400, 3600, [-6478200, -19438200, -32398200, -45358200]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "sum")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "sum")', 0, 14400, 3600, [6478200, 19438200, 32398200, 45358200])
            ],
            'avg' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "avg")', 0, 14400, 3600, [1799.5, 5399.5, 8999.5, 12599.5]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "avg")', 0, 14400, 3600, [-1799.5, -5399.5, -8999.5, -12599.5]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "avg")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "avg")', 0, 14400, 3600, [1799.5, 5399.5, 8999.5, 12599.5])
            ],
            'last' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "last")', 0, 14400, 3600, [3599, 7199, 10799, 14399]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "last")', 0, 14400, 3600, [-3599, -7199, -10799, -14399]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "last")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "last")', 0, 14400, 3600, [3599, 7199, 10799, 14399])
            ],
            'max' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "max")', 0, 14400, 3600, [3599, 7199, 10799, 14399]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "max")', 0, 14400, 3600, [0, -3600, -7200, -10800]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "max")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "max")', 0, 14400, 3600, [3599, 7199, 10799, 14399])
            ],
            'min' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1hour", "min")', 0, 14400, 3600, [0, 3600, 7200, 10800]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1hour", "min")', 0, 14400, 3600, [-3599, -7199, -10799, -14399]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1hour", "min")', 0, 14400, 3600, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1hour", "min")', 0, 14400, 3600, [0, 3600, 7200, 10800])
            ],
        }

        self._assert_smartsummarize(start_time, end_time, step, bucketSize, alignTo, expectedResults)

    def test_smartSummarize_alignTo_minutes(self):
        start_time = datetime(1970, 1, 1, 0, 0, 59, 0, pytz.utc)
        end_time = datetime(1970, 1, 1, 0, 4, 0, 0, pytz.utc)
        step = 1
        bucketSize = '1minute'
        alignTo = 'minutes'

        expectedResults = {
            'sum' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "sum")', 0, 240, 60, [1770, 5370, 8970, 12570]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "sum")', 0, 240, 60, [-1770, -5370, -8970, -12570]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "sum")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "sum")', 0, 240, 60, [1770, 5370, 8970, 12570])
            ],
            'avg' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "avg")', 0, 240, 60, [29.5, 89.5, 149.5, 209.5]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "avg")', 0, 240, 60, [-29.5, -89.5, -149.5, -209.5]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "avg")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "avg")', 0, 240, 60, [29.5, 89.5, 149.5, 209.5])
            ],
            'last' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "last")', 0, 240, 60, [59, 119, 179, 239]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "last")', 0, 240, 60, [-59, -119, -179, -239]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "last")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "last")', 0, 240, 60, [59, 119, 179, 239])
            ],
            'max' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "max")', 0, 240, 60, [59, 119, 179, 239]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "max")', 0, 240, 60, [0, -60, -120, -180]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "max")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "max")', 0, 240, 60, [59, 119, 179, 239])
            ],
            'min' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "min")', 0, 240, 60, [0, 60, 120, 180]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "min")', 0, 240, 60, [-59, -119, -179, -239]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "min")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "min")', 0, 240, 60, [0, 60, 120, 180])
            ],
        }

        self._assert_smartsummarize(start_time, end_time, step, bucketSize, alignTo, expectedResults)

    def test_smartSummarize_alignTo_seconds(self):
        start_time = datetime(1970, 1, 1, 0, 0, 0, 579, pytz.utc)
        end_time = datetime(1970, 1, 1, 0, 4, 0, 0, pytz.utc)
        step = 1
        bucketSize = '1minute'
        alignTo = 'seconds'

        expectedResults = {
            'sum' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "sum")', 0, 240, 60, [1770, 5370, 8970, 12570]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "sum")', 0, 240, 60, [-1770, -5370, -8970, -12570]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "sum")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "sum")', 0, 240, 60, [1770, 5370, 8970, 12570])
            ],
            'avg' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "avg")', 0, 240, 60, [29.5, 89.5, 149.5, 209.5]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "avg")', 0, 240, 60, [-29.5, -89.5, -149.5, -209.5]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "avg")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "avg")', 0, 240, 60, [29.5, 89.5, 149.5, 209.5])
            ],
            'last' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "last")', 0, 240, 60, [59, 119, 179, 239]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "last")', 0, 240, 60, [-59, -119, -179, -239]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "last")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "last")', 0, 240, 60, [59, 119, 179, 239])
            ],
            'max' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "max")', 0, 240, 60, [59, 119, 179, 239]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "max")', 0, 240, 60, [0, -60, -120, -180]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "max")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "max")', 0, 240, 60, [59, 119, 179, 239])
            ],
            'min' : [
                TimeSeries('smartSummarize(servers.s1.disk.bytes_used, "1minute", "min")', 0, 240, 60, [0, 60, 120, 180]),
                TimeSeries('smartSummarize(servers.s1.disk.bytes_free, "1minute", "min")', 0, 240, 60, [-59, -119, -179, -239]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_used, "1minute", "min")', 0, 240, 60, [None, None, None, None]),
                TimeSeries('smartSummarize(servers.s2.disk.bytes_free, "1minute", "min")', 0, 240, 60, [0, 60, 120, 180])
            ],
        }

        self._assert_smartsummarize(start_time, end_time, step, bucketSize, alignTo, expectedResults)

    def test_smartSummarize_alignToFrom(self):
        start_time = datetime(1970, 1, 1, 3, 30, 30, 0, pytz.utc)
        end_time = datetime(1970, 1, 1, 4, 0, 0, 0, pytz.utc)
        bucketSize = '1hour'
        alignTo = True

        with patch('graphite.render.functions.evaluateTarget', lambda *_: []):
            request_context = self._build_requestContext(start_time, end_time)
            with self.assertRaises(TypeError):
                functions.smartSummarize(request_context, None, bucketSize, 'max', alignTo)

    def test_hitcount_1day(self):
        endTime = 86400
        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free', 'servers.s2.disk.bytes_used', 'servers.s2.disk.bytes_free'],
            start=0,
            end=endTime,
            step=60,
            data=[list(range(0, endTime, 60)), list(range(0, -endTime, -60)), [None] * 1440, list(range(0, 1440))]
        )

        expectedResults = [
            TimeSeries('hitcount(servers.s1.disk.bytes_used, "1d", true)', 0, 172800, 86400, [3729888000, None]),
            TimeSeries('hitcount(servers.s1.disk.bytes_free, "1d", true)', 0, 172800, 86400, [-3729888000, None]),
            TimeSeries('hitcount(servers.s2.disk.bytes_used, "1d", true)', 0, 172800, 86400, [None, None]),
            TimeSeries('hitcount(servers.s2.disk.bytes_free, "1d", true)', 0, 172800, 86400, [62164800, None])
        ]

        with patch('graphite.render.functions.evaluateTarget', lambda *_: seriesList):
            result = functions.hitcount(
                self._build_requestContext(endTime=datetime(1970, 1, 2, 0, 0, 0, 0, pytz.timezone(settings.TIME_ZONE))),
                seriesList, "1d", True)

        self.assertEqual(result, expectedResults)

    def test_hitcount_1hour(self):
        endTime = 14400
        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free', 'servers.s2.disk.bytes_used', 'servers.s2.disk.bytes_free'],
            start=0,
            end=endTime,
            data=[list(range(0, endTime)), list(range(0, -endTime, -1)), [None] * endTime, list(range(0, endTime*2, 2))]
        )

        expectedResults = [
            TimeSeries('hitcount(servers.s1.disk.bytes_used, "1hour", true)', 0, 18000, 3600, [6478200, 19438200, 32398200, 45358200, None]),
            TimeSeries('hitcount(servers.s1.disk.bytes_free, "1hour", true)', 0, 18000, 3600, [-6478200, -19438200, -32398200, -45358200, None]),
            TimeSeries('hitcount(servers.s2.disk.bytes_used, "1hour", true)', 0, 18000, 3600, [None, None, None, None, None]),
            TimeSeries('hitcount(servers.s2.disk.bytes_free, "1hour", true)', 0, 18000, 3600, [12956400, 38876400, 64796400, 90716400, None])
        ]

        with patch('graphite.render.functions.evaluateTarget', lambda *_: seriesList):
            result = functions.hitcount(
                self._build_requestContext(endTime=datetime(1970, 1, 1, 0, 4, 0, 0, pytz.timezone(settings.TIME_ZONE))),
                seriesList,
                "1hour",
                True
            )
        self.assertEqual(result, expectedResults)

    def test_hitcount_1minute(self):
        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free', 'servers.s2.disk.bytes_used', 'servers.s2.disk.bytes_free'],
            start=0,
            end=240,
            data=[list(range(0, 240)), list(range(0, -240, -1)), [None] * 240, list(range(0, 480, 2))]
        )

        expectedResults = [
            TimeSeries('hitcount(servers.s1.disk.bytes_used, "1minute", true)', 0, 300, 60, [1770, 5370, 8970, 12570, None]),
            TimeSeries('hitcount(servers.s1.disk.bytes_free, "1minute", true)', 0, 300, 60, [-1770, -5370, -8970, -12570, None]),
            TimeSeries('hitcount(servers.s2.disk.bytes_used, "1minute", true)', 0, 300, 60, [None, None, None, None, None]),
            TimeSeries('hitcount(servers.s2.disk.bytes_free, "1minute", true)', 0, 300, 60, [3540, 10740, 17940, 25140, None])
        ]

        with patch('graphite.render.functions.evaluateTarget', lambda *_: seriesList):
            result = functions.hitcount(
                self._build_requestContext(endTime=datetime(1970, 1, 1, 0, 4, 0, 0, pytz.timezone(settings.TIME_ZONE))),
                seriesList,
                "1minute",
                True
            )
        self.assertEqual(result, expectedResults)

    def test_hitcount_1minute_alignToFrom_false(self):
        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free', 'servers.s2.disk.bytes_used', 'servers.s2.disk.bytes_free'],
            start=0,
            end=240,
            data=[list(range(0, 240)), list(range(0, -240, -1)), [None] * 240, list(range(0, 480, 2))]
        )

        expectedResults = [
            TimeSeries('hitcount(servers.s1.disk.bytes_used, "1minute")', 0, 240, 60, [1770, 5370, 8970, 12570]),
            TimeSeries('hitcount(servers.s1.disk.bytes_free, "1minute")', 0, 240, 60, [-1770, -5370, -8970, -12570]),
            TimeSeries('hitcount(servers.s2.disk.bytes_used, "1minute")', 0, 240, 60, [None, None, None, None]),
            TimeSeries('hitcount(servers.s2.disk.bytes_free, "1minute")', 0, 240, 60, [3540, 10740, 17940, 25140])
        ]

        with patch('graphite.render.functions.evaluateTarget', lambda *_: seriesList):
            result = functions.hitcount(
                self._build_requestContext(endTime=datetime(1970, 1, 1, 0, 4, 0, 0, pytz.timezone(settings.TIME_ZONE))),
                seriesList,
                "1minute",
                False
            )
        self.assertEqual(result, expectedResults)

    def test_summarize_1minute(self):
        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free', 'servers.s2.disk.bytes_used', 'servers.s2.disk.bytes_free'],
            start=0,
            end=240,
            data=[list(range(0, 240)), list(range(0, -240, -1)), [None] * 240, list(range(0, 480, 2))]
        )

        expectedResults = {'sum' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "sum")', 0, 300, 60, [1770, 5370, 8970, 12570, None]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "sum")', 0, 300, 60, [-1770, -5370, -8970, -12570, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "sum")', 0, 300, 60, [None, None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "sum")', 0, 300, 60, [3540, 10740, 17940, 25140, None])
        ],
        'avg' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "avg")', 0, 300, 60, [29.5, 89.5, 149.5, 209.5, None]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "avg")', 0, 300, 60, [-29.5, -89.5, -149.5, -209.5, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "avg")', 0, 300, 60, [None, None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "avg")', 0, 300, 60, [59.0, 179.0, 299.0, 419.0, None])
        ],
        'last' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "last")', 0, 300, 60, [59, 119, 179, 239, None]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "last")', 0, 300, 60, [-59, -119, -179, -239, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "last")', 0, 300, 60, [None, None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "last")', 0, 300, 60, [118, 238, 358, 478, None])
        ],
        'max' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "max")', 0, 300, 60, [59, 119, 179, 239, None]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "max")', 0, 300, 60, [0, -60, -120, -180, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "max")', 0, 300, 60, [None, None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "max")', 0, 300, 60, [118, 238, 358, 478, None])
        ],
        'min' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "min")', 0, 300, 60, [0, 60, 120, 180, None]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "min")', 0, 300, 60, [-59, -119, -179, -239, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "min")', 0, 300, 60, [None, None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "min")', 0, 300, 60, [0, 120, 240, 360, None])
        ],
        }

        for func in expectedResults:
          for series in expectedResults[func]:
              series.pathExpression = series.name
          result = functions.summarize(
              self._build_requestContext(endTime=datetime(1970, 1, 1, 0, 4, 0, 0, pytz.timezone(settings.TIME_ZONE))),
              seriesList,
              "1minute",
              func
          )
          self.maxDiff = None
          self.assertEqual(list(result[0]), list(expectedResults[func][0]))
          self.assertEqual(result, expectedResults[func])

    def test_summarize_1minute_alignToFrom(self):
        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free', 'servers.s2.disk.bytes_used', 'servers.s2.disk.bytes_free'],
            start=0,
            end=240,
            data=[list(range(0, 240)), list(range(0, -240, -1)), [None] * 240, list(range(0, 480, 2))]
        )

        expectedResults = {'sum' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "sum", true)', 0, 240, 60, [1770, 5370, 8970, 12570]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "sum", true)', 0, 240, 60, [-1770, -5370, -8970, -12570]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "sum", true)', 0, 240, 60, [None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "sum", true)', 0, 240, 60, [3540, 10740, 17940, 25140])
        ],
        'avg' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "avg", true)', 0, 240, 60, [29.5, 89.5, 149.5, 209.5]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "avg", true)', 0, 240, 60, [-29.5, -89.5, -149.5, -209.5]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "avg", true)', 0, 240, 60, [None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "avg", true)', 0, 240, 60, [59.0, 179.0, 299.0, 419.0])
        ],
        'last' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "last", true)', 0, 240, 60, [59, 119, 179, 239]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "last", true)', 0, 240, 60, [-59, -119, -179, -239]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "last", true)', 0, 240, 60, [None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "last", true)', 0, 240, 60, [118, 238, 358, 478])
        ],
        'max' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "max", true)', 0, 240, 60, [59, 119, 179, 239]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "max", true)', 0, 240, 60, [0, -60, -120, -180]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "max", true)', 0, 240, 60, [None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "max", true)', 0, 240, 60, [118, 238, 358, 478])
        ],
        'min' : [
            TimeSeries('summarize(servers.s1.disk.bytes_used, "1minute", "min", true)', 0, 240, 60, [0, 60, 120, 180]),
            TimeSeries('summarize(servers.s1.disk.bytes_free, "1minute", "min", true)', 0, 240, 60, [-59, -119, -179, -239]),
            TimeSeries('summarize(servers.s2.disk.bytes_used, "1minute", "min", true)', 0, 240, 60, [None, None, None, None]),
            TimeSeries('summarize(servers.s2.disk.bytes_free, "1minute", "min", true)', 0, 240, 60, [0, 120, 240, 360])
        ],
        }

        for func in expectedResults:
          for series in expectedResults[func]:
              series.pathExpression = series.name

        result = functions.summarize(
          self._build_requestContext(endTime=datetime(1970, 1, 1, 0, 4, 0, 0, pytz.timezone(settings.TIME_ZONE))),
          seriesList,
          "1minute",
          func,
          True
        )
        self.assertEqual(result, expectedResults[func])

    def test_summarize_xFilesFactor(self):
        seriesList = self._gen_series_list_with_data(
            key='collectd.test-db0.load.value',
            start=0,
            end=250,
            data=[1] * 100 + [None] * 60 + [1] * 90,
        )

        tests = [
            (0, TimeSeries('summarize(collectd.test-db0.load.value, "1minute", "sum", true)', 0, 300, 60, [60, 40, 20, 60, 10], xFilesFactor=0)),
            (0.1, TimeSeries('summarize(collectd.test-db0.load.value, "1minute", "sum", true)', 0, 300, 60, [60, 40, 20, 60, 10], xFilesFactor=0.1)),
            (0.25, TimeSeries('summarize(collectd.test-db0.load.value, "1minute", "sum", true)', 0, 300, 60, [60, 40, 20, 60, None], xFilesFactor=0.25)),
            (0.5, TimeSeries('summarize(collectd.test-db0.load.value, "1minute", "sum", true)', 0, 300, 60, [60, 40, None, 60, None], xFilesFactor=0.5)),
            (0.75, TimeSeries('summarize(collectd.test-db0.load.value, "1minute", "sum", true)', 0, 300, 60, [60, None, None, 60, None], xFilesFactor=0.75)),
            (1, TimeSeries('summarize(collectd.test-db0.load.value, "1minute", "sum", true)', 0, 300, 60, [60, None, None, 60, None], xFilesFactor=1)),
        ]

        for test in tests:
            seriesList[0].xFilesFactor = test[0]
            result = functions.summarize(
              {},
              seriesList,
              "1minute",
              'sum',
              True
            )
            expectedResult = [test[1]]
            self.assertEqual(list(result[0]), list(expectedResult[0]))
            self.assertEqual(result, expectedResult)

    def test_exponentialMovingAverage_emptySeriesList(self):
        self.assertEqual(functions.exponentialMovingAverage({},[],""), [])

    def test_exponentialMovingAverage_integerWindowSize(self):
        seriesList = self._gen_series_list_with_data(start=0, end=60, data=list(range(0, 60)))
        expectedResults = self._gen_series_list_with_data(
            key='exponentialMovingAverage(collectd.test-db0.load.value,30)',
            start=30,
            end=60,
            data=[14.5, 15.5, 16.5, 17.5, 18.5, 19.5, 20.5, 21.5, 22.5, 23.5, 24.5, 25.5, 26.5, 27.5, 28.5, 29.5, 30.5, 31.5, 32.5, 33.5, 34.5, 35.5, 36.5, 37.5, 38.5, 39.5, 40.5, 41.5, 42.5, 43.5, 44.5]
        )

        def mock_evaluateTarget(requestContext, targets):
            return seriesList

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.exponentialMovingAverage(self._build_requestContext(), seriesList, 30)

        self.assertEqual(list(result[0]), list(expectedResults[0]))
        self.assertEqual(result, expectedResults)

    def test_exponentialMovingAverage_stringWindowSize(self):
        seriesList = self._gen_series_list_with_data(start=0, end=60, data=list(range(0, 60)))
        expectedResults = self._gen_series_list_with_data(
            key='exponentialMovingAverage(collectd.test-db0.load.value,"-30s")',
            start=30,
            end=60,
            data=[14.5, 15.5, 16.5, 17.5, 18.5, 19.5, 20.5, 21.5, 22.5, 23.5, 24.5, 25.5, 26.5, 27.5, 28.5, 29.5, 30.5, 31.5, 32.5, 33.5, 34.5, 35.5, 36.5, 37.5, 38.5, 39.5, 40.5, 41.5, 42.5, 43.5, 44.5]
        )

        def mock_evaluateTarget(requestContext, targets):
            return seriesList

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.exponentialMovingAverage(self._build_requestContext(), seriesList, "-30s")

        self.assertEqual(list(result[0]), list(expectedResults[0]))
        self.assertEqual(result, expectedResults)

    def test_exponentialMovingAverage_evaluateTarget_returns_empty_list(self):
        seriesList = self._gen_series_list_with_data(start=600, end=700, data=list(range(0, 100)))
        expectedResults = []

        def mock_evaluateTarget(requestContext, targets):
            return []

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.exponentialMovingAverage(self._build_requestContext(endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))), seriesList, 60)

        self.assertEqual(result, expectedResults)

    # test_exponentialMovingAverage_evaluateTarget_returns_half_none
    def test_exponentialMovingAverage_evaluateTarget_returns_half_none(self):
        seriesList = self._gen_series_list_with_data(start=10)
        expectedResults = self._gen_series_list_with_data(
            key='exponentialMovingAverage(collectd.test-db0.load.value,10)',
            start=20,
            end=30,
            data=[0, 0.0, 0.181818, 0.512397, 0.964688, 1.516563, None, 2.149915, 2.849931, 3.604489, 4.403673]
        )

        def mock_evaluateTarget(requestContext, targets):
            return self._gen_series_list_with_data(key='collectd.test-db0.load.value',start=10, end=30, data=([None] * 10 + list(range(0, 5)) + [None] + list(range(5, 9))))

        with patch('graphite.render.functions.evaluateTarget', mock_evaluateTarget):
            result = functions.exponentialMovingAverage(self._build_requestContext(endTime=datetime(1970, 1, 1, 0, 9, 0, 0, pytz.timezone(settings.TIME_ZONE))), seriesList, 10)

        self.assertEqual(list(result[0]), list(expectedResults[0]))
        self.assertEqual(result, expectedResults)

    # test_minMax
    def test_minMax(self):
        # generate data to test
        seriesList = self._gen_series_list_with_data(
            key=[
                'collectd.test-db4.load.value',
                'collectd.test-db3.load.value'
            ],
            end=1,
            data=[
                [10,20,30,40,50],
                [0,0,0,0,0]
            ]
        )
        # get the expected result (calculated)
        expectedResult = [
            TimeSeries('minMax(collectd.test-db4.load.value)',0,1,1,[0.0,0.25,0.50,0.75,1.0]),
            TimeSeries('minMax(collectd.test-db3.load.value)',0,1,1,[0.0,0.0,0.0,0.0,0.0])
        ]
        result = functions.minMax({}, seriesList)
        self.assertEqual(result, expectedResult)

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

    def _gen_series_list_with_data(self, key='collectd.test-db0.load.value', start=0, end=59, step=1, data=[]):
        """
        Helper method to create TimeSeries lists
        Args:
            key: string or list
            start: datetime
            end: datetime
            step: int
            data: list or list of lists

        Returns:
            list of TimeSeries objects

        key='key1', data=['data1', 'data2']; returns
            [
                TimeSeries(key='key1', start=0, end=59, step=1, values=['data1', 'data2'])
            ]

        key=['key1', 'key2'], data=['data1', 'data2']; returns
            [
                TimeSeries(key='key1', start=0, end=59, step=1, values=['data1', 'data2']),
                TimeSeries(key='key2', start=0, end=59, step=1, values=['data1', 'data2'])
            ]

        key=['key1', 'key2'], data=[['data1', 'data2'], ['data3', 'data4']]; returns
            [
                TimeSeries(key='key1', start=0, end=59, step=1, values=['data1', 'data2']),
                TimeSeries(key='key2', start=0, end=59, step=1, values=['data3', 'data4'])
            ]

        """
        seriesList = []
        if isinstance(key, six.string_types):
            seriesList = [
                TimeSeries(key, start, end, step, data)
            ]
        elif isinstance(key, (list, tuple)):
            values = []
            for index in range(len(key)):
                if isinstance(data[index], (list, tuple)):
                    values = data[index]
                else:
                    values = data

                seriesList.append(TimeSeries(key[index], start, end, step, values))

        for series in seriesList:
            series.pathExpression = series.name

        return seriesList

    def _assert_smartsummarize(self, start_time, end_time, step, bucketSize, alignTo, expectedResults):
        with patch('graphite.render.functions.evaluateTarget', lambda ctx, _: self._gen_smart_summarize_series_list(ctx['startTime'], end_time, step)):
            for func in expectedResults:
                request_context = self._build_requestContext(start_time, end_time)
                result = functions.smartSummarize(request_context, None, bucketSize, func, alignTo)
                self.assertEqual(result, expectedResults[func])

    def _gen_smart_summarize_series_list(self, start_time, end_time, step):
        seconds_from_epoch = lambda dt: int((dt - datetime(1970, 1, 1, 0, 0, 0, 0, pytz.utc)).total_seconds())
        start_secs_from_epoch = seconds_from_epoch(start_time)
        end_secs_from_epoch = seconds_from_epoch(end_time)
        end_minus_start_secs = end_secs_from_epoch - start_secs_from_epoch

        seriesList = self._gen_series_list_with_data(
            key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free', 'servers.s2.disk.bytes_used', 'servers.s2.disk.bytes_free'],
            start=start_secs_from_epoch,
            end=end_secs_from_epoch,
            step=step,
            data=[
                list(range(start_secs_from_epoch, end_secs_from_epoch, step)),
                list(range(start_secs_from_epoch, -end_secs_from_epoch, -step)),
                [None] * (end_minus_start_secs // step),
                list(range(0, end_minus_start_secs // step))
            ]
        )

        return seriesList

    def _generate_series_list(self):
        seriesList = []
        config = [list(range(101)), list(range(101)), [1, None, None, None, None]]

        for i, c in enumerate(config):
            name = "collectd.test-db{0}.load.value".format(i + 1)
            seriesList.append(TimeSeries(name, 0, len(c), 1, c))

        for series in seriesList:
            series.pathExpression = series.name

        return seriesList

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

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_pipedCall(self):
        queries = [
          'aliasByNode(sortByName(servers.*.disk.*),1,3)'
          'servers.*.disk.*|sortByName()|aliasByNode(1,3)',
          'sortByName(servers.*.disk.*)|aliasByNode(1,3)',
          'aliasByNode(servers.*.disk.*|sortByName(),1,3)',
          'servers.*.disk.* | sortByName() | aliasByNode(1,3)',
        ]

        expectedResults = [
            TimeSeries('s1.bytes_free', 0, 3, 1, [90, 80, 70]),
            TimeSeries('s1.bytes_used', 0, 3, 1, [10, 20, 30]),
            TimeSeries('s2.bytes_free', 0, 3, 1, [99, 98, 97]),
            TimeSeries('s2.bytes_used', 0, 3, 1, [1, 2, 3])
        ]

        seriesList = []

        def mock_data_fetcher(reqCtx, path_expression):
            rv = []
            for s in seriesList:
                if s.name == path_expression or fnmatch(s.name, path_expression):
                    rv.append(s)
            if rv:
                return rv
            raise KeyError('{} not found!'.format(path_expression))

        request_context = self._build_requestContext(0, 3)

        for query in queries:
            seriesList = self._gen_series_list_with_data(
                key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free','servers.s2.disk.bytes_used','servers.s2.disk.bytes_free'],
                start=0,
                end=3,
                data=[[10, 20, 30], [90, 80, 70], [1, 2, 3], [99, 98, 97]]
            )

            with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
                result = evaluateTarget(request_context, query)

            self.assertEqual(result, expectedResults)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_none_arg(self):
        def mock_data_fetcher(reqCtx, path_expression):
            if path_expression != 'servers.*.disk.*':
                raise Exception('Unexpected fetchData call with pathExpression: %s' % path_expression)

            return self._gen_series_list_with_data(
                key=['servers.s1.disk.bytes_used', 'servers.s1.disk.bytes_free','servers.s2.disk.bytes_used','servers.s2.disk.bytes_free'],
                start=0,
                end=3,
                data=[[10, 20, 30], [90, 80, 70], [1, 2, 3], [99, 98, 97]]
            )

        request_context = self._build_requestContext(0, 3)

        query = 'asPercent(servers.*.disk.*, None, 1)'

        expectedResult = [
            TimeSeries('asPercent(servers.s1.disk.bytes_used,sumSeries(servers.s1.disk.bytes_used,servers.s1.disk.bytes_free))',0,3,1,[10.0, 20.0, 30.0]),
            TimeSeries('asPercent(servers.s1.disk.bytes_free,sumSeries(servers.s1.disk.bytes_used,servers.s1.disk.bytes_free))',0,3,1,[90.0, 80.0, 70.0]),
            TimeSeries('asPercent(servers.s2.disk.bytes_used,sumSeries(servers.s2.disk.bytes_used,servers.s2.disk.bytes_free))',0,3,1,[1.0, 2.0, 3.0]),
            TimeSeries('asPercent(servers.s2.disk.bytes_free,sumSeries(servers.s2.disk.bytes_used,servers.s2.disk.bytes_free))',0,3,1,[99.0, 98.0, 97.0]),
        ]

        with patch('graphite.render.evaluator.fetchData', mock_data_fetcher):
            result = evaluateTarget(request_context, query)

        for i, series in enumerate(result):
          for k, v in enumerate(series):
            if type(v) is float:
              series[k] = round(v,2)

        self.assertEqual(result, expectedResult)

    def test_groupByTags(self):
        class MockTagDB(object):
            @staticmethod
            def parse(path):
                return TaggedSeries.parse(path)

        seriesList = self._gen_series_list_with_data(
            key=['disk.bytes_used;server=server1', 'disk.bytes_free;server=server1', 'disk.bytes_used;server=server2','disk.bytes_free;server=server2'],
            start=0,
            end=3,
            data=[[10, 20, 30], [90, 80, 70], [1, 2, 3], [99, 98, 97]]
        )

        with patch('graphite.storage.STORE.tagdb', None):
            result = functions.groupByTags({}, [], 'sum')
            self.assertEqual(result, [])

        with patch('graphite.storage.STORE.tagdb', MockTagDB()):
            with self.assertRaisesRegexp(ValueError, 'groupByTags\\(\\): no tags specified'):
                functions.groupByTags({}, [], 'sum')

            result = functions.groupByTags({}, seriesList, 'sum', 'server')
            self.assertEqual(result, [
                TimeSeries('sum;server=server1', 0, 3, 1, [100, 100, 100]),
                TimeSeries('sum;server=server2', 0, 3, 1, [100, 100, 100]),
            ])

            result = functions.groupByTags({}, seriesList, 'min', 'name')
            self.assertEqual(result, [
                TimeSeries('disk.bytes_used', 0, 3, 1, [1, 2, 3]),
                TimeSeries('disk.bytes_free', 0, 3, 1, [90, 80, 70]),
            ])

    def test_aliasByTags(self):
        seriesList = self._gen_series_list_with_data(
            key=['disk.bytes_used;server=server1', 'disk.bytes_free;server=server1', 'disk.bytes_used;server=server2','disk.bytes_free;server=server2'],
            start=0,
            end=3,
            data=[[10, 20, 30], [90, 80, 70], [1, 2, 3], [99, 98, 97]]
        )

        result = functions.aliasByTags({}, seriesList, 'server', 'name')
        self.assertEqual(result, [
            TimeSeries('server1.disk.bytes_used', 0, 3, 1, [10, 20, 30]),
            TimeSeries('server1.disk.bytes_free', 0, 3, 1, [90, 80, 70]),
            TimeSeries('server2.disk.bytes_used', 0, 3, 1, [1, 2, 3]),
            TimeSeries('server2.disk.bytes_free', 0, 3, 1, [99, 98, 97]),
        ])

    def test_functions_views(self):
        url = reverse('functionList')

        asPercentExpected = {
            'description': inspect.getdoc(functions.asPercent),
            'function': 'asPercent(seriesList, total=None, *nodes)',
            'group': 'Combine',
            'module': 'graphite.render.functions',
            'name': 'asPercent',
            'params': [
                {
                    'name': 'seriesList',
                    'required': True,
                    'type': 'seriesList'
                },
                {
                    'name': 'total',
                    'type': 'seriesList'
                },
                {
                    'multiple': True,
                    'name': 'nodes',
                    'type': 'nodeOrTag'
                }
            ],
        }

        averageExpected = {
            'description': 'Return the average',
            'function': 'average(series)',
            'group': 'Pie',
            'module': 'graphite.render.functions',
            'name': 'average',
            'params': [
                {
                    'name': 'series',
                    'required': True,
                    'type': 'series',
                }
            ],
        }

        # list

        # post should fail
        response = self.client.post(url, {'test': 'test'})
        self.assertEqual(response.status_code, 405)

        # get list of series functions
        response = self.client.get(url, {})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content.decode('utf-8'))
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result['asPercent'], asPercentExpected)

        # get grouped list of series functions
        response = self.client.get(url, {'grouped': 1})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content.decode('utf-8'))
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result['Combine']['asPercent'], asPercentExpected)

        # get filtered list of series functions
        response = self.client.get(url, {'group': 'Combine'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content.decode('utf-8'))
        self.assertTrue(isinstance(result, dict))
        self.assertTrue('asPercent' in result)
        self.assertFalse('interpolate' in result)

        # get list of pie functions
        response = self.client.get(url, {'type': 'pie'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content.decode('utf-8'))
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result['average'], averageExpected)

        # details

        # post should fail
        response = self.client.post(url + '/asPercent', {'test': 'test'})
        self.assertEqual(response.status_code, 405)

        # get details of asPercent function
        response = self.client.get(url + '/asPercent', {})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content.decode('utf-8'))
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result, asPercentExpected)

        # get details of average pie function
        response = self.client.get(url + '/average', {'type': 'pie'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content.decode('utf-8'))
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result, averageExpected)

        # get details of nonexistent function
        response = self.client.get(url + '/nonExistent', {})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content.decode('utf-8'))
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result, {'error': 'Function not found: nonExistent'})

        # get details of nonexistent pie function
        response = self.client.get(url + '/nonExistent', {'type': 'pie'})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response['Content-Type'], 'application/json')
        result = json.loads(response.content.decode('utf-8'))
        self.assertTrue(isinstance(result, dict))
        self.assertEqual(result, {'error': 'Function not found: nonExistent'})

    def test_function_custom_plugins(self):
        loadFunctions(force=True)
        self.assertNotIn('testFunc', _SeriesFunctions)

        # load plugins from custom directory
        with patch.multiple(
            'graphite.functions',
            customDir=join(dirname(__file__), 'funcplugins'),
            customModPrefix='tests.funcplugins.',
        ):
            loadFunctions(force=True)
            self.assertIn('testFunc', _SeriesFunctions)

        loadFunctions(force=True)
        self.assertNotIn('testFunc', _SeriesFunctions)

        # load plugins from config setting
        with self.settings(FUNCTION_PLUGINS=['tests.funcplugins.plugin']):
            loadFunctions(force=True)
            self.assertIn('testFunc', _SeriesFunctions)

        loadFunctions(force=True)
        self.assertNotIn('testFunc', _SeriesFunctions)
