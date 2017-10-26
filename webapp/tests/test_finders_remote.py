import logging
import pickle
import types

from urllib3.response import HTTPResponse
from StringIO import StringIO

from django.test import override_settings
from mock import patch

from graphite.finders.remote import RemoteFinder
from graphite.finders.utils import FindQuery
from graphite.node import BranchNode, LeafNode

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
    @override_settings(REMOTE_FIND_TIMEOUT=10)
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
      responseObject = HTTPResponse(body=StringIO(pickle.dumps(data)), status=200)
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
        'timeout': 10,
      })

      self.assertEqual(len(nodes), 2)

      self.assertIsInstance(nodes[0], BranchNode)
      self.assertEqual(nodes[0].path, 'a.b.c')

      self.assertIsInstance(nodes[1], LeafNode)
      self.assertEqual(nodes[1].path, 'a.b.c.d')

      query = FindQuery('a.b.c', None, None)
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
        ],
        'headers': None,
        'timeout': 10,
      })

      self.assertEqual(len(nodes), 2)

      self.assertIsInstance(nodes[0], BranchNode)
      self.assertEqual(nodes[0].path, 'a.b.c')

      self.assertIsInstance(nodes[1], LeafNode)
      self.assertEqual(nodes[1].path, 'a.b.c.d')

      # non-pickle response
      responseObject = HTTPResponse(body='error', status=200)
      http_request.return_value = responseObject

      result = finder.find_nodes(query)

      with self.assertRaisesRegexp(Exception, 'Error decoding find response from http://[^ ]+: .+'):
        list(result)

    #
    # Test RemoteFinder.fetch()
    #
    @patch('urllib3.PoolManager.request')
    @override_settings(INTRACLUSTER_HTTPS=True)
    @override_settings(REMOTE_STORE_USE_POST=True)
    @override_settings(REMOTE_FETCH_TIMEOUT=10)
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
      responseObject = HTTPResponse(body=StringIO(pickle.dumps(data)), status=200)
      http_request.return_value = responseObject

      result = finder.fetch(['a.b.c.d'], startTime, endTime)
      expected_response = [
        {
          'name': 'a.b.c.d',
          'values': [1.0, 0.0, 1.0, 0.0, 1.0],
          'path': 'a.b.c.d',
          'start': 1496262000,
          'end': 1496262060,
          'step': 60,
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
        'timeout': 10,
      })
