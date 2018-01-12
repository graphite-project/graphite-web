from .base import TestCase

import mock

from urllib3.response import HTTPResponse

from graphite.finders.remote import RemoteFinder
from graphite.readers.remote import RemoteReader
from graphite.util import pickle, BytesIO, msgpack
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


#
# Test RemoteReader with multiple WhisperReader instances
#
class RemoteReaderTests(TestCase):

    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    def test_RemoteReader_init_repr_get_intervals(self):
        finders = RemoteFinder.factory()
        self.assertEqual(len(finders), 2)
        self.assertEqual(finders[0].host, '127.0.0.1')
        self.assertEqual(finders[1].host, '8.8.8.8')

        finder = finders[0]
        reader = RemoteReader(finder,
                              {'intervals': []},
                              bulk_query=['a.b.c.d'])

        self.assertIsNotNone(reader)
        self.assertRegexpMatches(str(reader), "<RemoteReader\[.*\]: 127.0.0.1 a.b.c.d>")
        self.assertEqual(reader.get_intervals(), [])

    #
    # Test RemoteReader.fetch_multi()
    #
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', 'http://8.8.8.8/graphite?format=msgpack&local=0'])
    @mock.patch('django.conf.settings.INTRACLUSTER_HTTPS', False)
    @mock.patch('django.conf.settings.REMOTE_STORE_USE_POST', False)
    @mock.patch('django.conf.settings.FETCH_TIMEOUT', 10)
    def test_RemoteReader_fetch_multi(self, http_request):
        test_finders = RemoteFinder.factory()
        finder = test_finders[0]

        startTime = 1496262000
        endTime   = 1496262060

        # no path or bulk_query
        reader = RemoteReader(finder,{})
        self.assertEqual(reader.bulk_query, [])
        result = reader.fetch_multi(startTime, endTime)
        self.assertEqual(result, [])
        self.assertEqual(http_request.call_count, 0)

        # path
        reader = RemoteReader(finder, {'intervals': [], 'path': 'a.b.c.d'})

        data = [
                {'start': startTime,
                 'step': 60,
                 'end': endTime,
                 'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                 'name': 'a.b.c.d'
                }
               ]
        responseObject = HTTPResponse(body=BytesIO(pickle.dumps(data)), status=200, preload_content=False)
        http_request.return_value = responseObject

        result = reader.fetch_multi(startTime, endTime)
        expected_response = [
            {
                'pathExpression': 'a.b.c.d',
                'name': 'a.b.c.d',
                'time_info': (1496262000, 1496262060, 60),
                'values': [1.0, 0.0, 1.0, 0.0, 1.0],
            }
        ]
        self.assertEqual(result, expected_response)
        self.assertEqual(http_request.call_args[0], (
          'GET',
          'http://127.0.0.1/render/',
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

        # bulk_query & now
        finder = test_finders[1]
        reader = RemoteReader(finder, {'intervals': [], 'path': 'a.b.c.d'}, bulk_query=['a.b.c.d'])

        data = [
                {'start': startTime,
                 'step': 60,
                 'end': endTime,
                 'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                 'name': 'a.b.c.d'
                }
               ]
        responseObject = HTTPResponse(
          body=BytesIO(msgpack.dumps(data, use_bin_type=True)),
          status=200,
          preload_content=False,
          headers={'Content-Type': 'application/x-msgpack'}
        )
        http_request.return_value = responseObject

        result = reader.fetch_multi(startTime, endTime, now=endTime, requestContext={'forwardHeaders': {'Authorization': 'Basic xxxx'}})
        expected_response = [
            {
                'pathExpression': 'a.b.c.d',
                'name': 'a.b.c.d',
                'time_info': (1496262000, 1496262060, 60),
                'values': [1.0, 0.0, 1.0, 0.0, 1.0],
            }
        ]
        self.assertEqual(result, expected_response)
        self.assertEqual(http_request.call_args[0], (
          'GET',
          'http://8.8.8.8/graphite/render/',
        ))
        self.assertEqual(http_request.call_args[1], {
          'fields': [
            ('format', 'msgpack'),
            ('local', '0'),
            ('noCache', '1'),
            ('from', startTime),
            ('until', endTime),
            ('target', 'a.b.c.d'),
            ('now', endTime),
          ],
          'headers': {'Authorization': 'Basic xxxx'},
          'preload_content': False,
          'timeout': 10,
        })

        # non-pickle response
        responseObject = HTTPResponse(body=BytesIO(b'error'), status=200, preload_content=False)
        http_request.return_value = responseObject

        with self.assertRaisesRegexp(Exception, 'Error decoding render response from http://[^ ]+: .+'):
          reader.fetch(startTime, endTime)

        # invalid response data
        data = [
          {},
        ]
        responseObject = HTTPResponse(
          body=BytesIO(msgpack.dumps(data, use_bin_type=True)),
          status=200,
          preload_content=False,
          headers={'Content-Type': 'application/x-msgpack'}
        )
        http_request.return_value = responseObject

        with self.assertRaisesRegexp(Exception, 'Invalid render response from http://[^ ]+: KeyError\(\'name\',\)'):
          reader.fetch(startTime, endTime)

        # non-200 response
        responseObject = HTTPResponse(body=BytesIO(b'error'), status=500, preload_content=False)
        http_request.return_value = responseObject

        with self.assertRaisesRegexp(Exception, 'Error response 500 from http://[^ ]+'):
          reader.fetch(startTime, endTime)

        # exception raised by request()
        http_request.side_effect = Exception('error')

        with self.assertRaisesRegexp(Exception, 'Error requesting http://[^ ]+: error'):
          reader.fetch(startTime, endTime)

    #
    # Test RemoteReader.fetch()
    #
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    @mock.patch('django.conf.settings.INTRACLUSTER_HTTPS', False)
    @mock.patch('django.conf.settings.REMOTE_STORE_USE_POST', False)
    @mock.patch('django.conf.settings.FETCH_TIMEOUT', 10)
    def test_RemoteReader_fetch(self, http_request):
        test_finders = RemoteFinder.factory()
        finder = test_finders[0]

        startTime = 1496262000
        endTime   = 1496262060

        # no path or bulk_query
        reader = RemoteReader(finder,{})
        self.assertEqual(reader.bulk_query, [])
        result = reader.fetch(startTime, endTime)
        self.assertEqual(result, None)
        self.assertEqual(http_request.call_count, 0)

        # path & bulk_query
        reader = RemoteReader(finder, {'intervals': [], 'path': 'a.b.c.d'}, bulk_query=['a.b.c.*'])

        data = [
                {'start': startTime,
                 'step': 60,
                 'end': endTime,
                 'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                 'name': 'a.b.c.c'
                },
                {'start': startTime,
                 'step': 60,
                 'end': endTime,
                 'values': [1.0, 0.0, 1.0, 0.0, 1.0],
                 'name': 'a.b.c.d'
                }
               ]
        responseObject = HTTPResponse(body=BytesIO(pickle.dumps(data)), status=200, preload_content=False)
        http_request.return_value = responseObject
        result = reader.fetch(startTime, endTime)
        expected_response = ((1496262000, 1496262060, 60), [1.0, 0.0, 1.0, 0.0, 1.0])
        self.assertEqual(result, expected_response)
        self.assertEqual(http_request.call_args[0], (
          'GET',
          'http://127.0.0.1/render/',
        ))
        self.assertEqual(http_request.call_args[1], {
          'fields': [
            ('format', 'pickle'),
            ('local', '1'),
            ('noCache', '1'),
            ('from', startTime),
            ('until', endTime),
            ('target', 'a.b.c.*'),
          ],
          'headers': None,
          'preload_content': False,
          'timeout': 10,
        })
