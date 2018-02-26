import logging
import types

from urllib3.response import HTTPResponse

from django.test import override_settings
from mock import patch

from graphite.finders.remote import RemoteFinder
from graphite.finders.utils import FindQuery
from graphite.node import BranchNode, LeafNode
from graphite.util import json, pickle, BytesIO, msgpack

from .base import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())


# Set test cluster servers
@override_settings(CLUSTER_SERVERS=['127.0.0.1', '8.8.8.8'])
class RemoteFinderTest(TestCase):

    def test_remote_stores(self):
      # Test REMOTE_EXCLUDE_LOCAL = False
      with self.settings(REMOTE_EXCLUDE_LOCAL=False):
        test_finders = RemoteFinder.factory()
        remote_hosts = [finder.host for finder in test_finders]
        self.assertTrue('127.0.0.1' in remote_hosts)
        self.assertTrue('8.8.8.8' in remote_hosts)

      # Test REMOTE_EXCLUDE_LOCAL = True
      with self.settings(REMOTE_EXCLUDE_LOCAL=True):
        test_finders = RemoteFinder.factory()
        remote_hosts = [finder.host for finder in test_finders]
        self.assertTrue('127.0.0.1' not in remote_hosts)
        self.assertTrue('8.8.8.8' in remote_hosts)

    @override_settings(REMOTE_RETRY_DELAY=10)
    def test_fail(self):
      finder = RemoteFinder('127.0.0.1')

      self.assertEqual(finder.last_failure, 0)
      self.assertFalse(finder.disabled)

      with patch('graphite.finders.remote.time.time', lambda: 100):
        finder.fail()
        self.assertEqual(finder.last_failure, 100)
        self.assertTrue(finder.disabled)

      with patch('graphite.finders.remote.time.time', lambda: 109):
        self.assertTrue(finder.disabled)

      with patch('graphite.finders.remote.time.time', lambda: 110):
        self.assertFalse(finder.disabled)

    @patch('urllib3.PoolManager.request')
    @override_settings(INTRACLUSTER_HTTPS=False)
    @override_settings(REMOTE_STORE_USE_POST=True)
    @override_settings(FIND_TIMEOUT=10)
    def test_find_nodes(self, http_request):
      finder = RemoteFinder('127.0.0.1')

      startTime = 1496262000
      endTime   = 1496262060

      data = [
        {
          'path': 'a.b.c',
          'is_leaf': False,
        },
        {
          'path': 'a.b.c.d',
          'is_leaf': True,
        },
      ]
      responseObject = HTTPResponse(body=BytesIO(pickle.dumps(data)), status=200, preload_content=False)
      http_request.return_value = responseObject

      query = FindQuery('a.b.c', startTime, endTime)
      result = finder.find_nodes(query)

      self.assertIsInstance(result, types.GeneratorType)

      nodes = list(result)

      self.assertEqual(http_request.call_args[0], (
        'POST',
        'http://127.0.0.1/metrics/find/',
      ))
      self.assertEqual(http_request.call_args[1], {
        'fields': [
          ('local', '1'),
          ('format', 'pickle'),
          ('query', 'a.b.c'),
          ('from', startTime),
          ('until', endTime),
        ],
        'headers': None,
        'preload_content': False,
        'timeout': 10,
      })

      self.assertEqual(len(nodes), 2)

      self.assertIsInstance(nodes[0], BranchNode)
      self.assertEqual(nodes[0].path, 'a.b.c')

      self.assertIsInstance(nodes[1], LeafNode)
      self.assertEqual(nodes[1].path, 'a.b.c.d')

      finder = RemoteFinder('https://127.0.0.1?format=msgpack')

      data = [
        {
          'path': 'a.b.c',
          'is_leaf': False,
        },
        {
          'path': 'a.b.c.d',
          'is_leaf': True,
        },
      ]
      responseObject = HTTPResponse(
        body=BytesIO(msgpack.dumps(data, use_bin_type=True)),
        status=200,
        preload_content=False,
        headers={'Content-Type': 'application/x-msgpack'}
      )
      http_request.return_value = responseObject

      query = FindQuery('a.b.c', None, None)
      result = finder.find_nodes(query)

      self.assertIsInstance(result, types.GeneratorType)

      nodes = list(result)

      self.assertEqual(http_request.call_args[0], (
        'POST',
        'https://127.0.0.1/metrics/find/',
      ))
      self.assertEqual(http_request.call_args[1], {
        'fields': [
          ('local', '1'),
          ('format', 'msgpack'),
          ('query', 'a.b.c'),
        ],
        'headers': None,
        'preload_content': False,
        'timeout': 10,
      })

      self.assertEqual(len(nodes), 2)

      self.assertIsInstance(nodes[0], BranchNode)
      self.assertEqual(nodes[0].path, 'a.b.c')

      self.assertIsInstance(nodes[1], LeafNode)
      self.assertEqual(nodes[1].path, 'a.b.c.d')

      # non-pickle response
      responseObject = HTTPResponse(body=BytesIO(b'error'), status=200, preload_content=False)
      http_request.return_value = responseObject

      result = finder.find_nodes(query)

      with self.assertRaisesRegexp(Exception, 'Error decoding find response from https://[^ ]+: .+'):
        list(result)

    @patch('graphite.finders.remote.cache.get')
    @patch('urllib3.PoolManager.request')
    def test_find_nodes_cached(self, http_request, cache_get):
      finder = RemoteFinder('127.0.0.1')

      startTime = 1496262000
      endTime   = 1496262060

      data = [
        {
          'path': 'a.b.c',
          'is_leaf': False,
        },
        {
          'path': 'a.b.c.d',
          'is_leaf': True,
        },
      ]
      cache_get.return_value = data

      query = FindQuery('a.b.c', startTime, endTime)
      result = finder.find_nodes(query)

      self.assertIsInstance(result, types.GeneratorType)

      nodes = list(result)

      self.assertEqual(http_request.call_count, 0)

      self.assertEqual(cache_get.call_count, 1)
      self.assertEqual(cache_get.call_args[0], (
        'find:127.0.0.1:553f764f7b436175c0387e22b4a19213:1496262000:1496262000',
      ))

      self.assertEqual(len(nodes), 2)

      self.assertIsInstance(nodes[0], BranchNode)
      self.assertEqual(nodes[0].path, 'a.b.c')

      self.assertIsInstance(nodes[1], LeafNode)
      self.assertEqual(nodes[1].path, 'a.b.c.d')

    #
    # Test RemoteFinder.fetch()
    #
    @patch('urllib3.PoolManager.request')
    @override_settings(INTRACLUSTER_HTTPS=True)
    @override_settings(REMOTE_STORE_USE_POST=True)
    @override_settings(FETCH_TIMEOUT=10)
    def test_RemoteFinder_fetch(self, http_request):
      test_finders = RemoteFinder.factory()
      finder = test_finders[0]
      startTime = 1496262000
      endTime   = 1496262060

      data = [
        {
          'start': startTime,
          'step': 60,
          'end': endTime,
          'values': [1.0, 0.0, 1.0, 0.0, 1.0],
          'name': 'a.b.c.d',
        },
      ]
      responseObject = HTTPResponse(body=BytesIO(pickle.dumps(data)), status=200, preload_content=False)
      http_request.return_value = responseObject

      result = finder.fetch(['a.b.c.d'], startTime, endTime)
      expected_response = [
        {
          'pathExpression': 'a.b.c.d',
          'name': 'a.b.c.d',
          'time_info': (1496262000, 1496262060, 60),
          'values': [1.0, 0.0, 1.0, 0.0, 1.0],
        },
      ]
      self.assertEqual(result, expected_response)
      self.assertEqual(http_request.call_args[0], (
        'POST',
        'https://127.0.0.1/render/',
      ))
      self.assertEqual(http_request.call_args[1], {
        'fields': [
          ('format', 'pickle'),
          ('local', '1'),
          ('noCache', '1'),
          ('from', startTime),
          ('until', endTime),
          ('target', 'a.b.c.d'),
        ],
        'headers': None,
        'preload_content': False,
        'timeout': 10,
      })

    @patch('urllib3.PoolManager.request')
    @override_settings(INTRACLUSTER_HTTPS=False)
    @override_settings(REMOTE_STORE_USE_POST=True)
    @override_settings(FIND_TIMEOUT=10)
    def test_get_index(self, http_request):
      finder = RemoteFinder('127.0.0.1')

      data = [
        'a.b.c',
        'a.b.c.d',
      ]
      responseObject = HTTPResponse(body=BytesIO(json.dumps(data).encode('utf-8')), status=200, preload_content=False)
      http_request.return_value = responseObject

      result = finder.get_index({})

      self.assertIsInstance(result, list)

      self.assertEqual(http_request.call_args[0], (
        'POST',
        'http://127.0.0.1/metrics/index.json',
      ))
      self.assertEqual(http_request.call_args[1], {
        'fields': [
          ('local', '1'),
        ],
        'headers': None,
        'preload_content': False,
        'timeout': 10,
      })

      self.assertEqual(len(result), 2)

      self.assertEqual(result[0], 'a.b.c')
      self.assertEqual(result[1], 'a.b.c.d')

      # non-json response
      responseObject = HTTPResponse(body=BytesIO(b'error'), status=200, preload_content=False)
      http_request.return_value = responseObject

      with self.assertRaisesRegexp(Exception, 'Error decoding index response from http://[^ ]+: .+'):
        result = finder.get_index({})

    @patch('urllib3.PoolManager.request')
    @override_settings(
      INTRACLUSTER_HTTPS=False,
      REMOTE_STORE_USE_POST=True,
      FIND_TIMEOUT=10,
      TAGDB_AUTOCOMPLETE_LIMIT=100)
    def test_auto_complete_tags(self, http_request):
      finder = RemoteFinder('127.0.0.1')

      data = [
        'tag1',
        'tag2',
      ]

      responseObject = HTTPResponse(body=BytesIO(json.dumps(data).encode('utf-8')), status=200, preload_content=False)
      http_request.return_value = responseObject

      result = finder.auto_complete_tags(['name=test'], 'tag')

      self.assertIsInstance(result, list)

      self.assertEqual(http_request.call_args[0], (
        'POST',
        'http://127.0.0.1/tags/autoComplete/tags',
      ))
      self.assertEqual(http_request.call_args[1], {
        'fields': [
          ('tagPrefix', 'tag'),
          ('limit', '100'),
          ('local', '1'),
          ('expr', 'name=test'),
        ],
        'headers': None,
        'preload_content': False,
        'timeout': 10,
      })

      self.assertEqual(len(result), 2)

      self.assertEqual(result[0], 'tag1')
      self.assertEqual(result[1], 'tag2')

      # explicit limit & forward headers
      responseObject = HTTPResponse(body=BytesIO(json.dumps(data).encode('utf-8')), status=200, preload_content=False)
      http_request.return_value = responseObject

      result = finder.auto_complete_tags(['name=test', 'tag3=value3'], 'tag', limit=5, requestContext={'forwardHeaders': {'X-Test': 'test'}})

      self.assertIsInstance(result, list)

      self.assertEqual(http_request.call_args[0], (
        'POST',
        'http://127.0.0.1/tags/autoComplete/tags',
      ))
      self.assertEqual(http_request.call_args[1], {
        'fields': [
          ('tagPrefix', 'tag'),
          ('limit', '5'),
          ('local', '1'),
          ('expr', 'name=test'),
          ('expr', 'tag3=value3'),
        ],
        'headers': {'X-Test': 'test'},
        'preload_content': False,
        'timeout': 10,
      })

      self.assertEqual(len(result), 2)

      self.assertEqual(result[0], 'tag1')
      self.assertEqual(result[1], 'tag2')

      # non-json response
      responseObject = HTTPResponse(body=BytesIO(b'error'), status=200, preload_content=False)
      http_request.return_value = responseObject

      with self.assertRaisesRegexp(Exception, 'Error decoding autocomplete tags response from http://[^ ]+: .+'):
        result = finder.auto_complete_tags(['name=test'], 'tag')

    @patch('urllib3.PoolManager.request')
    @override_settings(
      INTRACLUSTER_HTTPS=False,
      REMOTE_STORE_USE_POST=True,
      FIND_TIMEOUT=10,
      TAGDB_AUTOCOMPLETE_LIMIT=100)
    def test_auto_complete_values(self, http_request):
      finder = RemoteFinder('127.0.0.1')

      data = [
        'value1',
        'value2',
      ]

      responseObject = HTTPResponse(body=BytesIO(json.dumps(data).encode('utf-8')), status=200, preload_content=False)
      http_request.return_value = responseObject

      result = finder.auto_complete_values(['name=test'], 'tag1', 'value')

      self.assertIsInstance(result, list)

      self.assertEqual(http_request.call_args[0], (
        'POST',
        'http://127.0.0.1/tags/autoComplete/values',
      ))
      self.assertEqual(http_request.call_args[1], {
        'fields': [
          ('tag', 'tag1'),
          ('valuePrefix', 'value'),
          ('limit', '100'),
          ('local', '1'),
          ('expr', 'name=test'),
        ],
        'headers': None,
        'preload_content': False,
        'timeout': 10,
      })

      self.assertEqual(len(result), 2)

      self.assertEqual(result[0], 'value1')
      self.assertEqual(result[1], 'value2')

      # explicit limit & forward headers
      responseObject = HTTPResponse(body=BytesIO(json.dumps(data).encode('utf-8')), status=200, preload_content=False)
      http_request.return_value = responseObject

      result = finder.auto_complete_values(['name=test', 'tag3=value3'], 'tag1', 'value', limit=5, requestContext={'forwardHeaders': {'X-Test': 'test'}})

      self.assertIsInstance(result, list)

      self.assertEqual(http_request.call_args[0], (
        'POST',
        'http://127.0.0.1/tags/autoComplete/values',
      ))
      self.assertEqual(http_request.call_args[1], {
        'fields': [
          ('tag', 'tag1'),
          ('valuePrefix', 'value'),
          ('limit', '5'),
          ('local', '1'),
          ('expr', 'name=test'),
          ('expr', 'tag3=value3'),
        ],
        'headers': {'X-Test': 'test'},
        'preload_content': False,
        'timeout': 10,
      })

      self.assertEqual(len(result), 2)

      self.assertEqual(result[0], 'value1')
      self.assertEqual(result[1], 'value2')

      # non-json response
      responseObject = HTTPResponse(body=BytesIO(b'error'), status=200, preload_content=False)
      http_request.return_value = responseObject

      with self.assertRaisesRegexp(Exception, 'Error decoding autocomplete values response from http://[^ ]+: .+'):
        result = finder.auto_complete_values(['name=test'], 'tag1', 'value')
