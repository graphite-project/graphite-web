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
    # Test RemoteReader.fetch()
    #
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    @mock.patch('django.conf.settings.INTRACLUSTER_HTTPS', False)
    @mock.patch('django.conf.settings.REMOTE_STORE_USE_POST', False)
    @mock.patch('django.conf.settings.REMOTE_FETCH_TIMEOUT', 10)
    def test_RemoteReader_fetch(self, http_request):
        test_finders = RemoteFinder.factory()
        finder = test_finders[0]

        startTime = 1496262000
        endTime   = 1496262060

        # no path or bulk_query
        reader = RemoteReader(finder,{})
        self.assertEqual(reader.bulk_query, [])
        result = reader.fetch(startTime, endTime)
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
        self.assertEqual(http_request.call_args[0], (
          'GET',
          'http://127.0.0.1/render/',
        ))
        self.assertEqual(http_request.call_args[1], {
          'fields': [
            ('format', 'pickle'),
            ('local', '1'),
            ('noCache', '1'),
            ('from', str(int(startTime))),
            ('until', str(int(endTime))),
            ('target', 'a.b.c.d'),
          ],
          'headers': None,
          'timeout': 10,
        })

        # bulk_query & now
        reader = RemoteReader(finder, {'intervals': [], 'path': 'a.b.c.d'}, bulk_query=['a.b.c.d'])

        result = reader.fetch(startTime, endTime, now=endTime, requestContext={'forwardHeaders': {'Authorization': 'Basic xxxx'}})
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
        self.assertEqual(http_request.call_args[0], (
          'GET',
          'http://127.0.0.1/render/',
        ))
        self.assertEqual(http_request.call_args[1], {
          'fields': [
            ('format', 'pickle'),
            ('local', '1'),
            ('noCache', '1'),
            ('from', str(int(startTime))),
            ('until', str(int(endTime))),
            ('target', 'a.b.c.d'),
            ('now', str(int(endTime))),
          ],
          'headers': {'Authorization': 'Basic xxxx'},
          'timeout': 10,
        })

        # non-200 response
        responseObject = HTTPResponse(body='error', status=500)
        http_request.return_value = responseObject

        with self.assertRaisesRegexp(Exception, 'Error response 500 from http://.+'):
          reader.fetch(startTime, endTime)

        # exception raised by request()
        http_request.side_effect = Exception('error')

        with self.assertRaisesRegexp(Exception, 'Error requesting http://.+: error'):
          reader.fetch(startTime, endTime)

    #
    # Test RemoteFinder.fetch()
    #
    @mock.patch('urllib3.PoolManager.request')
    @mock.patch('django.conf.settings.CLUSTER_SERVERS', ['127.0.0.1', '8.8.8.8'])
    @mock.patch('django.conf.settings.INTRACLUSTER_HTTPS', True)
    @mock.patch('django.conf.settings.REMOTE_STORE_USE_POST', True)
    @mock.patch('django.conf.settings.REMOTE_FETCH_TIMEOUT', 10)
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
        self.assertEqual(http_request.call_args[0], (
          'POST',
          'https://127.0.0.1/render/',
        ))
        self.assertEqual(http_request.call_args[1], {
          'fields': [
            ('format', 'pickle'),
            ('local', '1'),
            ('noCache', '1'),
            ('from', str(int(startTime))),
            ('until', str(int(endTime))),
            ('target', 'a.b.c.d'),
          ],
          'headers': None,
          'timeout': 10,
        })
