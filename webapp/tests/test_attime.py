from datetime import datetime

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
