from __future__ import absolute_import

import gzip
import os
from os.path import join, dirname, isdir
import random
import shutil
import time
import unittest

try:
    from unittest.mock import patch
except ImportError:
    from mock import patch

try:
    import ceres
except ImportError:
    ceres = False
try:
    import whisper
except ImportError:
    whisper = False

from django.conf import settings

from graphite.intervals import Interval, IntervalSet
from graphite.node import LeafNode, BranchNode
from graphite.storage import Store, FindQuery, get_finder
from graphite.finders.standard import scandir
from graphite.finders.utils import BaseFinder
from graphite.readers.utils import BaseReader
from tests.base import TestCase


class FinderTest(TestCase):
    def test_custom_finder(self):
        store = Store(finders=[get_finder('tests.test_finders.DummyFinder')])
        nodes = list(store.find("foo"))
        self.assertEqual(len(nodes), 1)
        self.assertEqual(nodes[0].path, 'foo')

        nodes = list(store.find('bar.*'))
        self.assertEqual(len(nodes), 10)
        node = nodes[0]
        self.assertEqual(node.path.split('.')[0], 'bar')

        time_info, series = node.fetch(100, 200)
        self.assertEqual(time_info, (100, 200, 10))
        self.assertEqual(len(series), 10)


class DummyReader(BaseReader):
    __slots__ = ('path',)

    def __init__(self, path):
        self.path = path

    def fetch(self, start_time, end_time):
        npoints = (end_time - start_time) / 10
        return (start_time, end_time, 10), [
            random.choice([None, 1, 2, 3]) for i in range(npoints)
        ]

    def get_intervals(self):
        return IntervalSet([Interval(time.time() - 3600, time.time())])


class DummyFinder(BaseFinder):
    def find_nodes(self, query):
        if query.pattern == 'foo':
            yield BranchNode('foo')

        elif query.pattern == 'bar.*':
            for i in xrange(10):
                path = 'bar.{0}'.format(i)
                yield LeafNode(path, DummyReader(path))


class StandardFinderTest(TestCase):

    test_dir = settings.WHISPER_DIR

    def scandir_mock(d):
        return scandir(d)

    def create_whisper(self, path, gz=False):
        path = join(self.test_dir, path)
        if not isdir(dirname(path)):
            os.makedirs(dirname(path))
        whisper.create(path, [(1, 60)])
        if gz:
          with open(path, 'rb') as f_in, gzip.open("%s.gz" % path, 'wb') as f_out:
             shutil.copyfileobj(f_in, f_out)
          os.remove(path)

    def wipe_whisper(self):
        try:
            shutil.rmtree(self.test_dir)
        except OSError:
            pass

        if not isdir(self.test_dir):
            os.makedirs(self.test_dir)

    @patch('graphite.finders.standard.scandir', wraps=scandir_mock)
    def test_standard_finder(self,scandir_mock):
        try:
            self.create_whisper('foo.wsp')
            self.create_whisper(join('foo', 'bar', 'baz.wsp'))
            self.create_whisper(join('bar', 'baz', 'foo.wsp'))
            finder = get_finder('graphite.finders.standard.StandardFinder')

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('*.ba?.{baz,foo}', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(scandir_mock.call_count, 5)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{foo,bar}.{baz,bar}.{baz,foo}', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(scandir_mock.call_count, 5)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{foo}.bar.*', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 2)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo.{ba{r,z},baz}.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{foo,garbage}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{fo{o}}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo{}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{fo,ba}{o}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{fo,ba}{o,o}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{fo,ba}{o,z}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

        finally:
            scandir_mock.call_count = 0
            self.wipe_whisper()

    @patch('graphite.finders.standard.scandir', wraps=scandir_mock)
    def test_standard_finder_gzipped_whisper(self, scandir_mock):
        try:
            self.create_whisper('foo.wsp', True)
            self.create_whisper(join('foo', 'bar', 'baz.wsp'), True)
            self.create_whisper(join('bar', 'baz', 'foo.wsp'))
            finder = get_finder('graphite.finders.standard.StandardFinder')

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo{}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

        finally:
            scandir_mock.call_count = 0
            self.wipe_whisper()

    def test_globstar(self):
        self.addCleanup(self.wipe_whisper)
        finder = get_finder('graphite.finders.standard.StandardFinder')
        store  = Store(finders=[finder])

        query = "x.**.x"
        hits = ["x.x", "x._.x", "x._._.x"]
        misses = ["x.x.o", "o.x.x", "x._.x._.o", "o._.x._.x"]
        for path in hits + misses:
            file = join(path.replace(".", os.sep)) + ".wsp"
            self.create_whisper(file)

        paths = [node.path for node in store.find(query, local=True)]
        for hit in hits:
            self.assertIn(hit, paths)
        for miss in misses:
            self.assertNotIn(miss, paths)

    def test_multiple_globstars(self):
        self.addCleanup(self.wipe_whisper)
        finder = get_finder('graphite.finders.standard.StandardFinder')
        store  = Store(finders=[finder])

        query = "x.**.x.**.x"
        hits = ["x.x.x", "x._.x.x", "x.x._.x", "x._.x._.x", "x._._.x.x", "x.x._._.x"]
        misses = ["x.o.x", "o.x.x", "x.x.o", "o.x.x.x", "x.x.x.o", "o._.x._.x", "x._.o._.x", "x._.x._.o"]
        for path in hits + misses:
            file = join(path.replace(".", os.sep)) + ".wsp"
            self.create_whisper(file)

        paths = [node.path for node in store.find(query, local=True)]
        for hit in hits:
            self.assertIn(hit, paths)
        for miss in misses:
            self.assertNotIn(miss, paths)

    def test_terminal_globstar(self):
        self.addCleanup(self.wipe_whisper)
        finder = get_finder('graphite.finders.standard.StandardFinder')
        store  = Store(finders=[finder])

        query = "x.**"
        hits = ["x._", "x._._", "x._._._"]
        misses = ["x", "o._", "o.x._", "o._.x"]
        for path in hits + misses:
            file = join(path.replace(".", os.sep)) + ".wsp"
            self.create_whisper(file)

        paths = [node.path for node in store.find(query, local=True)]
        for hit in hits:
            self.assertIn(hit, paths)
        for miss in misses:
            self.assertNotIn(miss, paths)
            self.wipe_whisper()


class CeresFinderTest(TestCase):
    _listdir_counter = 0
    _original_listdir = os.listdir

    unittest.skipIf(not ceres, 'ceres not installed')
    def test_ceres_finder(self):
        test_dir = join(settings.CERES_DIR)

        def create_ceres(metric):
            if not isdir(test_dir):
                os.makedirs(test_dir)
            tree = ceres.CeresTree(test_dir)

            options = {}
            tree.createNode(metric, **options)

            tree.store(metric, [(1, 60)])

        def wipe_ceres():
            try:
                shutil.rmtree(test_dir)
            except OSError:
                pass

        def listdir_mock(d):
            self._listdir_counter += 1
            return self._original_listdir(d)

        try:
            os.listdir = listdir_mock
            create_ceres('foo')
            create_ceres('foo.bar.baz')
            create_ceres('bar.baz.foo')

            finder = get_finder('graphite.finders.ceres.CeresFinder')

            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('foo', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(self._listdir_counter, 1)

            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('foo.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(self._listdir_counter, 1)

            # No data in the expected time period
            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('foo.bar.baz', 10000, 10060))
            self.assertEqual(len(list(nodes)), 0)
            self.assertEqual(self._listdir_counter, 1)

            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('foo.bar', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(self._listdir_counter, 0)

            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('*.ba?.{baz,foo}', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(self._listdir_counter, 8)

            # Search for something that isn't valid Ceres content
            fh = open(join(test_dir, 'foo', 'blah'), 'wb')
            fh.close()
            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('foo.blah', None, None))
            self.assertEqual(len(list(nodes)), 0)
            self.assertEqual(self._listdir_counter, 0)

        finally:
            os.listdir = self._original_listdir
            wipe_ceres()
