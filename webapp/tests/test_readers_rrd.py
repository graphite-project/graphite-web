from .base import TestCase

import os
from os.path import join, isdir
import shutil
import time

from django.conf import settings

#import rrdtool

from graphite.readers import RRDReader
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


class RRDReaderTests(TestCase):
    test_dir = join(settings.RRD_DIR)

    start_ts = int(time.time())

    # Create/wipe test whisper files
    hostcpu = os.path.join(test_dir, 'hosts/worker1/cpu.rrd')

    # TODO Fix this!
    def create_rrd(self):
        if not isdir(self.test_dir):
            os.makedirs(self.test_dir)
        try:
            os.makedirs(self.hostcpu.replace('cpu.wsp', ''))
        except OSError:
            pass

    def wipe_rrd(self):
        try:
            shutil.rmtree(self.test_dir)
        except OSError:
            pass

    # Confirm the reader object is not none
    def test_RRDReader_init(self):
        self.create_rrd()
        self.addCleanup(self.wipe_rrd)

        reader = RRDReader(self.hostcpu, 'hosts.worker1.cpu')
        self.assertIsNotNone(reader)

    # Confirm the intervals
#    def test_RRDReader_get_intervals(self):
#        self.create_rrd()
#        self.addCleanup(self.wipe_rrd)
#
#        reader = RRDReader(self.hostcpu, 'hosts.worker1.cpu')
#        intervals = reader.get_intervals()
#        for interval in intervals:
#          self.assertEqual(interval.start, self.start_ts)
#          self.assertEqual(interval.end, self.start_ts+1)

    # Confirm fetch works.
#    def test_RRDReader_fetch(self):
#        self.create_rrd()
#        self.addCleanup(self.wipe_rrd)
#
#        reader = RRDReader(self.hostcpu, 'hosts.worker1.cpu')
#
#        (time_info, values) = reader.fetch(self.start_ts, self.start_ts+1)
#        self.assertEqual(values, [60])
