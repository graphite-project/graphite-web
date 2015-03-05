import random
import time
import os
import tempfile
import shutil
import whisper
from os.path import exists, join, dirname

from django.test import TestCase

from graphite.intervals import Interval, IntervalSet
from graphite.node import LeafNode, BranchNode
from graphite.storage import Store, get_finder
from graphite.finders.standard import StandardFinder


class FinderTest(TestCase):
    __slots__ = ('storageDir',)

    def setUp(self):
        self.storageDir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.storageDir, True)

    def touch_path(self, path):
        file_path = join(self.storageDir, path.replace(".", os.sep)) + ".wsp"
        dir_path = dirname(file_path)
        if not exists(dir_path):
            os.makedirs(dir_path)
        whisper.create(file_path, [(1, 60)])

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

    def test_globstar(self):
        finder = StandardFinder(directories=[self.storageDir])
        store  = Store(finders=[finder])

        query = "x.**.x"
        hits = ["x.x", "x._.x", "x._._.x"]
        misses = ["x.x.o", "o.x.x", "x._.x._.o", "o._.x._.x"]
        for path in hits + misses:
            self.touch_path(path)

        paths = [node.path for node in store.find(query, local=True)]
        for hit in hits:
            self.assertIn(hit, paths)
        for miss in misses:
            self.assertNotIn(miss, paths)

    def test_multiple_globstars(self):
        finder = StandardFinder(directories=[self.storageDir])
        store  = Store(finders=[finder])

        query = "x.**.x.**.x"
        hits = ["x.x.x", "x._.x.x", "x.x._.x", "x._.x._.x", "x._._.x.x", "x.x._._.x"]
        misses = ["x.o.x", "o.x.x", "x.x.o", "o.x.x.x", "x.x.x.o", "o._.x._.x", "x._.o._.x", "x._.x._.o"]
        for path in hits + misses:
            self.touch_path(path)

        paths = [node.path for node in store.find(query, local=True)]
        for hit in hits:
            self.assertIn(hit, paths)
        for miss in misses:
            self.assertNotIn(miss, paths)

    def test_terminal_globstar(self):
        finder = StandardFinder(directories=[self.storageDir])
        store  = Store(finders=[finder])

        query = "x.**"
        hits = ["x._", "x._._", "x._._._"]
        misses = ["x", "o._", "o.x._", "o._.x"]
        for path in hits + misses:
            self.touch_path(path)

        paths = [node.path for node in store.find(query, local=True)]
        for hit in hits:
            self.assertIn(hit, paths)
        for miss in misses:
            self.assertNotIn(miss, paths)

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
