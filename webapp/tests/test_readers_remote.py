from .base import TestCase

import mock
import pickle

from urllib3.response import HTTPResponse
from StringIO import StringIO

from graphite.node import LeafNode
from graphite.finders.remote import RemoteFinder
from graphite.readers.remote import RemoteReader
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


#
# Test RemoteReader with multiple WhisperReader instances
#
class RemoteReaderTests(TestCase):

    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_init(self):
        test_finder = RemoteFinder()
        finder = test_finder.remote_stores[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query='a.b.c.d')

        self.assertIsNotNone(reader)

    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_repr(self):
        test_finder = RemoteFinder()
        finder = test_finder.remote_stores[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query='a.b.c.d')

        self.assertIsNotNone(reader)
        self.assertRegexpMatches(str(reader), "<RemoteReader\[.*\]: 127.0.0.1>")

    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_get_intervals(self):
        test_finder = RemoteFinder()
        finder = test_finder.remote_stores[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query='a.b.c.d')
        self.assertEqual(reader.get_intervals(), [])

    # Test RemoteReader._fetch()
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader__fetch(self, http_request):
        startTime = 1496262000
        endTime   = 1496262060

        url = 'http://127.0.0.1/render/'
        query_string = 'a.b.c.d'
        query_params = [
            ('format', 'pickle'),
            ('local', '1'),
            ('noCache', '1'),
            ('from', str(int(startTime))),
            ('until', str(int(endTime)))
        ]
        headers = ''

        test_finder = RemoteFinder()
        finder = test_finder.remote_stores[0]
        reader = RemoteReader(finder,
                              {'intervals': [], 'path': 'a.b.c.d'},
                              bulk_query='a.b.c.d')

        # Response was an error
        responseObject = HTTPResponse(status=400)
        http_request.return_value = responseObject
        ret = reader._fetch(url, query_string, query_params, headers)
        self.assertEqual(ret, [])

        # 200 response with bad result.data
        responseObject = HTTPResponse(status=200)
        http_request.return_value = responseObject
        ret = reader._fetch(url, query_string, query_params, headers)
        self.assertEqual(ret, [])

        # 200 response with good result.data
        responseObject = HTTPResponse(body=StringIO(pickle.dumps(['a'])), status=200)
        http_request.return_value = responseObject
        ret = reader._fetch(url, query_string, query_params, headers)
        self.assertEqual(ret, ['a'])

    #
    # Test RemoteReader.fetch_list()
    #
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_fetch_list_empty_bulk_query(self):
        test_finder = RemoteFinder()
        finder = test_finder.remote_stores[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query='')
        startTime = 1496262000
        endTime   = 1496262060

        ret = reader.fetch_list(startTime, endTime)
        self.assertEqual(ret, [])

    @mock.patch('django.conf.settings.USE_WORKER_POOL', False)
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_fetch_list_no_worker_pool(self, http_request):
        test_finder = RemoteFinder()
        finder = test_finder.remote_stores[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query='a.b.c.d')
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

        # 200 response with good result.data
        responseObject = HTTPResponse(body=StringIO(pickle.dumps(data)), status=200)
        http_request.return_value = responseObject
        ret = reader.fetch_list(startTime, endTime)
        data[0]['path'] = 'a.b.c.d'
        self.assertEqual(ret.waitForResults(), data)

    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_fetch_list(self, http_request):
        test_finder = RemoteFinder()
        finder = test_finder.remote_stores[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query='a.b.c.d')
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
        ret = reader.fetch_list(startTime, endTime)
        data[0]['path'] = 'a.b.c.d'
        self.assertEqual(ret.waitForResults(), data)

    #
    # Test RemoteReader.fetch()
    #
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_fetch(self, http_request):
        test_finder = RemoteFinder()
        finder = test_finder.remote_stores[0]
        reader = RemoteReader(finder,
                              {'intervals': [], 'path': 'a.b.c.d'},
                              bulk_query='a.b.c.d')
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
        ret = reader.fetch(startTime, endTime)
        expected_response = ((1496262000, 1496262060, 60), [1.0, 0.0, 1.0, 0.0, 1.0])
        self.assertEqual(ret.waitForResults(), expected_response)

    #
    # Test RemoteFinder.fetch()
    #
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteFinder_fetch(self, http_request):
        finder = test_finder = RemoteFinder()
        store = test_finder.remote_stores[0]
        reader = RemoteReader(store,
                              {'intervals': [], 'path': 'a.b.c.d'},
                              bulk_query='a.b.c.d')
        node = LeafNode('a.b.c.d', reader)
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

        ret = finder.fetch(['a.b.c.d'], startTime, endTime)
        expected_response = ((1496262000, 1496262060, 60), [1.0, 0.0, 1.0, 0.0, 1.0])
        expected_response = [
            {
                'name': 'a.b.c.d',
                'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                'pathExpression': 'a.b.c.d',
                'time_info': (1496262000, 1496262060, 60)
            }, {
                'name': 'a.b.c.d',
                'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                'pathExpression': 'a.b.c.d',
                'time_info': (1496262000, 1496262060, 60)
            }
        ]
        result = list(ret.waitForResults())
        self.assertEqual(result, expected_response)
