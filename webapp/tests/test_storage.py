import random
import time

from django.test import override_settings
from mock import patch

from .base import TestCase

from graphite.finders.utils import BaseFinder
from graphite.intervals import Interval, IntervalSet
from graphite.node import LeafNode, BranchNode
from graphite.readers.utils import BaseReader
from graphite.storage import Store, extractForwardHeaders, get_finders
from graphite.tags.localdatabase import LocalDatabaseTagDB
from graphite.worker_pool.pool import PoolTimeoutError


class StorageTest(TestCase):

  def test_fetch(self):
    disabled_finder = get_finders('tests.test_storage.DisabledFinder')[0]
    legacy_finder = get_finders('tests.test_storage.LegacyFinder')[0]
    test_finder = get_finders('tests.test_storage.TestFinder')[0]
    remote_finder = get_finders('tests.test_storage.RemoteFinder')[0]

    store = Store(
      finders=[disabled_finder, legacy_finder, test_finder, remote_finder],
      tagdb='graphite.tags.localdatabase.LocalDatabaseTagDB'
    )

    # tagb is properly initialized
    self.assertIsInstance(store.tagdb, LocalDatabaseTagDB)

    # get all enabled finders
    finders = store.get_finders()
    self.assertEqual(list(finders), [legacy_finder, test_finder, remote_finder])

    # get only local finders
    finders = store.get_finders(local=True)
    self.assertEqual(list(finders), [legacy_finder, test_finder])

    # fetch with empty patterns
    result = store.fetch([], 1, 2, 3, {})
    self.assertEqual(result, [])

    # fetch
    result = store.fetch(['a.**'], 1, 2, 3, {})
    self.assertEqual(len(result), 3)
    result.sort(key=lambda node: node['name'])
    self.assertEqual(result[0]['name'], 'a.b.c.d')
    self.assertEqual(result[0]['pathExpression'], 'a.**')
    self.assertEqual(result[1]['name'], 'a.b.c.d')
    self.assertEqual(result[1]['pathExpression'], 'a.**')
    self.assertEqual(result[2]['name'], 'a.b.c.e')
    self.assertEqual(result[2]['pathExpression'], 'a.**')

  def test_fetch_pool_timeout(self):
    # pool timeout
    store = Store(
      finders=[RemoteFinder()]
    )

    def mock_pool_exec(pool, jobs, timeout):
      raise PoolTimeoutError()

    with patch('graphite.storage.pool_exec', mock_pool_exec):
      with patch('graphite.storage.log.debug') as log_debug:
        with self.assertRaisesRegexp(Exception, 'All fetches failed for \[\'a\'\]'):
          list(store.fetch(['a'], 1, 2, 3, {}))
          self.assertEqual(log_debug.call_count, 1)
          self.assertRegexpMatches(log_debug.call_args[0][0], 'Timed out in fetch after [-.e0-9]+s')

  def test_fetch_all_failed(self):
    # all finds failed
    store = Store(
      finders=[TestFinder()]
    )

    with patch('graphite.storage.log.debug') as log_debug:
      with self.assertRaisesRegexp(Exception, 'All fetches failed for \[\'a\'\]'):
        list(store.fetch(['a'], 1, 2, 3, {}))
        self.assertEqual(log_debug.call_count, 1)
        self.assertRegexpMatches(log_debug.call_args[0][0], 'Fetch for \[\'a\'\] failed after [-.e0-9]+s: TestFinder.find_nodes')

  def test_find(self):
    disabled_finder = DisabledFinder()
    legacy_finder = LegacyFinder()
    test_finder = TestFinder()
    remote_finder = RemoteFinder()

    store = Store(
      finders=[disabled_finder, legacy_finder, test_finder, remote_finder],
      tagdb='graphite.tags.localdatabase.LocalDatabaseTagDB'
    )

    # find nodes
    result = list(store.find('a'))
    self.assertEqual(len(result), 5)

    for node in result:
      if node.path in ['a.b.c.d', 'a.b.c.e']:
        self.assertIsInstance(node, LeafNode)
      else:
        self.assertIsInstance(node, BranchNode)
        self.assertTrue(node.path in ['a', 'a.b', 'a.b.c'])

    # find leaves only
    result = list(store.find('a', leaves_only=True))
    self.assertEqual(len(result), 2)

    for node in result:
      self.assertIsInstance(node, LeafNode)
      self.assertTrue(node.path in ['a.b.c.d', 'a.b.c.e'])

    # failure threshold
    with self.settings(METRICS_FIND_FAILURE_THRESHOLD=1):
      with self.assertRaisesRegexp(Exception, 'Query a yields too many results and failed \(failure threshold is 1\)'):
        list(store.find('a'))

    # warning threshold
    with self.settings(METRICS_FIND_WARNING_THRESHOLD=1):
      with patch('graphite.storage.log.warning') as log_warning:
        list(store.find('a'))
        self.assertEqual(log_warning.call_count, 1)
        self.assertEqual(
          log_warning.call_args[0][0],
          'Query a yields large number of results up to 2 (warning threshold is 1)'
        )

  def test_find_pool_timeout(self):
    # pool timeout
    store = Store(
      finders=[RemoteFinder()]
    )

    def mock_pool_exec(pool, jobs, timeout):
      raise PoolTimeoutError()

    with patch('graphite.storage.pool_exec', mock_pool_exec):
      with patch('graphite.storage.log.debug') as log_debug:
        with self.assertRaisesRegexp(Exception, 'All finds failed for <FindQuery: a from \* until \*>'):
          list(store.find('a'))
          self.assertEqual(log_debug.call_count, 1)
          self.assertRegexpMatches(log_debug.call_args[0][0], 'Timed out in find after [-.e0-9]+s')

  def test_find_all_failed(self):
    # all finds failed
    store = Store(
      finders=[TestFinder()]
    )

    with patch('graphite.storage.log.debug') as log_debug:
      with self.assertRaisesRegexp(Exception, 'All finds failed for <FindQuery: a from \* until \*>'):
        list(store.find('a'))
        self.assertEqual(log_debug.call_count, 1)
        self.assertRegexpMatches(log_debug.call_args[0][0], 'Find for <FindQuery: a from \* until \*> failed after [-.e0-9]+s: TestFinder.find_nodes')

  @override_settings(REMOTE_STORE_FORWARD_HEADERS=['X-Test1', 'X-Test2'])
  def test_extractForwardHeaders(self):
    class DummyRequest(object):
      META = {
        'HTTP_X_TEST1': 'test',
      }

    headers = extractForwardHeaders(DummyRequest())
    self.assertEqual(headers, {'X-Test1': 'test'})

  def test_get_index(self):
    disabled_finder = DisabledFinder()
    # use get_finders so legacy_finder is patched with get_index
    legacy_finder = get_finders('tests.test_storage.LegacyFinder')[0]
    test_finder = TestFinder()
    remote_finder = RemoteFinder()

    store = Store(
      finders=[disabled_finder, legacy_finder, test_finder, remote_finder],
      tagdb='graphite.tags.localdatabase.LocalDatabaseTagDB'
    )

    # get index
    result = store.get_index()
    self.assertEqual(result, ['a.b.c.d', 'a.b.c.e'])

    # get local index
    result = store.get_index({'localOnly': True})
    self.assertEqual(result, ['a.b.c.d'])

  def test_get_index_pool_timeout(self):
    # pool timeout
    store = Store(
      finders=[RemoteFinder()]
    )

    def mock_pool_exec(pool, jobs, timeout):
      raise PoolTimeoutError()

    with patch('graphite.storage.pool_exec', mock_pool_exec):
      with patch('graphite.storage.log.debug') as log_debug:
        with self.assertRaisesRegexp(Exception, 'All index lookups failed'):
          store.get_index()
          self.assertEqual(log_debug.call_count, 1)
          self.assertRegexpMatches(log_debug.call_args[0][0], 'Timed out in get_index after [-.e0-9]+s')

  def test_get_index_all_failed(self):
    # all finders failed
    store = Store(
      finders=[TestFinder()]
    )

    with patch('graphite.storage.log.debug') as log_debug:
      with self.assertRaisesRegexp(Exception, 'All index lookups failed'):
        store.get_index()
        self.assertEqual(log_debug.call_count, 1)
        self.assertRegexpMatches(log_debug.call_args[0][0], 'Find for <FindQuery: a from \* until \*> failed after [-.e0-9]+s: TestFinder.find_nodes')


class DisabledFinder(object):
  disabled = True

  def find_nodes(self, query):
    pass


class LegacyFinder(object):
  def find_nodes(self, query):
    yield BranchNode('a')
    yield BranchNode('a.b')
    yield BranchNode('a.b.c')
    yield LeafNode('a.b.c.d', DummyReader('a.b.c.d'))


class DummyReader(BaseReader):
    __slots__ = ('path',)

    def __init__(self, path):
        self.path = path

    def fetch(self, startTime, endTime, now=None, requestContext=None):
        npoints = (endTime - startTime) / 10
        return (startTime, endTime, 10), [
            random.choice([None, 1, 2, 3]) for i in range(npoints)
        ]

    def get_intervals(self):
        return IntervalSet([Interval(time.time() - 3600, time.time())])


class RemoteFinder(BaseFinder):
  local = False

  def find_nodes(self, query):
    yield BranchNode('a.b.c')
    yield LeafNode('a.b.c.d', DummyReader('a.b.c.d'))
    yield LeafNode('a.b.c.e', DummyReader('a.b.c.e'))


class TestFinder(BaseFinder):
  def find_nodes(self, query):
    raise Exception('TestFinder.find_nodes')
