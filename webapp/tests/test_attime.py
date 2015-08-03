from mock import patch
import datetime
try:
    import unittest2 as unittest
except ImportError:
    import unittest
from django.test import TestCase
from django.utils import timezone
from graphite.render.attime import parseTimeReference, parseATTime

MOCK_DATE = datetime.datetime(2015, 1, 1, 11, 00)


class parseTimeTest(TestCase):

    def setUp(self):
        self.patcher = patch.object(timezone, 'now', return_value=MOCK_DATE)
        self.mock_now = self.patcher.start()

    def tearDown(self):
        self.patcher.stop()


class parseTimeReferenceTest(parseTimeTest):

    def test_parse_empty_return_now(self):
        time_ref = parseTimeReference('')
        self.assertEquals(time_ref, MOCK_DATE)

    def test_parse_None_return_now(self):
        time_ref = parseTimeReference(None)
        self.assertEquals(time_ref, MOCK_DATE)

    def test_parse_random_string_raise_Exception(self):
        with self.assertRaises(Exception):
            time_ref = parseTimeReference("random")

    def test_parse_now_return_now(self):
        time_ref = parseTimeReference("now")
        self.assertEquals(time_ref, MOCK_DATE)

    def test_parse_colon_raises_ValueError(self):
        with self.assertRaises(ValueError):
            time_ref = parseTimeReference(":")

    def test_parse_hour_return_hour_of_today(self):
        time_ref = parseTimeReference("8:50")
        expected = datetime.datetime(MOCK_DATE.year, MOCK_DATE.month, MOCK_DATE.day, 8, 50)
        self.assertEquals(time_ref, expected)

    def test_parse_hour_am(self):
        time_ref = parseTimeReference("8:50am")
        expected = datetime.datetime(MOCK_DATE.year, MOCK_DATE.month, MOCK_DATE.day, 8, 50)
        self.assertEquals(time_ref, expected)

    def test_parse_hour_pm(self):
        time_ref = parseTimeReference("8:50pm")
        expected = datetime.datetime(MOCK_DATE.year, MOCK_DATE.month, MOCK_DATE.day, 20, 50)
        self.assertEquals(time_ref, expected)

    def test_parse_noon(self):
        time_ref = parseTimeReference("noon")
        expected = datetime.datetime(MOCK_DATE.year, MOCK_DATE.month, MOCK_DATE.day, 12, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_midnight(self):
        time_ref = parseTimeReference("midnight")
        expected = datetime.datetime(MOCK_DATE.year, MOCK_DATE.month, MOCK_DATE.day, 0, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_teatime(self):
        time_ref = parseTimeReference("teatime")
        expected = datetime.datetime(MOCK_DATE.year, MOCK_DATE.month, MOCK_DATE.day, 16, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_yesterday(self):
        time_ref = parseTimeReference("yesterday")
        expected = datetime.datetime(2014, 12, 31, 0, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_tomorrow(self):
        time_ref = parseTimeReference("tomorrow")
        expected = datetime.datetime(2015, 1, 2, 0, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_MM_slash_DD_slash_YY(self):
        time_ref = parseTimeReference("02/25/15")
        expected = datetime.datetime(2015, 2, 25, 0, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_MM_slash_DD_slash_YYYY(self):
        time_ref = parseTimeReference("02/25/2015")
        expected = datetime.datetime(2015, 2, 25, 0, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_YYYYMMDD(self):
        time_ref = parseTimeReference("20140606")
        expected = datetime.datetime(2014, 6, 6, 0, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_onedigits(self):
        time_ref = parseTimeReference("january8")
        expected = datetime.datetime(2015, 1, 8, 0, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_twodigits(self):
        time_ref = parseTimeReference("january10")
        expected = datetime.datetime(2015, 1, 10, 0, 0)
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_threedigits_raise_ValueError(self):
        with self.assertRaises(ValueError):
            time_ref = parseTimeReference("january800")

    def test_parse_MonthName_without_DayOfMonth_raise_Exception(self):
        with self.assertRaises(Exception):
            time_ref = parseTimeReference("january")

    def test_parse_monday_return_monday_before_now(self):
        time_ref = parseTimeReference("monday")
        expected = datetime.datetime(2014, 12, 29, 0, 0)
        self.assertEquals(time_ref, expected)


class parseATTimeTest(parseTimeTest):

    @unittest.expectedFailure
    def test_parse_noon_plus_yesterday(self):
        time_ref = parseATTime("noon+yesterday")
        expected = datetime.datetime(MOCK_DATE.year, MOCK_DATE.month, MOCK_DATE.day - 1, 12, 00)
        self.assertEquals(time_ref, expected)
