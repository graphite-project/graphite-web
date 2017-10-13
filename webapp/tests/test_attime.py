try:
    import unittest2 as unittest
except ImportError:
    import unittest
from graphite.render.attime import parseTimeReference, parseATTime, parseTimeOffset, getUnitString

from datetime import datetime, timedelta

from django.utils import timezone
from .base import TestCase
import pytz
import mock


def mockDateTime(year, month, day, hour, minute, second):
  class MockedDateTime(datetime):
      @classmethod
      def now(cls, tzinfo=None):
          if tzinfo:
            return tzinfo.localize(cls(year, month, day, hour, minute, second))
          return cls(year, month, day, hour, minute, second)

  return MockedDateTime


@mock.patch('graphite.render.attime.datetime', mockDateTime(2015, 3, 8, 12, 0, 0))
class ATTimeTimezoneTests(TestCase):
    default_tz = timezone.get_current_timezone()
    specified_tz = pytz.timezone("America/Los_Angeles")
    MOCK_DATE = specified_tz.localize(datetime(2015, 1, 1, 11, 00))

    def test_should_return_absolute_time(self):
        time_string = '12:0020150308'
        expected_time = self.default_tz.localize(datetime.strptime(time_string,'%H:%M%Y%m%d'))
        actual_time = parseATTime(time_string)
        self.assertEqual(actual_time, expected_time)

    def test_absolute_time_should_respect_tz(self):
        time_string = '12:0020150308'
        expected_time = self.specified_tz.localize(datetime.strptime(time_string, '%H:%M%Y%m%d'))
        actual_time = parseATTime(time_string, self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_should_return_absolute_time_short(self):
        time_string = '9:0020150308'
        expected_time = self.default_tz.localize(datetime.strptime(time_string,'%H:%M%Y%m%d'))
        actual_time = parseATTime(time_string)
        self.assertEqual(actual_time, expected_time)

    def test_absolute_time_should_respect_tz_short(self):
        time_string = '9:0020150308'
        expected_time = self.specified_tz.localize(datetime.strptime(time_string, '%H:%M%Y%m%d'))
        actual_time = parseATTime(time_string, self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_absolute_time_YYYYMMDD(self):
        time_string = '20150110'
        expected_time = self.specified_tz.localize(datetime.strptime(time_string, '%Y%m%d'))
        actual_time = parseATTime(time_string, self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_midnight(self):
        expected_time = self.specified_tz.localize(datetime.strptime("0:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_offset_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("1:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight+1h", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_relative_day_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("0:00_20150309", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight_tomorrow", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_relative_day_and_offset_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("3:00_20150309", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight_tomorrow+3h", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_should_return_current_time(self):
        expected_time = self.default_tz.localize(datetime.strptime("12:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("now")
        self.assertEqual(actual_time, expected_time)

    def test_now_should_respect_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("12:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("now", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_relative_time_in_alternate_zone(self):
        expected_time = self.specified_tz.localize(datetime.strptime("11:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("-1h", self.specified_tz)
        self.assertEqual(actual_time.hour, expected_time.hour)

    def test_should_handle_dst_boundary(self):
        expected_time = self.specified_tz.localize(datetime.strptime("04:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight+3h", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    def test_parse_naive_datetime(self):
        time_ref = parseATTime(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50), self.specified_tz)
        expected = self.specified_tz.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_zone_aware_datetime(self):
        time_ref = parseATTime(self.specified_tz.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50)), self.specified_tz)
        expected = self.specified_tz.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)


@mock.patch('graphite.render.attime.datetime', mockDateTime(2015, 1, 1, 11, 0, 0))
class parseTimeReferenceTest(TestCase):

    zone = pytz.utc
    MOCK_DATE = zone.localize(datetime(2015, 1, 1, 11, 00))

    def test_parse_empty_return_now(self):
        time_ref = parseTimeReference('')
        self.assertEquals(time_ref, self.MOCK_DATE)

    def test_parse_None_return_now(self):
        time_ref = parseTimeReference(None)
        self.assertEquals(time_ref, self.MOCK_DATE)

    def test_parse_random_string_raise_Exception(self):
        with self.assertRaises(Exception):
            parseTimeReference("random")

    def test_parse_now_return_now(self):
        time_ref = parseTimeReference("now")
        self.assertEquals(time_ref, self.MOCK_DATE)

    def test_parse_colon_raises_ValueError(self):
        with self.assertRaises(ValueError):
            parseTimeReference(":")

    def test_parse_naive_datetime(self):
        time_ref = parseTimeReference(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_zone_aware_datetime(self):
        time_ref = parseTimeReference(self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50)))
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_return_hour_of_today(self):
        time_ref = parseTimeReference("8:50")
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_am(self):
        time_ref = parseTimeReference("8:50am")
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_pm(self):
        time_ref = parseTimeReference("8:50pm")
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 20, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_only_am(self):
        time_ref = parseTimeReference("8am")
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_only_pm(self):
        time_ref = parseTimeReference("10pm")
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 22, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_noon(self):
        time_ref = parseTimeReference("noon")
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 12, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_midnight(self):
        time_ref = parseTimeReference("midnight")
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_teatime(self):
        time_ref = parseTimeReference("teatime")
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 16, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_yesterday(self):
        time_ref = parseTimeReference("yesterday")
        expected = self.zone.localize(datetime(2014, 12, 31, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_today(self):
        time_ref = parseTimeReference("today")
        expected = self.zone.localize(datetime(2015, 1, 1, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_tomorrow(self):
        time_ref = parseTimeReference("tomorrow")
        expected = self.zone.localize(datetime(2015, 1, 2, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MM_slash_DD_slash_YY(self):
        time_ref = parseTimeReference("02/25/15")
        expected = self.zone.localize(datetime(2015, 2, 25, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MM_slash_DD_slash_YYYY(self):
        time_ref = parseTimeReference("02/25/2015")
        expected = self.zone.localize(datetime(2015, 2, 25, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_YYYYMMDD(self):
        time_ref = parseTimeReference("20140606")
        expected = self.zone.localize(datetime(2014, 6, 6, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_onedigits(self):
        time_ref = parseTimeReference("january8")
        expected = self.zone.localize(datetime(2015, 1, 8, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_twodigits(self):
        time_ref = parseTimeReference("january10")
        expected = self.zone.localize(datetime(2015, 1, 10, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_threedigits_raise_ValueError(self):
        with self.assertRaises(ValueError):
            parseTimeReference("january800")

    def test_parse_MonthName_without_DayOfMonth_raise_Exception(self):
        with self.assertRaises(Exception):
            parseTimeReference("january")

    def test_parse_monday_return_monday_before_now(self):
        time_ref = parseTimeReference("monday")
        expected = self.zone.localize(datetime(2014, 12, 29, 0, 0))
        self.assertEquals(time_ref, expected)


@mock.patch('graphite.render.attime.datetime', mockDateTime(2010, 3, 30, 00, 0, 0))
class parseTimeReferenceTestBug551771(TestCase):
    zone = pytz.utc

    def test_parse_MM_slash_DD_slash_YY(self):
        time_ref = parseTimeReference("02/23/10")
        expected = self.zone.localize(datetime(2010, 2, 23, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_YYYYMMDD(self):
        time_ref = parseTimeReference("20100223")
        expected = self.zone.localize(datetime(2010, 2, 23, 0, 0))
        self.assertEquals(time_ref, expected)


class parseTimeOffsetTest(TestCase):

    def test_parse_None_returns_empty_timedelta(self):
        time_ref = parseTimeOffset(None)
        expected = timedelta(0)
        self.assertEquals(time_ref, expected)

    def test_parse_integer_raises_TypeError(self):
        with self.assertRaises(TypeError):
            parseTimeOffset(1)

    def test_parse_string_starting_neither_with_minus_nor_digit_raises_KeyError(self):
        with self.assertRaises(KeyError):
            parseTimeOffset("Something")

    def test_parse_m_as_unit_raises_Exception(self):
        with self.assertRaises(Exception):
            parseTimeOffset("1m")

    def test_parse_digits_only_raises_exception(self):
        with self.assertRaises(Exception):
            parseTimeOffset("10")

    def test_parse_alpha_only_raises_KeyError(self):
        with self.assertRaises(KeyError):
            parseTimeOffset("month")

    def test_parse_minus_only_returns_zero(self):
        time_ref = parseTimeOffset("-")
        expected = timedelta(0)
        self.assertEquals(time_ref, expected)

    def test_parse_plus_only_returns_zero(self):
        time_ref = parseTimeOffset("+")
        expected = timedelta(0)
        self.assertEquals(time_ref, expected)

    def test_parse_ten_days(self):
        time_ref = parseTimeOffset("10days")
        expected = timedelta(10)
        self.assertEquals(time_ref, expected)

    def test_parse_zero_days(self):
        time_ref = parseTimeOffset("0days")
        expected = timedelta(0)
        self.assertEquals(time_ref, expected)

    def test_parse_minus_ten_days(self):
        time_ref = parseTimeOffset("-10days")
        expected = timedelta(-10)
        self.assertEquals(time_ref, expected)

    def test_parse_five_seconds(self):
        time_ref = parseTimeOffset("5seconds")
        expected = timedelta(seconds=5)
        self.assertEquals(time_ref, expected)

    def test_parse_five_minutes(self):
        time_ref = parseTimeOffset("5minutes")
        expected = timedelta(minutes=5)
        self.assertEquals(time_ref, expected)

    def test_parse_five_hours(self):
        time_ref = parseTimeOffset("5hours")
        expected = timedelta(hours=5)
        self.assertEquals(time_ref, expected)

    def test_parse_five_weeks(self):
        time_ref = parseTimeOffset("5weeks")
        expected = timedelta(weeks=5)
        self.assertEquals(time_ref, expected)

    def test_parse_one_month_returns_thirty_days(self):
        time_ref = parseTimeOffset("1month")
        expected = timedelta(30)
        self.assertEquals(time_ref, expected)

    def test_parse_two_months_returns_sixty_days(self):
        time_ref = parseTimeOffset("2months")
        expected = timedelta(60)
        self.assertEquals(time_ref, expected)

    def test_parse_twelve_months_returns_360_days(self):
        time_ref = parseTimeOffset("12months")
        expected = timedelta(360)
        self.assertEquals(time_ref, expected)

    def test_parse_one_year_returns_365_days(self):
        time_ref = parseTimeOffset("1year")
        expected = timedelta(365)
        self.assertEquals(time_ref, expected)

    def test_parse_two_years_returns_730_days(self):
        time_ref = parseTimeOffset("2years")
        expected = timedelta(730)
        self.assertEquals(time_ref, expected)


class getUnitStringTest(TestCase):

    def test_get_seconds(self):
        test_cases = ['s', 'se', 'sec', 'second', 'seconds']
        for test_case in test_cases:
            result = getUnitString(test_case)
            self.assertEquals(result, 'seconds')

    def test_get_minutes(self):
        test_cases = ['min', 'minute', 'minutes']
        for test_case in test_cases:
            result = getUnitString(test_case)
            self.assertEquals(result, 'minutes')

    def test_get_hours(self):
        test_cases = ['h', 'ho', 'hour', 'hours']
        for test_case in test_cases:
            result = getUnitString(test_case)
            self.assertEquals(result, 'hours')

    def test_get_days(self):
        test_cases = ['d', 'da', 'day', 'days']
        for test_case in test_cases:
            result = getUnitString(test_case)
            self.assertEquals(result, 'days')

    def test_get_weeks(self):
        test_cases = ['w', 'we', 'week', 'weeks']
        for test_case in test_cases:
            result = getUnitString(test_case)
            self.assertEquals(result, 'weeks')

    def test_get_months(self):
        test_cases = ['mon', 'month', 'months']
        for test_case in test_cases:
            result = getUnitString(test_case)
            self.assertEquals(result, 'months')

    def test_get_years(self):
        test_cases = ['y', 'ye', 'year', 'years']
        for test_case in test_cases:
            result = getUnitString(test_case)
            self.assertEquals(result, 'years')

    def test_m_raises_Exception(self):
        with self.assertRaises(Exception):
            result = getUnitString("m")

    def test_integer_raises_Exception(self):
        with self.assertRaises(Exception):
            result = getUnitString(1)


@mock.patch('graphite.render.attime.datetime', mockDateTime(2016, 2, 29, 00, 0, 0))
class parseATTimeTestLeapYear(TestCase):
    zone = pytz.utc

    def test_parse_last_year(self):
        time_ref = parseATTime("-1year")
        expected = self.zone.localize(datetime(2015, 3, 1, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_last_leap_year(self):
        time_ref = parseATTime("-4years")
        expected = self.zone.localize(datetime(2012, 3, 1, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_last_month(self):
        time_ref = parseATTime("-1month")
        expected = self.zone.localize(datetime(2016, 1, 30, 0, 0))
        self.assertEquals(time_ref, expected)


@mock.patch('graphite.render.attime.datetime',mockDateTime(2013, 2, 28, 00, 0, 0))
class parseATTimeTestLeapYear2(TestCase):
    zone = pytz.utc

    def test_parse_last_year(self):
        time_ref = parseATTime("-1year")
        expected = self.zone.localize(datetime(2012, 2, 29, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_last_leap_year(self):
        time_ref = parseATTime("-4years")
        expected = self.zone.localize(datetime(2009, 3, 1, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_last_month(self):
        time_ref = parseATTime("-1month")
        expected = self.zone.localize(datetime(2013, 1, 29, 0, 0))
        self.assertEquals(time_ref, expected)


class parseATTimeTest(TestCase):
    zone = pytz.utc
    MOCK_DATE = zone.localize(datetime(2015, 1, 1, 11, 00))

    @unittest.expectedFailure
    def test_parse_noon_plus_yesterday(self):
        time_ref = parseATTime("noon+yesterday")
        expected = datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day - 1, 12, 00)
        self.assertEquals(time_ref, expected)


class parseATTimeTestNow(TestCase):
    default_tz = timezone.get_current_timezone()
    specified_tz = pytz.timezone("America/Los_Angeles")
    now = '11:0020171013'
    MOCK_DATE = specified_tz.localize(datetime(2015, 1, 1, 11, 00))

    def test_should_return_absolute_time(self):
        time_string = '12:0020150308'
        expected_time = self.default_tz.localize(datetime.strptime(time_string,'%H:%M%Y%m%d'))
        actual_time = parseATTime(time_string, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_absolute_time_should_respect_tz(self):
        time_string = '12:0020150308'
        expected_time = self.specified_tz.localize(datetime.strptime(time_string, '%H:%M%Y%m%d'))
        actual_time = parseATTime(time_string, self.specified_tz, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_should_return_absolute_time_short(self):
        time_string = '9:0020150308'
        expected_time = self.default_tz.localize(datetime.strptime(time_string,'%H:%M%Y%m%d'))
        actual_time = parseATTime(time_string, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_absolute_time_should_respect_tz_short(self):
        time_string = '9:0020150308'
        expected_time = self.specified_tz.localize(datetime.strptime(time_string, '%H:%M%Y%m%d'))
        actual_time = parseATTime(time_string, self.specified_tz, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_absolute_time_YYYYMMDD(self):
        time_string = '20150110'
        expected_time = self.specified_tz.localize(datetime.strptime(time_string, '%Y%m%d'))
        actual_time = parseATTime(time_string, self.specified_tz, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_midnight(self):
        expected_time = self.specified_tz.localize(datetime.strptime("0:00_20171013", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight", self.specified_tz, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_offset_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("1:00_20171013", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight+1h", self.specified_tz, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_relative_day_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("0:00_20171014", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight_tomorrow", self.specified_tz, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_relative_day_and_offset_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("3:00_20171014", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("midnight_tomorrow+3h", self.specified_tz, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_should_return_current_time(self):
        expected_time = self.default_tz.localize(datetime.strptime("11:00_20171013", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("now", now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_now_should_respect_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("11:00_20171013", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("now", self.specified_tz, now=self.now)
        self.assertEqual(actual_time, expected_time)

    def test_relative_time_in_alternate_zone(self):
        expected_time = self.specified_tz.localize(datetime.strptime("10:00_20171013", '%H:%M_%Y%m%d'))
        actual_time = parseATTime("-1h", self.specified_tz, now=self.now)
        self.assertEqual(actual_time.hour, expected_time.hour)

    def test_parse_naive_datetime(self):
        time_ref = parseATTime(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50), self.specified_tz, now=self.now)
        expected = self.specified_tz.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_zone_aware_datetime(self):
        time_ref = parseATTime(self.specified_tz.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50)), self.specified_tz, now=self.now)
        expected = self.specified_tz.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)


class parseTimeReferenceTestNow(TestCase):

    zone = pytz.utc
    MOCK_DATE = zone.localize(datetime(2015, 1, 1, 11, 00))
    now = zone.localize(datetime(2015, 1, 1, 11, 00))

    def test_parse_empty_return_now(self):
        time_ref = parseTimeReference('', now=self.now)
        self.assertEquals(time_ref, self.MOCK_DATE)

    def test_parse_None_return_now(self):
        time_ref = parseTimeReference(None, now=self.now)
        self.assertEquals(time_ref, self.MOCK_DATE)

    def test_parse_random_string_raise_Exception(self):
        with self.assertRaises(Exception):
            parseTimeReference("random", now=self.now)

    def test_parse_now_return_now(self):
        time_ref = parseTimeReference("now", now=self.now)
        self.assertEquals(time_ref, self.MOCK_DATE)

    def test_parse_colon_raises_ValueError(self):
        with self.assertRaises(ValueError):
            parseTimeReference(":", now=self.now)

    def test_parse_naive_datetime(self):
        time_ref = parseTimeReference(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50), now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_zone_aware_datetime(self):
        time_ref = parseTimeReference(self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50)), now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_return_hour_of_today(self):
        time_ref = parseTimeReference("8:50", now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_am(self):
        time_ref = parseTimeReference("8:50am", now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_pm(self):
        time_ref = parseTimeReference("8:50pm", now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 20, 50))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_only_am(self):
        time_ref = parseTimeReference("8am", now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 8, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_hour_only_pm(self):
        time_ref = parseTimeReference("10pm", now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 22, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_noon(self):
        time_ref = parseTimeReference("noon", now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 12, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_midnight(self):
        time_ref = parseTimeReference("midnight", now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_teatime(self):
        time_ref = parseTimeReference("teatime", now=self.now)
        expected = self.zone.localize(datetime(self.MOCK_DATE.year, self.MOCK_DATE.month, self.MOCK_DATE.day, 16, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_yesterday(self):
        time_ref = parseTimeReference("yesterday", now=self.now)
        expected = self.zone.localize(datetime(2014, 12, 31, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_today(self):
        time_ref = parseTimeReference("today", now=self.now)
        expected = self.zone.localize(datetime(2015, 1, 1, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_tomorrow(self):
        time_ref = parseTimeReference("tomorrow", now=self.now)
        expected = self.zone.localize(datetime(2015, 1, 2, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MM_slash_DD_slash_YY(self):
        time_ref = parseTimeReference("02/25/15", now=self.now)
        expected = self.zone.localize(datetime(2015, 2, 25, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MM_slash_DD_slash_YYYY(self):
        time_ref = parseTimeReference("02/25/2015", now=self.now)
        expected = self.zone.localize(datetime(2015, 2, 25, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_YYYYMMDD(self):
        time_ref = parseTimeReference("20140606", now=self.now)
        expected = self.zone.localize(datetime(2014, 6, 6, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_onedigits(self):
        time_ref = parseTimeReference("january8", now=self.now)
        expected = self.zone.localize(datetime(2015, 1, 8, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_twodigits(self):
        time_ref = parseTimeReference("january10", now=self.now)
        expected = self.zone.localize(datetime(2015, 1, 10, 0, 0))
        self.assertEquals(time_ref, expected)

    def test_parse_MonthName_DayOfMonth_threedigits_raise_ValueError(self):
        with self.assertRaises(ValueError):
            parseTimeReference("january800", now=self.now)

    def test_parse_MonthName_without_DayOfMonth_raise_Exception(self):
        with self.assertRaises(Exception):
            parseTimeReference("january", now=self.now)

    def test_parse_monday_return_monday_before_now(self):
        time_ref = parseTimeReference("monday", now=self.now)
        expected = self.zone.localize(datetime(2014, 12, 29, 0, 0))
        self.assertEquals(time_ref, expected)
