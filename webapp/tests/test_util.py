import os
import shutil
import socket
import time
import whisper
import pytz

from datetime import datetime
from mock import patch

from .base import TestCase

from django.conf import settings
from graphite import util
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


class UtilTest(TestCase):

    def test_epoch_tz_aware(self):
        dt = pytz.utc.localize(datetime(1970, 1, 1, 0, 10, 0, 0))
        self.assertEqual(util.epoch(dt), 600)

        dt = pytz.timezone('Europe/Berlin').localize(datetime(1970, 1, 1, 1, 10, 0, 0))
        self.assertEqual(util.epoch(dt), 600)

    @patch('graphite.logger.log.warning')
    def test_epoch_naive(self, mock_log):
        with self.settings(TIME_ZONE='UTC'):
            dt = datetime(1970, 1, 1, 0, 10, 0, 0)
            self.assertEqual(util.epoch(dt), 600)
            self.assertEqual(mock_log.call_count, 1)
            self.assertEqual(len(mock_log.call_args[0]), 1)
            self.assertRegexpMatches(mock_log.call_args[0][0], 'epoch\(\) called with non-timezone-aware datetime in test_epoch_naive at .+/webapp/tests/test_util\.py:[0-9]+')

        with self.settings(TIME_ZONE='Europe/Berlin'):
            dt = datetime(1970, 1, 1, 1, 10, 0, 0)
            self.assertEqual(util.epoch(dt), 600)
            self.assertEqual(mock_log.call_count, 2)
            self.assertEqual(len(mock_log.call_args[0]), 1)
            self.assertRegexpMatches(mock_log.call_args[0][0], 'epoch\(\) called with non-timezone-aware datetime in test_epoch_naive at .+/webapp/tests/test_util\.py:[0-9]+')

    def test_epoch_to_dt(self):
        dt = pytz.utc.localize(datetime(1970, 1, 1, 0, 10, 0, 0))
        self.assertEqual(util.epoch_to_dt(600), dt)

    def test_is_local_interface_ipv4(self):
        addresses = ['127.0.0.1', '127.0.0.1:8080', '8.8.8.8']
        results = [ util.is_local_interface(a) for a in addresses ]
        self.assertEqual( results, [True, True, False] )

    def test_is_local_interface_ipv6(self):
        # we need to know whether the host provides an ipv6 callback address
        ipv6_support = True
        try:
            sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
            sock.bind( ('::1', 0) )
            sock.close()
        except Exception:
            ipv6_support = False

        addresses = ['::1', '[::1]:8080', '[::1]', '::1:8080']
        results = [ util.is_local_interface(a) for a in addresses ]
        if ipv6_support:
            self.assertEqual( results, [True, True, True, False] )
        else:
            self.assertEqual( results, [False, False, False, False] )

    def test_is_local_interface_dns(self):
        addresses = ['localhost', socket.gethostname(), 'google.com']
        results = [ util.is_local_interface(a) for a in addresses ]
        self.assertEqual( results, [True, True, False] )

    def test_is_escaped_pattern(self):
        self.assertFalse( util.is_escaped_pattern('asdf') )
        self.assertTrue( util.is_escaped_pattern('a\*b') )
        self.assertTrue( util.is_escaped_pattern('a\?b') )
        self.assertTrue( util.is_escaped_pattern('a\[b') )
        self.assertTrue( util.is_escaped_pattern('a\{b') )
        self.assertFalse( util.is_escaped_pattern('a*b') )
        self.assertFalse( util.is_escaped_pattern('a?b') )
        self.assertFalse( util.is_escaped_pattern('a[b') )
        self.assertFalse( util.is_escaped_pattern('a{b') )

    def test_find_escaped_pattern_fields(self):
        self.assertEqual( list(util.find_escaped_pattern_fields('a.b.c.d')), [])
        self.assertEqual( list(util.find_escaped_pattern_fields('a\*.b.c.d')), [0])
        self.assertEqual( list(util.find_escaped_pattern_fields('a.b.\[c].d')), [2])

    hostcpu = os.path.join(settings.WHISPER_DIR, 'hosts/hostname/cpu.wsp')

    def create_whisper_hosts(self):
        worker1 = self.hostcpu.replace('hostname', 'worker1')
        worker2 = self.hostcpu.replace('hostname', 'worker2')
        bogus_file = os.path.join(settings.WHISPER_DIR, 'a/b/c/bogus_file.txt')

        try:
            os.makedirs(worker1.replace('cpu.wsp', ''))
            os.makedirs(worker2.replace('cpu.wsp', ''))
            os.makedirs(bogus_file.replace('bogus_file.txt', ''))
        except OSError:
            pass

        open(bogus_file, 'a').close()
        whisper.create(worker1, [(1, 60)])
        whisper.create(worker2, [(1, 60)])

        ts = int(time.time())
        whisper.update(worker1, 1, ts)
        whisper.update(worker2, 2, ts)

    def wipe_whisper_hosts(self):
        try:
            os.remove(self.hostcpu.replace('hostname', 'worker1'))
            os.remove(self.hostcpu.replace('hostname', 'worker2'))
            os.remove(os.path.join(settings.WHISPER_DIR, 'a/b/c/bogus_file.txt'))
            shutil.rmtree(self.hostcpu.replace('hostname/cpu.wsp', ''))
            shutil.rmtree(os.path.join(settings.WHISPER_DIR, 'a'))
        except OSError:
            pass

    def test_write_index(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        self.assertEqual(None, util.write_index() )
        self.assertEqual(None, util.write_index(settings.WHISPER_DIR, settings.CERES_DIR, settings.INDEX_FILE) )

    def test_load_module(self):
        with self.assertRaises(IOError):
            module = util.load_module('test', member=None)
