import os
import random
import shutil
import time
import whisper

from django.conf import settings
from django.test import override_settings
from mock import patch, Mock

from .base import TestCase

from graphite.finders.utils import BaseFinder
from graphite.intervals import Interval, IntervalSet
from graphite.node import LeafNode, BranchNode
from graphite.readers.utils import BaseReader
from graphite.storage import Store, extractForwardHeaders, get_finders, get_tagdb, write_index
from graphite.tags.localdatabase import LocalDatabaseTagDB
from graphite.worker_pool.pool import PoolTimeoutError
from graphite.render.datalib import TimeSeries
from graphite.render.evaluator import evaluateTarget
from graphite.util import epoch_to_dt

class StorageTest(TestCase):

  def test_fetch(self):
    disabled_finder = get_finders('tests.test_storage.DisabledFinder')[0]
    legacy_finder = get_finders('tests.test_storage.LegacyFinder')[0]
    test_finder = get_finders('tests.test_storage.TestFinder')[0]
    remote_finder = get_finders('tests.test_storage.RemoteFinder')[0]

    store = Store(
      finders=[disabled_finder, legacy_finder, test_finder, remote_finder],
      tagdb=get_tagdb('graphite.tags.localdatabase.LocalDatabaseTagDB')
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

    message = 'Timed out after [-.e0-9]+s for fetch for \[\'a\'\]'
    with patch('graphite.storage.pool_exec', mock_pool_exec):
      with patch('graphite.storage.log.info') as log_info:
        with self.assertRaisesRegexp(Exception, message):
          list(store.fetch(['a'], 1, 2, 3, {}))
        self.assertEqual(log_info.call_count, 1)
        self.assertRegexpMatches(log_info.call_args[0][0], message)

  def test_fetch_all_failed(self):
    # all finds failed
    store = Store(
      finders=[TestFinder()]
    )

    with patch('graphite.storage.log.info') as log_info:
      with self.assertRaisesRegexp(Exception, 'All requests failed for fetch for \[\'a\'\] \(1\)'):
        list(store.fetch(['a'], 1, 2, 3, {}))
      self.assertEqual(log_info.call_count, 1)
      self.assertRegexpMatches(log_info.call_args[0][0], 'Exception during fetch for \[\'a\'\] after [-.e0-9]+s: TestFinder.find_nodes')

    store = Store(
      finders=[TestFinder(), TestFinder()]
    )

    with patch('graphite.storage.log.info') as log_info:
      with self.assertRaisesRegexp(Exception, 'All requests failed for fetch for \[\'a\'\] \(2\)'):
        list(store.fetch(['a'], 1, 2, 3, {}))
      self.assertEqual(log_info.call_count, 2)
      self.assertRegexpMatches(log_info.call_args[0][0], 'Exception during fetch for \[\'a\'\] after [-.e0-9]+s: TestFinder.find_nodes')

  def test_find(self):
    disabled_finder = DisabledFinder()
    legacy_finder = LegacyFinder()
    test_finder = TestFinder()
    remote_finder = RemoteFinder()

    store = Store(
      finders=[disabled_finder, legacy_finder, test_finder, remote_finder],
      tagdb=get_tagdb('graphite.tags.localdatabase.LocalDatabaseTagDB')
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

    message = 'Timed out after [-.e0-9]+s for find <FindQuery: a from \* until \*>'
    with patch('graphite.storage.pool_exec', mock_pool_exec):
      with patch('graphite.storage.log.info') as log_info:
        with self.assertRaisesRegexp(Exception, message):
          list(store.find('a'))
        self.assertEqual(log_info.call_count, 1)
        self.assertRegexpMatches(log_info.call_args[0][0], message)

  def test_find_all_failed(self):
    # all finds failed
    store = Store(
      finders=[TestFinder()]
    )

    message = 'All requests failed for find <FindQuery: a from \* until \*>'
    with patch('graphite.storage.log.info') as log_info:
      with self.assertRaisesRegexp(Exception, message):
        list(store.find('a'))
      self.assertEqual(log_info.call_count, 1)
      self.assertRegexpMatches(
        log_info.call_args[0][0],
        'Exception during find <FindQuery: a from \* until \*> after [-.e0-9]+s: TestFinder.find_nodes'
      )

    store = Store(
      finders=[TestFinder(), TestFinder()]
    )

    with patch('graphite.storage.log.info') as log_info:
      with self.assertRaisesRegexp(Exception, message):
        list(store.find('a'))
      self.assertEqual(log_info.call_count, 2)
      self.assertRegexpMatches(
        log_info.call_args[0][0],
        'Exception during find <FindQuery: a from \* until \*> after [-.e0-9]+s: TestFinder.find_nodes'
      )

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
      tagdb=get_tagdb('graphite.tags.localdatabase.LocalDatabaseTagDB')
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
      with patch('graphite.storage.log.info') as log_info:
        with self.assertRaisesRegexp(Exception, 'Timed out after .*'):
          store.get_index()
        self.assertEqual(log_info.call_count, 1)
        self.assertRegexpMatches(log_info.call_args[0][0], 'Timed out after [-.e0-9]+s')

  def test_get_index_all_failed(self):
    # all finders failed
    store = Store(
      finders=[TestFinder()]
    )

    with patch('graphite.storage.log.info') as log_info:
      with self.assertRaisesRegexp(Exception, 'All requests failed for get_index'):
        store.get_index()
      self.assertEqual(log_info.call_count, 1)
      self.assertRegexpMatches(log_info.call_args[0][0], 'Exception during get_index after [-.e0-9]+s: TestFinder.find_nodes')

    store = Store(
      finders=[TestFinder(), TestFinder()]
    )

    with patch('graphite.storage.log.info') as log_info:
      with self.assertRaisesRegexp(Exception, 'All requests failed for get_index \(2\)'):
        store.get_index()
      self.assertEqual(log_info.call_count, 2)
      self.assertRegexpMatches(log_info.call_args[0][0], 'Exception during get_index after [-.e0-9]+s: TestFinder.find_nodes')

  @override_settings(USE_WORKER_POOL=False)
  def test_fetch_tag_support(self):
    class TestFinderTags(BaseFinder):
      tags = True

      def find_nodes(self, query):
        pass

      def fetch(self, patterns, start_time, end_time, now=None, requestContext=None):
        if patterns != ['seriesByTag("hello=tiger")', 'seriesByTag("name=notags")', 'seriesByTag("name=testtags")', 'testtags;hello=tiger']:
          raise Exception('Unexpected patterns %s' % str(patterns))

        return [
          {
            'pathExpression': 'testtags;hello=tiger',
            'name': 'testtags;hello=tiger',
            'time_info': (0, 60, 1),
            'values': [],
          },
          {
            'pathExpression': 'seriesByTag("hello=tiger")',
            'name': 'testtags;hello=tiger',
            'time_info': (0, 60, 1),
            'values': [],
          },
          {
            'pathExpression': 'seriesByTag("name=testtags")',
            'name': 'testtags;hello=tiger',
            'time_info': (0, 60, 1),
            'values': [],
          },
        ]

    tagdb = Mock()

    store = Store(
      finders=[TestFinderTags()],
      tagdb=tagdb
    )

    request_context = {
      'startTime': epoch_to_dt(0),
      'endTime': epoch_to_dt(60),
      'now': epoch_to_dt(60),
    }

    with patch('graphite.render.datalib.STORE', store):
      results = evaluateTarget(request_context, ['testtags;hello=tiger', 'seriesByTag("hello=tiger")', 'seriesByTag("name=testtags")', 'seriesByTag("name=notags")'])
      self.assertEqual(results, [
        TimeSeries('testtags;hello=tiger', 0, 60, 1, []),
        TimeSeries('testtags;hello=tiger', 0, 60, 1, [], pathExpression='seriesByTag("hello=tiger")'),
        TimeSeries('testtags;hello=tiger', 0, 60, 1, [], pathExpression='seriesByTag("name=testtags")'),
      ])

  @override_settings(USE_WORKER_POOL=True)
  def test_fetch_no_tag_support(self):
    class TestFinderNoTags(BaseFinder):
      tags = False

      def find_nodes(self, query):
        pass

      def fetch(self, patterns, start_time, end_time, now=None, requestContext=None):
        if patterns != ['notags;hello=tiger']:
          raise Exception('Unexpected patterns %s' % str(patterns))

        return [
          {
            'pathExpression': 'notags;hello=tiger',
            'name': 'notags;hello=tiger',
            'time_info': (0, 60, 1),
            'values': [],
          }
        ]

    tagdb = Mock()

    def mockFindSeries(exprs, requestContext=None):
      self.assertEqual(requestContext, request_context)
      if exprs == ('hello=tiger',) or exprs == ('name=notags',):
        return ['notags;hello=tiger']
      if exprs == ('name=testtags',):
        return []
      raise Exception('Unexpected exprs %s' % str(exprs))

    tagdb.find_series.side_effect = mockFindSeries

    store = Store(
      finders=[TestFinderNoTags()],
      tagdb=tagdb
    )

    with patch('graphite.render.datalib.STORE', store):
      request_context = {
        'startTime': epoch_to_dt(0),
        'endTime': epoch_to_dt(60),
        'now': epoch_to_dt(60),
      }

      results = evaluateTarget(request_context, ['notags;hello=tiger', 'seriesByTag("hello=tiger")', 'seriesByTag("name=testtags")', 'seriesByTag("name=notags")'])
      self.assertEqual(tagdb.find_series.call_count, 3)
      self.assertEqual(results, [
        TimeSeries('notags;hello=tiger', 0, 60, 1, []),
        TimeSeries('notags;hello=tiger', 0, 60, 1, [], pathExpression='seriesByTag("hello=tiger")'),
        TimeSeries('notags;hello=tiger', 0, 60, 1, [], pathExpression='seriesByTag("name=notags")'),
      ])

  def test_autocomplete(self):
    test = self

    class TestFinderTags(BaseFinder):
      tags = True

      def __init__(self, request_limit=100, request_context=None):
        self.limit = request_limit
        self.context = request_context or {}

      def find_nodes(self, query):
        pass

      def auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None):
        test.assertEqual(exprs, ['tag1=value1'])
        test.assertEqual(tagPrefix, 'test')
        test.assertEqual(limit, self.limit)
        test.assertEqual(requestContext, self.context)
        return ['testtags']

      def auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None):
        test.assertEqual(exprs, ['tag1=value1'])
        test.assertEqual(tag, 'tag2')
        test.assertEqual(valuePrefix, 'test')
        test.assertEqual(limit, self.limit)
        test.assertEqual(requestContext, self.context)
        return ['testtags']


    class TestFinderNoTags(BaseFinder):
      tags = False

      def find_nodes(self, query):
        pass


    class TestFinderTagsException(TestFinderTags):
      def auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None):
        raise Exception('TestFinderTagsException.auto_complete_tags')

      def auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None):
        raise Exception('TestFinderTagsException.auto_complete_values')


    class TestFinderTagsTimeout(TestFinderTags):
      def auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None):
        time.sleep(0.1)
        return ['testtags']

      def auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None):
        time.sleep(0.1)
        return ['testtags']


    def mockStore(finders, request_limit=100, request_context=None):
      tagdb = Mock()

      def mockAutoCompleteTags(exprs, tagPrefix=None, limit=None, requestContext=None):
        self.assertEqual(exprs, ['tag1=value1'])
        self.assertEqual(tagPrefix, 'test')
        self.assertEqual(limit, request_limit)
        self.assertEqual(requestContext, request_context or {})
        return ['testnotags']

      tagdb.auto_complete_tags.side_effect = mockAutoCompleteTags

      def mockAutoCompleteValues(exprs, tag, valuePrefix=None, limit=None, requestContext=None):
        self.assertEqual(exprs, ['tag1=value1'])
        self.assertEqual(tag, 'tag2')
        self.assertEqual(valuePrefix, 'test')
        self.assertEqual(limit, request_limit)
        self.assertEqual(requestContext, request_context or {})
        return ['testnotags']

      tagdb.auto_complete_values.side_effect = mockAutoCompleteValues

      return Store(
        finders=finders,
        tagdb=tagdb,
      )

    request_context = {}

    # test with both tag-enabled and non-tag-enabled finders
    store = mockStore([TestFinderTags(), TestFinderNoTags()])

    result = store.tagdb_auto_complete_tags(['tag1=value1'], 'test', 100, request_context)
    self.assertEqual(store.tagdb.auto_complete_tags.call_count, 1)
    self.assertEqual(result, ['testnotags', 'testtags'])

    result = store.tagdb_auto_complete_values(['tag1=value1'], 'tag2', 'test', 100, request_context)
    self.assertEqual(store.tagdb.auto_complete_values.call_count, 1)
    self.assertEqual(result, ['testnotags', 'testtags'])

    # test with no limit & no requestContext
    store = mockStore([TestFinderTags(None, {}), TestFinderNoTags()], None, {})

    result = store.tagdb_auto_complete_tags(['tag1=value1'], 'test')
    self.assertEqual(store.tagdb.auto_complete_tags.call_count, 1)
    self.assertEqual(result, ['testnotags', 'testtags'])

    result = store.tagdb_auto_complete_values(['tag1=value1'], 'tag2', 'test')
    self.assertEqual(store.tagdb.auto_complete_values.call_count, 1)
    self.assertEqual(result, ['testnotags', 'testtags'])

    # test with only tag-enabled finder
    store = mockStore([TestFinderTags()])

    result = store.tagdb_auto_complete_tags(['tag1=value1'], 'test', 100, request_context)
    self.assertEqual(store.tagdb.auto_complete_tags.call_count, 0)
    self.assertEqual(result, ['testtags'])

    result = store.tagdb_auto_complete_values(['tag1=value1'], 'tag2', 'test', 100, request_context)
    self.assertEqual(store.tagdb.auto_complete_values.call_count, 0)
    self.assertEqual(result, ['testtags'])

    # test with only non-tag-enabled finder
    store = mockStore([TestFinderNoTags()])

    result = store.tagdb_auto_complete_tags(['tag1=value1'], 'test', 100, request_context)
    self.assertEqual(store.tagdb.auto_complete_tags.call_count, 1)
    self.assertEqual(result, ['testnotags'])

    result = store.tagdb_auto_complete_values(['tag1=value1'], 'tag2', 'test', 100, request_context)
    self.assertEqual(store.tagdb.auto_complete_values.call_count, 1)
    self.assertEqual(result, ['testnotags'])

    # test with no finders
    store = mockStore([])

    result = store.tagdb_auto_complete_tags(['tag1=value1'], 'test', 100, request_context)
    self.assertEqual(store.tagdb.auto_complete_tags.call_count, 0)
    self.assertEqual(result, [])

    result = store.tagdb_auto_complete_values(['tag1=value1'], 'tag2', 'test', 100, request_context)
    self.assertEqual(store.tagdb.auto_complete_values.call_count, 0)
    self.assertEqual(result, [])

    # test exception handling with one finder
    store = mockStore([TestFinderTagsException()])

    with self.assertRaisesRegexp(Exception, 'All requests failed for tags for \[\'tag1=value1\'\] test.*'):
      store.tagdb_auto_complete_tags(['tag1=value1'], 'test', 100, request_context)

    with self.assertRaisesRegexp(Exception, 'All requests failed for values for \[\'tag1=value1\'\] tag2 test.*'):
      store.tagdb_auto_complete_values(['tag1=value1'], 'tag2', 'test', 100, request_context)

    # test exception handling with more than one finder
    store = mockStore([TestFinderTagsException(), TestFinderTagsException()])

    with self.assertRaisesRegexp(Exception, 'All requests failed for tags for \[\'tag1=value1\'\] test'):
      store.tagdb_auto_complete_tags(['tag1=value1'], 'test', 100, request_context)

    with self.assertRaisesRegexp(Exception, 'All requests failed for values for \[\'tag1=value1\'\] tag2 test'):
      store.tagdb_auto_complete_values(['tag1=value1'], 'tag2', 'test', 100, request_context)

    # test pool timeout handling
    store = mockStore([TestFinderTagsTimeout()])

    with self.settings(USE_WORKER_POOL=True, FIND_TIMEOUT=0):
      with self.assertRaisesRegexp(Exception, 'Timed out after [-.e0-9]+s for tags for \[\'tag1=value1\'\]'):
        store.tagdb_auto_complete_tags(['tag1=value1'], 'test', 100, request_context)

      with self.assertRaisesRegexp(Exception, 'Timed out after [-.e0-9]+s for values for \[\'tag1=value1\'\] tag2 test'):
        store.tagdb_auto_complete_values(['tag1=value1'], 'tag2', 'test', 100, request_context)

  # test write_index
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

    self.assertEqual(None, write_index() )
    self.assertEqual(None, write_index(settings.INDEX_FILE) )


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
        npoints = (endTime - startTime) // 10
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
