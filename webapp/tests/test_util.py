import os
import shutil
import time
import whisper

from django.test import TestCase

from django.conf import settings
from graphite import util
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


class UtilTest(TestCase):

    # TODO: Determine how to craft the user object
    #def test_getProfile(self):
    #    request = {user: {is_authenticated:

    def test_getProfileByUsername(self):
        self.assertEqual( util.getProfileByUsername('unknown'), None)
#        self.assertEqual( util.getProfileByUsername('default'), 'default' )

    def test_is_local_interface(self):
        addresses = ['127.0.0.1', '127.0.0.1:8080', '8.8.8.8']
        results = [ util.is_local_interface(a) for a in addresses ]
        self.assertEqual( results, [True, True, False] )

        addresses = ['::1', '[::1]:8080', '[::1]']
        results = [ util.is_local_interface(a) for a in addresses ]
        self.assertEqual( results, [True, True, True] )

        with self.assertRaises(Exception):
            addresses = ['::1:8080']
            results = [ util.is_local_interface(a) for a in addresses ]

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
        try:
            os.makedirs(worker1.replace('cpu.wsp', ''))
            os.makedirs(worker2.replace('cpu.wsp', ''))
        except OSError:
            pass

        open(os.path.join(settings.WHISPER_DIR, 'bogus_file.txt'), 'a').close()
        whisper.create(worker1, [(1, 60)])
        whisper.create(worker2, [(1, 60)])

        ts = int(time.time())
        whisper.update(worker1, 1, ts)
        whisper.update(worker2, 2, ts)

    def wipe_whisper_hosts(self):
        try:
            os.remove(self.hostcpu.replace('hostname', 'worker1'))
            os.remove(self.hostcpu.replace('hostname', 'worker2'))
            os.remove(os.path.join(settings.WHISPER_DIR, 'bogus_file.txt'))
            shutil.rmtree(self.hostcpu.replace('hostname/cpu.wsp', ''))
        except OSError:
            pass

    def test_write_index(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        self.assertEqual(None, util.write_index() )
        self.assertEqual(None, util.write_index(settings.WHISPER_DIR, settings.CERES_DIR, settings.INDEX_FILE) )
