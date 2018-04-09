from __future__ import absolute_import

import gzip
import os
from os.path import join, dirname, isdir
import random
import shutil
import time
import unittest
from six.moves import range

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
from graphite.storage import Store, FindQuery, get_finders
from graphite.finders.standard import scandir
from graphite.finders import get_real_metric_path
from graphite.finders.utils import BaseFinder
from graphite.readers.utils import BaseReader
from tests.base import TestCase


class FinderTest(TestCase):
    def test_custom_finder(self):
        store = Store(finders=get_finders('tests.test_finders.DummyFinder'))
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

    def test_legacy_finder(self):
        store = Store(finders=get_finders('tests.test_finders.LegacyFinder'))
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
        npoints = (end_time - start_time) // 10
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
            for i in range(10):
                path = 'bar.{0}'.format(i)
                yield LeafNode(path, DummyReader(path))


class LegacyFinder(object):
    def find_nodes(self, query):
        if query.pattern == 'foo':
            yield BranchNode('foo')

        elif query.pattern == 'bar.*':
            for i in range(10):
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
            self.create_whisper(join('_tagged', '9c6', '79b', 'foo;bar=baz.wsp'))
            self.create_whisper(join(
              '_tagged',
              'b34',
              '2de',
              # foo;bar=baz2
              'b342defa10cb579981c63ef78be5ac248f681f4bd2c35bc0209d3a7b9eb99346.wsp'
            ))

            finder = get_finders('graphite.finders.standard.StandardFinder')[0]

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
            self.assertEqual(scandir_mock.call_count, 4)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{foo,bar}.{baz,bar}.{baz,foo}', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{foo}.bar.*', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 1)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo.{ba{r,z},baz}.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{foo,garbage}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{fo{o}}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo{}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{fo,ba}{o}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{fo,ba}{o,o}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('{fo,ba}{o,z}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo;bar=baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo;bar=baz2', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

            results = finder.fetch(['foo'], 0, 1)
            self.assertEqual(results, [])

        finally:
            scandir_mock.call_count = 0
            self.wipe_whisper()

    @patch('graphite.finders.standard.scandir', wraps=scandir_mock)
    def test_standard_finder_gzipped_whisper(self, scandir_mock):
        try:
            self.create_whisper('foo.wsp', True)
            self.create_whisper(join('foo', 'bar', 'baz.wsp'), True)
            self.create_whisper(join('bar', 'baz', 'foo.wsp'))
            finder = get_finders('graphite.finders.standard.StandardFinder')[0]

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(scandir_mock.call_count, 0)

            scandir_mock.call_count = 0
            nodes = finder.find_nodes(FindQuery('foo{}.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(scandir_mock.call_count, 0)

        finally:
            scandir_mock.call_count = 0
            self.wipe_whisper()

    def test_globstar(self):
        self.addCleanup(self.wipe_whisper)
        store  = Store(finders=get_finders('graphite.finders.standard.StandardFinder'))

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
        store  = Store(finders=get_finders('graphite.finders.standard.StandardFinder'))

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
        store  = Store(finders=get_finders('graphite.finders.standard.StandardFinder'))

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

    def dummy_realpath(path):
        return path.replace("some/symbolic/path", "this/is/the/real/path")

    @patch('os.path.realpath', wraps=dummy_realpath)
    def test_get_real_metric_path_symlink_outside(self, dummy_realpath):
        input_abs_path='/some/symbolic/path/graphite/whisper/Env/HTTP/NumConnections.wsp'
        input_metric_path='Env.HTTP.NumConnections'
        expected_metric_path='Env.HTTP.NumConnections'
        output_metric_path = get_real_metric_path(input_abs_path, input_metric_path)
        self.assertEqual(output_metric_path, expected_metric_path)

    @patch('os.path.realpath', wraps=dummy_realpath)
    def test_get_real_metric_path_symlink_inside(self, dummy_realpath):
        input_abs_path='/opt/graphite/storage/whisper/some/symbolic/path/NumConnections.wsp'
        input_metric_path='some.symbolic.path.NumConnections'
        expected_metric_path='this.is.the.real.path.NumConnections'
        output_metric_path = get_real_metric_path(input_abs_path, input_metric_path)
        self.assertEqual(output_metric_path, expected_metric_path)

class CeresFinderTest(TestCase):
    @unittest.skipIf(not ceres, 'ceres not installed')
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

        self.addCleanup(wipe_ceres)

        create_ceres('foo')
        create_ceres('foo.bar.baz')
        create_ceres('bar.baz.foo')
        create_ceres(
            # foo;bar=baz
            '_tagged.9c6.79b.foo;bar=baz'
        )
        create_ceres(
            # foo;bar=baz2
            '_tagged.b34.2de.b342defa10cb579981c63ef78be5ac248f681f4bd2c35bc0209d3a7b9eb99346'
        )

        finder = get_finders('graphite.finders.ceres.CeresFinder')[0]

        nodes = finder.find_nodes(FindQuery('foo', None, None))
        self.assertEqual(len(list(nodes)), 1)

        nodes = finder.find_nodes(FindQuery('foo.bar.baz', None, None))
        self.assertEqual(len(list(nodes)), 1)

        # No data in the expected time period
        nodes = finder.find_nodes(FindQuery('foo.bar.baz', 10000, 10060))
        self.assertEqual(len(list(nodes)), 0)

        nodes = finder.find_nodes(FindQuery('foo.bar', None, None))
        self.assertEqual(len(list(nodes)), 1)

        nodes = finder.find_nodes(FindQuery('*.ba?.{baz,foo}', None, None))
        self.assertEqual(len(list(nodes)), 2)

        nodes = finder.find_nodes(FindQuery('foo;bar=baz', None, None))
        self.assertEqual(len(list(nodes)), 1)

        nodes = finder.find_nodes(FindQuery('foo;bar=baz2', None, None))
        self.assertEqual(len(list(nodes)), 1)

        # Search for something that isn't valid Ceres content
        fh = open(join(test_dir, 'foo', 'blah'), 'wb')
        fh.close()
        nodes = finder.find_nodes(FindQuery('foo.blah', None, None))
        self.assertEqual(len(list(nodes)), 0)

        # get index
        result = finder.get_index({})
        self.assertEqual(result, [
          '_tagged.9c6.79b.foo;bar=baz',
          '_tagged.b34.2de.b342defa10cb579981c63ef78be5ac248f681f4bd2c35bc0209d3a7b9eb99346',
          'bar.baz.foo',
          'foo',
          'foo.bar.baz',
        ])
