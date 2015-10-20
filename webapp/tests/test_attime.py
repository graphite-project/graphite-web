from datetime import datetime, timedelta

from django.utils import timezone
from django.test import TestCase
from graphite.render import attime
import pytz
import mock

class MockedDateTime(datetime):
    def __new__(cls, *args, **kwargs):
        return datetime.__new__(datetime, *args, **kwargs)
    @classmethod
    def now(cls):
        return cls(2015, 3, 8, 12, 0, 0)

class ATTimeTest(TestCase):
    default_tz = timezone.get_current_timezone()
    specified_tz = pytz.timezone("America/Los_Angeles")
    def test_should_return_absolute_time(self):
        time_string = '12:0020150308'

        expected_time = self.default_tz.localize(datetime.strptime(time_string,'%H:%M%Y%m%d'))
        actual_time = attime.parseATTime(time_string)
        self.assertEqual(actual_time, expected_time)

    def test_absolute_time_should_respect_tz(self):
        time_string = '12:0020150308'
        expected_time = self.specified_tz.localize(datetime.strptime(time_string, '%H:%M%Y%m%d'))
        actual_time = attime.parseATTime(time_string, self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    @mock.patch('graphite.render.attime.datetime', MockedDateTime)
    def test_midnight(self):
        expected_time = self.specified_tz.localize(datetime.strptime("0:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = attime.parseATTime("midnight", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    @mock.patch('graphite.render.attime.datetime', MockedDateTime)
    def test_offset_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("5:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = attime.parseATTime("midnight+5h", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    @mock.patch('graphite.render.attime.datetime', MockedDateTime)
    def test_relative_day_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("0:00_20150309", '%H:%M_%Y%m%d'))
        actual_time = attime.parseATTime("midnight_tomorrow", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    @mock.patch('graphite.render.attime.datetime', MockedDateTime)
    def test_relative_day_and_offset_with_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("3:00_20150309", '%H:%M_%Y%m%d'))
        actual_time = attime.parseATTime("midnight_tomorrow+3h", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    @mock.patch('graphite.render.attime.datetime', MockedDateTime)
    def test_should_return_current_time(self):
        expected_time = self.default_tz.localize(datetime.strptime("12:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = attime.parseATTime("now")
        self.assertEqual(actual_time, expected_time)

    @mock.patch('graphite.render.attime.datetime', MockedDateTime)
    def test_now_should_respect_tz(self):
        expected_time = self.specified_tz.localize(datetime.strptime("12:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = attime.parseATTime("now", self.specified_tz)
        self.assertEqual(actual_time, expected_time)

    @mock.patch('graphite.render.attime.datetime', MockedDateTime)
    def test_should_handle_dst_boundary(self):
        expected_time = self.specified_tz.localize(datetime.strptime("03:00_20150308", '%H:%M_%Y%m%d'))
        actual_time = attime.parseATTime("midnight+2h", self.specified_tz)
        self.assertEqual(actual_time, expected_time)


class parseTimeOffsetTest(TestCase):

    def test_parse_None_returns_empty_timedelta(self):
        time_ref = attime.parseTimeOffset(None)
        expected = timedelta(0)
        self.assertEquals(time_ref, expected)

    def test_parse_integer_raises_TypeError(self):
        with self.assertRaises(TypeError):
            attime.parseTimeOffset(1)

    def test_parse_string_starting_neither_with_minus_nor_digit_raises_KeyError(self):
        with self.assertRaises(KeyError):
            attime.parseTimeOffset("Something")

    def test_parse_m_as_unit_raises_Exception(self):
        with self.assertRaises(Exception):
            attime.parseTimeOffset("1m")

    def test_parse_digits_only_raises_exception(self):
        with self.assertRaises(Exception):
            attime.parseTimeOffset("10")

    def test_parse_alpha_only_raises_KeyError(self):
        with self.assertRaises(KeyError):
            attime.parseTimeOffset("month")

    def test_parse_minus_only_returns_zero(self):
        time_ref = attime.parseTimeOffset("-")
        expected = timedelta(0)
        self.assertEquals(time_ref, expected)

    def test_parse_plus_only_returns_zero(self):
        time_ref = attime.parseTimeOffset("+")
        expected = timedelta(0)
        self.assertEquals(time_ref, expected)

    def test_parse_ten_days(self):
        time_ref = attime.parseTimeOffset("10days")
        expected = timedelta(10)
        self.assertEquals(time_ref, expected)

    def test_parse_zero_days(self):
        time_ref = attime.parseTimeOffset("0days")
        expected = timedelta(0)
        self.assertEquals(time_ref, expected)

    def test_parse_minus_ten_days(self):
        time_ref = attime.parseTimeOffset("-10days")
        expected = timedelta(-10)
        self.assertEquals(time_ref, expected)

    def test_parse_five_seconds(self):
        time_ref = attime.parseTimeOffset("5seconds")
        expected = timedelta(seconds=5)
        self.assertEquals(time_ref, expected)

    def test_parse_five_minutes(self):
        time_ref = attime.parseTimeOffset("5minutes")
        expected = timedelta(minutes=5)
        self.assertEquals(time_ref, expected)

    def test_parse_five_hours(self):
        time_ref = attime.parseTimeOffset("5hours")
        expected = timedelta(hours=5)
        self.assertEquals(time_ref, expected)

    def test_parse_five_weeks(self):
        time_ref = attime.parseTimeOffset("5weeks")
        expected = timedelta(weeks=5)
        self.assertEquals(time_ref, expected)

    def test_parse_one_month_returns_thirty_days(self):
        time_ref = attime.parseTimeOffset("1month")
        expected = timedelta(30)
        self.assertEquals(time_ref, expected)

    def test_parse_two_months_returns_sixty_days(self):
        time_ref = attime.parseTimeOffset("2months")
        expected = timedelta(60)
        self.assertEquals(time_ref, expected)

    def test_parse_twelve_months_returns_360_days(self):
        time_ref = attime.parseTimeOffset("12months")
        expected = timedelta(360)
        self.assertEquals(time_ref, expected)

    def test_parse_one_year_returns_365_days(self):
        time_ref = attime.parseTimeOffset("1year")
        expected = timedelta(365)
        self.assertEquals(time_ref, expected)

    def test_parse_two_years_returns_730_days(self):
        time_ref = attime.parseTimeOffset("2years")
        expected = timedelta(730)
        self.assertEquals(time_ref, expected)


class getUnitStringTest(TestCase):

    def test_get_seconds(self):
        test_cases = ['s', 'se', 'sec', 'second', 'seconds']
        for test_case in test_cases:
            result = attime.getUnitString(test_case)
            self.assertEquals(result, 'seconds')

    def test_get_minutes(self):
        test_cases = ['min', 'minute', 'minutes']
        for test_case in test_cases:
            result = attime.getUnitString(test_case)
            self.assertEquals(result, 'minutes')

    def test_get_hours(self):
        test_cases = ['h', 'ho', 'hour', 'hours']
        for test_case in test_cases:
            result = attime.getUnitString(test_case)
            self.assertEquals(result, 'hours')

    def test_get_days(self):
        test_cases = ['d', 'da', 'day', 'days']
        for test_case in test_cases:
            result = attime.getUnitString(test_case)
            self.assertEquals(result, 'days')

    def test_get_weeks(self):
        test_cases = ['w', 'we', 'week', 'weeks']
        for test_case in test_cases:
            result = attime.getUnitString(test_case)
            self.assertEquals(result, 'weeks')

    def test_get_months(self):
        test_cases = ['mon', 'month', 'months']
        for test_case in test_cases:
            result = attime.getUnitString(test_case)
            self.assertEquals(result, 'months')

    def test_get_years(self):
        test_cases = ['y', 'ye', 'year', 'years']
        for test_case in test_cases:
            result = attime.getUnitString(test_case)
            self.assertEquals(result, 'years')

    def test_m_raises_Exception(self):
        with self.assertRaises(Exception):
            attime.getUnitString("m")

    def test_integer_raises_Exception(self):
        with self.assertRaises(Exception):
            attime.getUnitString(1)
