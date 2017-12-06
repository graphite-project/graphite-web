from .base import TestCase

import os
import mock
import shutil
import time

from django.conf import settings

import whisper
import gzip

from graphite.readers import WhisperReader, GzippedWhisperReader
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


class WhisperReadersTests(TestCase):

    start_ts = 0

    # Create/wipe test whisper files
    hostcpu = os.path.join(settings.WHISPER_DIR, 'hosts/hostname/cpu.wsp')
    worker1 = hostcpu.replace('hostname', 'worker1')
    worker2 = hostcpu.replace('hostname', 'worker2')
    worker3 = hostcpu.replace('hostname', 'worker3')
    worker4 = hostcpu.replace('hostname', 'worker4')
    worker4 = worker4.replace('cpu.wsp', 'cpu.wsp.gz')

    def create_whisper_hosts(self):
        self.start_ts = int(time.time())
        try:
            os.makedirs(self.worker1.replace('cpu.wsp', ''))
            os.makedirs(self.worker2.replace('cpu.wsp', ''))
            os.makedirs(self.worker3.replace('cpu.wsp', ''))
            os.makedirs(self.worker4.replace('cpu.wsp.gz', ''))
        except OSError:
            pass

        whisper.create(self.worker1, [(1, 60)])
        whisper.create(self.worker2, [(1, 60)])
        open(self.worker3, 'a').close()

        whisper.update(self.worker1, 1, self.start_ts)
        whisper.update(self.worker2, 2, self.start_ts)

        with open(self.worker1, 'rb') as f_in, gzip.open(self.worker4, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)

    def wipe_whisper_hosts(self):
        try:
            os.remove(self.worker1)
            os.remove(self.worker2)
            os.remove(self.worker3)
            os.remove(self.worker4)
            shutil.rmtree(os.path.join(settings.WHISPER_DIR, 'hosts'))
        except OSError:
            pass

    #
    # GzippedWHisper Reader tests
    #

    # Confirm the reader object is not none
    def test_GzippedWhisperReader_init(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        reader = GzippedWhisperReader(self.worker4, 'hosts.worker4.cpu')
        self.assertIsNotNone(reader)

    # Confirm the intervals
    #  Because the intervals returned from Whisper are subsecond,
    #  we truncate to int for this comparison, otherwise it's impossible
    def test_GzippedWhisperReader_get_intervals(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        reader = GzippedWhisperReader(self.worker4, 'hosts.worker4.cpu')
        ts = int(time.time())
        intervals = reader.get_intervals()
        for interval in intervals:
          self.assertEqual(int(interval.start), ts - 60)
          self.assertIn(int(interval.end), [ts, ts - 1])

        # read it again to validate cache works
        intervals = reader.get_intervals()
        for interval in intervals:
          self.assertEqual(int(interval.start),ts - 60)
          self.assertIn(int(interval.end), [ts, ts - 1])

    # Confirm fetch works.
    def test_GzippedWhisperReader_fetch(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        reader = GzippedWhisperReader(self.worker4, 'hosts.worker4.cpu')
        (_, values) = reader.fetch(self.start_ts-5, self.start_ts)
        self.assertEqual(values, [None, None, None, None, 1.0])

    #
    # WHisper Reader tests
    #

    # Confirm the reader object is not none
    def test_WhisperReader_init(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        reader = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        self.assertIsNotNone(reader)

    # Confirm the intervals
    #  Because the intervals returned from Whisper are subsecond,
    #  we truncate to int for this comparison, otherwise it's impossible
    def test_WhisperReader_get_intervals(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        reader = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        ts = int(time.time())
        intervals = reader.get_intervals()
        for interval in intervals:
          self.assertEqual(int(interval.start),ts - 60)
          self.assertIn(int(interval.end), [ts, ts - 1])

        # read it again to validate cache works
        intervals = reader.get_intervals()
        for interval in intervals:
          self.assertEqual(int(interval.start),ts - 60)
          self.assertIn(int(interval.end), [ts, ts - 1])

    # Confirm get_raw_step works
    def test_WhisperReader_get_raw_step(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        reader = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        raw_step = reader.get_raw_step()
        self.assertEqual(int(raw_step),1)

        # read it again to validate cache works
        raw_step = reader.get_raw_step()
        self.assertEqual(int(raw_step),1)

    # Confirm fetch works.
    def test_WhisperReader_fetch(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        reader = WhisperReader(self.worker1, 'hosts.worker1.cpu')
        (_, values) = reader.fetch(self.start_ts-5, self.start_ts)
        self.assertEqual(values, [None, None, None, None, 1.0])

    # Whisper Reader broken file
    @mock.patch('whisper.fetch')
    def test_WhisperReader_fetch_returns_no_data(self, whisper_fetch):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        reader = WhisperReader(self.worker1, 'hosts.worker1.cpu')

        whisper_fetch.return_value = None

        self.assertEqual(reader.fetch(self.start_ts-5, self.start_ts), None)

    # Whisper Reader broken file
    def test_WhisperReader_broken_file(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        # Test broken whisper file
        f = open(self.worker2, 'rb+')
        f.seek(10)
        f.write(b'Bad Data')
        f.close()

        reader = WhisperReader(self.worker2, 'hosts.worker2.cpu')

        with self.assertRaises(Exception):
            reader.fetch(self.start_ts-5, self.start_ts)

    # Whisper Reader missing file
    @mock.patch('graphite.logger.log.exception')
    def test_WhisperReader_missing_file(self, log_exception):
        path = 'missing/file.wsp'
        reader = WhisperReader(path, 'hosts.worker2.cpu')

        self.assertEqual(reader.fetch(self.start_ts-5, self.start_ts), None)
        log_exception.assert_called_with("Failed fetch of whisper file '%s'" % path)

    # Whisper Reader CarbonLink Query returns a dict
    @mock.patch('graphite.carbonlink.CarbonLinkPool.query')
    def test_WhisperReader_CarbonLinkQuery(self, carbonlink_query):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        carbonlink_query.return_value = {}

        reader = WhisperReader(self.worker1, 'hosts.worker1.cpu')

        (_, values) = reader.fetch(self.start_ts-5, self.start_ts)
        self.assertEqual(values, [None, None, None, None, 1.0])
