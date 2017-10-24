from .base import TestCase

import mock
import pickle

from urllib3.response import HTTPResponse
from StringIO import StringIO

from graphite.finders.remote import RemoteFinder
from graphite.readers.remote import RemoteReader
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


#
# Test RemoteReader with multiple WhisperReader instances
#
class RemoteReaderTests(TestCase):

    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_init(self):
        test_finders = RemoteFinder.factory()
        finder = test_finders[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query=['a.b.c.d'])

        self.assertIsNotNone(reader)

    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_repr(self):
        test_finders = RemoteFinder.factory()
        finder = test_finders[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query=['a.b.c.d'])

        self.assertIsNotNone(reader)
        self.assertRegexpMatches(str(reader), "<RemoteReader\[.*\]: 127.0.0.1 a.b.c.d>")

    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_get_intervals(self):
        test_finders = RemoteFinder.factory()
        finder = test_finders[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query=['a.b.c.d'])
        self.assertEqual(reader.get_intervals(), [])

    #
    # Test RemoteReader.fetch()
    #
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_fetch(self, http_request):
        test_finders = RemoteFinder.factory()
        finder = test_finders[0]
        reader = RemoteReader(finder,
                              {'intervals': [], 'path': 'a.b.c.d'},
                              bulk_query=['a.b.c.d'])
        startTime = 1496262000
        endTime   = 1496262060

        data = [
                {'start': startTime,
                 'step': 60,
                 'end': endTime,
                 'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                 'name': 'a.b.c.d'
                }
               ]
        responseObject = HTTPResponse(body=StringIO(pickle.dumps(data)), status=200)
        http_request.return_value = responseObject
        result = reader.fetch(startTime, endTime)
        expected_response = [
            {
                'name': 'a.b.c.d',
                'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                'path': 'a.b.c.d',
                'start': 1496262000,
                'end': 1496262060,
                'step': 60,
            }
        ]
        self.assertEqual(result, expected_response)

    #
    # Test RemoteFinder.fetch()
    #
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteFinder_fetch(self, http_request):
        test_finders = RemoteFinder.factory()
        finder = test_finders[0]
        startTime = 1496262000
        endTime   = 1496262060

        data = [
                {'start': startTime,
                 'step': 60,
                 'end': endTime,
                 'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                 'name': 'a.b.c.d'
                }
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
            }
        ]
        self.assertEqual(result, expected_response)
