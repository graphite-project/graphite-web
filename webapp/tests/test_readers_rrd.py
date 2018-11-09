from .base import TestCase

import os
from os.path import join, isdir
import rrdtool
import shutil
import six
import time

from django.conf import settings


from graphite.readers import RRDReader
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


class RRDReaderTests(TestCase):
    test_dir = join(settings.RRD_DIR)

    start_ts = 0
    step = 60
    points = 100

    # Create/wipe test whisper files
    hostcpu = os.path.join(test_dir, 'hosts/worker1/cpu.rrd')

    # TODO Fix this!
    def create_rrd(self):
        if not isdir(self.test_dir):
            os.makedirs(self.test_dir)
        try:
            os.makedirs(self.hostcpu.replace('cpu.rrd', ''))
        except OSError:
            pass

        self.start_ts = int(time.time())
        rrdtool.create(self.hostcpu, '--start', str(self.start_ts),
                       '--step', str(self.step),
                       'RRA:AVERAGE:0.5:1:{}'.format(self.points),
                       'DS:cpu:GAUGE:60:U:U')

    def wipe_rrd(self):
        try:
            shutil.rmtree(self.test_dir)
        except OSError:
            pass

    # Confirm the reader object is not none
    def test_RRDReader_init(self):
        self.create_rrd()
        self.addCleanup(self.wipe_rrd)

        reader = RRDReader(self.hostcpu, 'cpu')
        self.assertIsNotNone(reader)

    # must return a 'str' object on both py2 and py3 independent of the type of
    # the argument (which is a 'unicode' on py2)
    def test_RRDReader_convert_fs_path(self):
        path = RRDReader._convert_fs_path(six.u(self.hostcpu))
        self.assertIsInstance(path, str)

    # Confirm the intervals
    def test_RRDReader_get_intervals(self):
        self.create_rrd()
        self.addCleanup(self.wipe_rrd)

        reader = RRDReader(self.hostcpu, 'cpu')

        # Intervals are calculated on the actual time so tolerate a 2 second
        # deviation for delays caused between file creation and test.
        for interval in reader.get_intervals():
            self.assertAlmostEqual(interval.start,
                                   self.start_ts - self.points * self.step,
                                   delta=2)
            self.assertAlmostEqual(interval.end, self.start_ts, delta=2)

    # Confirm fetch works.
    def test_RRDReader_fetch(self):
        self.create_rrd()
        self.addCleanup(self.wipe_rrd)

        # insert some data
        for ts in range(self.start_ts + 60, self.start_ts + 10 * self.step,
                        self.step):
            rrdtool.update(self.hostcpu, '{}:42'.format(ts))

        reader = RRDReader(self.hostcpu, 'cpu')

        (time_info, values) = reader.fetch(self.start_ts + self.step,
                                           self.start_ts + self.step * 2)
        self.assertEqual(list(values), [42.0])

    def test_RRDReader_get_datasources(self):
        self.create_rrd()
        self.addCleanup(self.wipe_rrd)

        datasource = RRDReader.get_datasources(self.hostcpu)
        self.assertEqual(datasource, ['cpu'])

    def test_RRDReader_get_retention(self):
        self.create_rrd()
        self.addCleanup(self.wipe_rrd)

        retentions = RRDReader.get_retention(self.hostcpu)
        self.assertEqual(retentions, self.points * self.step)
