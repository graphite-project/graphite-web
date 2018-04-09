from .base import TestCase

import os
from os.path import join, isdir
import shutil
import time
import unittest

from django.conf import settings

try:
    import ceres
except ImportError:
    ceres = False

from graphite.readers import CeresReader
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


@unittest.skipIf(not ceres, 'ceres not installed')
class CeresReaderTests(TestCase):
    test_dir = join(settings.CERES_DIR)

    start_ts = int(time.time())

    def create_ceres(self, metric):
        if not isdir(self.test_dir):
            os.makedirs(self.test_dir)
        tree = ceres.CeresTree(self.test_dir)

        options = {'timeStep': 1}
        tree.createNode(metric, **options)

        tree.store(metric, [(self.start_ts, 60)])

    def wipe_ceres(self):
        try:
            shutil.rmtree(self.test_dir)
        except OSError:
            pass

    # Confirm the reader object is not none
    def test_CeresReader_init(self):
        self.create_ceres('ceres.reader.tests.worker1.cpu')
        self.addCleanup(self.wipe_ceres)

        reader = CeresReader(ceres.CeresTree(self.test_dir).getNode('ceres.reader.tests.worker1.cpu'), 'ceres.reader.tests.worker1.cpu')
        self.assertIsNotNone(reader)

    # Confirm the intervals
    def test_CeresReader_get_intervals(self):
        self.create_ceres('ceres.reader.tests.worker1.cpu')
        self.addCleanup(self.wipe_ceres)

        reader = CeresReader(ceres.CeresTree(self.test_dir).getNode('ceres.reader.tests.worker1.cpu'), 'ceres.reader.tests.worker1.cpu')
        intervals = reader.get_intervals()
        for interval in intervals:
          self.assertEqual(interval.start, self.start_ts)
          self.assertEqual(interval.end, self.start_ts+1)

    # Confirm fetch works.
    def test_CeresReader_fetch(self):
        self.create_ceres('ceres.reader.tests.worker1.cpu')
        self.addCleanup(self.wipe_ceres)

        reader = CeresReader(ceres.CeresTree(self.test_dir).getNode('ceres.reader.tests.worker1.cpu'), 'ceres.reader.tests.worker1.cpu')

        (_, values) = reader.fetch(self.start_ts, self.start_ts+1)
        self.assertEqual(values, [60])
