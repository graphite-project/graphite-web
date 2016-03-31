import os
from os.path import join, dirname, isdir
import random
import shutil
import time

from django.test import TestCase
from django.conf import settings

from graphite.intervals import Interval, IntervalSet
from graphite.node import LeafNode, BranchNode
from graphite.storage import Store, FindQuery, get_finder
import whisper


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


class DummyReader(object):
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


class DummyFinder(object):
    def find_nodes(self, query):
        if query.pattern == 'foo':
            yield BranchNode('foo')

        elif query.pattern == 'bar.*':
            for i in xrange(10):
                path = 'bar.{0}'.format(i)
                yield LeafNode(path, DummyReader(path))

class StandardFinderTest(TestCase):
    _listdir_counter = 0
    _original_listdir = os.listdir

    def test_standard_finder(self):
        test_dir = join(settings.WHISPER_DIR, 'test_standard_finder')

        def create_whisper(path):
            path = join(test_dir, path)
            if not isdir(dirname(path)):
                os.makedirs(dirname(path))
            whisper.create(path, [(1, 60)])

        def wipe_whisper():
            try:
                shutil.rmtree(test_dir)
            except OSError:
                pass

        def listdir_mock(d):
            self._listdir_counter += 1
            return self._original_listdir(d)

        try:
            os.listdir = listdir_mock
            create_whisper('foo.wsp')
            create_whisper(join('foo', 'bar', 'baz.wsp'))
            create_whisper(join('bar', 'baz', 'foo.wsp'))
            finder = get_finder('graphite.finders.standard.StandardFinder')

            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('test_standard_finder.foo', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(self._listdir_counter, 0)

            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('test_standard_finder.foo.bar.baz', None, None))
            self.assertEqual(len(list(nodes)), 1)
            self.assertEqual(self._listdir_counter, 0)

            self._listdir_counter = 0
            nodes = finder.find_nodes(FindQuery('test_standard_finder.*.ba?.{baz,foo}', None, None))
            self.assertEqual(len(list(nodes)), 2)
            self.assertEqual(self._listdir_counter, 5)

        finally:
            os.listdir = self._original_listdir
            wipe_whisper()
