from datetime import datetime
import copy
import os
import time
import math
import logging
import shutil
import sys

from mock import patch

from graphite.render.datalib import TimeSeries
from graphite.render.hashing import ConsistentHashRing, hashRequest, hashData
from graphite.render.evaluator import evaluateTarget, extractPathExpressions, evaluateScalarTokens
from graphite.render.functions import NormalizeEmptyResultError
from graphite.render.grammar import grammar
from graphite.render.views import renderViewJson
from graphite.util import pickle, msgpack, json
import whisper

from django.conf import settings
try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse
from django.http import HttpRequest, QueryDict
from .base import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())

if sys.version_info[0] >= 3:
    def resp_text(r):
        return r.content.decode('utf-8')
else:
    def resp_text(r):
        return r.content

class RenderTest(TestCase):
    db = os.path.join(settings.WHISPER_DIR, 'test.wsp')
    db2 = os.path.join(settings.WHISPER_DIR, 'test2.wsp')
    hostcpu = os.path.join(settings.WHISPER_DIR, 'hosts/hostname/cpu.wsp')

    def wipe_whisper(self):
        for path in [self.db, self.db2]:
            try:
                os.remove(path)
            except OSError:
                pass

    def create_whisper_hosts(self):
        worker1 = self.hostcpu.replace('hostname', 'worker1')
        worker2 = self.hostcpu.replace('hostname', 'worker2')
        try:
            os.makedirs(worker1.replace('cpu.wsp', ''))
            os.makedirs(worker2.replace('cpu.wsp', ''))
        except OSError:
            pass

        whisper.create(worker1, [(1, 60)])
        whisper.create(worker2, [(1, 60)])

        ts = int(time.time())
        whisper.update(worker1, 1, ts)
        whisper.update(worker2, 2, ts)

    def wipe_whisper_hosts(self):
        try:
            os.remove(self.hostcpu.replace('hostname', 'worker1'))
            os.remove(self.hostcpu.replace('hostname', 'worker2'))
            shutil.rmtree(self.hostcpu.replace('hostname/cpu.wsp', ''))
        except OSError:
            pass

    def test_render_extractPathExpressions(self):
        test_input = ['somefunc(my.metri[cz].{one,two})|anotherfunc()=123', 'target1,target2', '']
        expected_output = ['my.metri[cz].{one,two}', 'target1']
        outputs = extractPathExpressions({}, test_input)

        self.assertEqual(sorted(outputs), sorted(expected_output))

    def test_render_extractPathExpressions_template(self):
        test_input = [
          'template(target.$test)',
          'template(target.$test, test="foo")',
          'template(target.$1)',
          'template(target.$1, "bar")'
        ]

        # no template in request context, use values from expression
        expected_output = ['target.$test', 'target.foo', 'target.$1', 'target.bar']
        outputs = extractPathExpressions({}, test_input)
        self.assertEqual(sorted(outputs), sorted(expected_output))

        # template in request context, use those values
        expected_output = ['target.blah', 'target.baz']
        outputs = extractPathExpressions({'template': {'test': 'blah', '1': 'baz'}}, test_input)
        self.assertEqual(sorted(outputs), sorted(expected_output))

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    @patch('graphite.render.evaluator.fetchData', lambda requestContext, expression: [expression])
    def test_render_evaluateTokens_template(self):
        test_input = [
          'template(target.$test)',
          'template(target.$test, test="foo")',
          'template(target.$1)',
          'template(target.$1, "bar")'
          '',
          None,
        ]

        # no template in request context, use values from expression
        expected_output = ['target.$test', 'target.foo', 'target.$1', 'target.bar']
        outputs = evaluateTarget({}, test_input)
        self.assertEqual(sorted(outputs), sorted(expected_output))

        # template in request context, use those values
        expected_output = ['target.blah', 'target.blah', 'target.baz', 'target.baz']
        outputs = evaluateTarget({'template': {'test': 'blah', '1': 'baz'}}, test_input)
        self.assertEqual(sorted(outputs), sorted(expected_output))

        # invalid template call
        test_input = [
          'template(target.$test, test=foo.bar)',
        ]

        with self.assertRaisesRegexp(ValueError, 'invalid template\(\) syntax, only string/numeric arguments are allowed'):
          evaluateTarget({}, test_input)

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_render_evaluateTokens_NormalizeEmptyResultError(self):
        def raiseError(requestContext):
          raise NormalizeEmptyResultError

        with patch('graphite.functions._SeriesFunctions', {'test': raiseError}):
          outputs = evaluateTarget({}, 'test()')
          self.assertEqual(outputs, [])

    @patch('graphite.render.evaluator.prefetchData', lambda *_: None)
    def test_render_evaluateTokens_TimeSeries(self):
        timeseries = TimeSeries('test', 0, 1, 1, [1])

        def returnTimeSeries(requestContext):
          return timeseries

        with patch('graphite.functions._SeriesFunctions', {'test': returnTimeSeries}):
          outputs = evaluateTarget({}, 'test()')
          self.assertEqual(outputs, [timeseries])

    def test_render_evaluateScalarTokens(self):
        # test parsing numeric arguments
        tokens = grammar.parseString('test(1, 1.0, 1e3, True, false, None, none)')
        self.assertEqual(evaluateScalarTokens(tokens.expression.call.args[0]), 1)
        self.assertEqual(evaluateScalarTokens(tokens.expression.call.args[1]), 1.0)
        self.assertEqual(evaluateScalarTokens(tokens.expression.call.args[2]), 1e3)
        self.assertEqual(evaluateScalarTokens(tokens.expression.call.args[3]), True)
        self.assertEqual(evaluateScalarTokens(tokens.expression.call.args[4]), False)
        self.assertIsNone(evaluateScalarTokens(tokens.expression.call.args[5]))
        self.assertIsNone(evaluateScalarTokens(tokens.expression.call.args[6]))

        # test invalid tokens
        class ScalarToken(object):
          number = None
          string = None
          boolean = None
          none = None

        class ScalarTokenNumber(object):
          integer = None
          float = None
          scientific = None

        with self.assertRaisesRegexp(ValueError, 'unknown token in target evaluator'):
          tokens = ScalarToken()
          evaluateScalarTokens(tokens)

        with self.assertRaisesRegexp(ValueError, 'unknown numeric type in target evaluator'):
          tokens = ScalarToken()
          tokens.number = ScalarTokenNumber()
          evaluateScalarTokens(tokens)

    def test_render_view(self):
        url = reverse('render')

        # Very very basic tests of the render view responding to input params
        # The test target does not exist, so there is no data to return
        # These do not check any graphs are drawn properly.

        # Raw format
        response = self.client.get(url, {'target': 'test', 'format': 'raw'})
        self.assertEqual(response.content, b"")
        self.assertEqual(response['Content-Type'], 'text/plain')

        # json format
        response = self.client.get(url, {'target': 'test', 'format': 'json'})
        self.assertEqual(json.loads(response.content), [])
        self.assertTrue(response.has_header('Expires'))

        # no format returns image/png
        response = self.client.get(url, {'target': 'test'})
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertTrue(response.has_header('Expires'))

        # png format returns image/png
        response = self.client.get(url, {'target': 'test', 'format': 'png'})
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertTrue(response.has_header('Expires'))

        # svg format returns image/svg+xml
        response = self.client.get(url, {'target': 'test', 'format': 'svg'})
        self.assertEqual(response['Content-Type'], 'image/svg+xml')
        self.assertTrue(response.has_header('Expires'))

        # pdf format returns application/x-pdf
        response = self.client.get(url, {'target': 'test', 'format': 'pdf'})
        self.assertEqual(response['Content-Type'], 'application/x-pdf')
        self.assertTrue(response.has_header('Expires'))

        # Verify graphType=pie returns
        response = self.client.get(url, {'target': 'a:50', 'graphType': 'pie'})
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertTrue(response.has_header('Expires'))

        response = self.client.get(url, {'target': 'test', 'graphType': 'pie'})
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertTrue(response.has_header('Expires'))

        # dygraph format
        response = self.client.get(url, {'target': 'test', 'format': 'dygraph'})
        self.assertEqual(json.loads(response.content), {})
        self.assertTrue(response.has_header('Expires'))

        response = self.client.get(url, {'target': 'test', 'format': 'rickshaw'})
        self.assertEqual(json.loads(response.content), [])
        self.assertTrue(response.has_header('Expires'))

        # More invasive tests
        self.addCleanup(self.wipe_whisper)
        whisper.create(self.db, [(1, 60)])

        ts = int(time.time())
        whisper.update(self.db, 0.1234567890123456789012, ts - 5)
        whisper.update(self.db, 0.4, ts - 4)
        whisper.update(self.db, 0.6, ts - 3)
        whisper.update(self.db, float('inf'), ts - 2)
        whisper.update(self.db, float('-inf'), ts - 1)
        whisper.update(self.db, float('nan'), ts)

        whisper.create(self.db2, [(1, 60)])

        ts = int(time.time())
        whisper.update(self.db2, 1, ts - 5)
        whisper.update(self.db2, 2, ts - 4)
        whisper.update(self.db2, 3, ts - 3)
        whisper.update(self.db2, 4, ts - 2)
        whisper.update(self.db2, 5, ts - 1)
        whisper.update(self.db2, 6, ts)

        csv_response = ""
        for i in range(ts-49, ts-5):
            csv_response += "test," + datetime.fromtimestamp(i).strftime("%Y-%m-%d %H:%M:%S") + ",\r\n"
        csv_response += (
            "test," + datetime.fromtimestamp(ts-5).strftime("%Y-%m-%d %H:%M:%S") + ",0.12345678901234568\r\n"
            "test," + datetime.fromtimestamp(ts-4).strftime("%Y-%m-%d %H:%M:%S") + ",0.4\r\n"
            "test," + datetime.fromtimestamp(ts-3).strftime("%Y-%m-%d %H:%M:%S") + ",0.6\r\n"
            "test," + datetime.fromtimestamp(ts-2).strftime("%Y-%m-%d %H:%M:%S") + ",inf\r\n"
            "test," + datetime.fromtimestamp(ts-1).strftime("%Y-%m-%d %H:%M:%S") + ",-inf\r\n"
            "test," + datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S") + ",nan\r\n"
        )

        response = self.client.get(url, {'target': 'test', 'format': 'csv', 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'text/csv')
        self.assertEqual(sorted(response['cache-control'].split(', ')), ['max-age=60'])
        self.assertEqual(resp_text(response), csv_response)

        # test noCache flag
        response = self.client.get(url, {'target': 'test', 'format': 'csv', 'noCache': 1, 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'text/csv')
        self.assertEqual(sorted(response['cache-control'].split(', ')), ['max-age=0', 'must-revalidate', 'no-cache', 'no-store'])
        self.assertEqual(resp_text(response), csv_response)

        # test cacheTimeout=0 flag
        response = self.client.get(url, {'target': 'test', 'format': 'csv', 'cacheTimeout': 0, 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'text/csv')
        self.assertEqual(sorted(response['cache-control'].split(', ')), ['max-age=0', 'must-revalidate', 'no-cache', 'no-store'])
        self.assertEqual(resp_text(response), csv_response)

        # test alternative target syntax
        response = self.client.get(url, {'target[]': 'test', 'format': 'csv', 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'text/csv')
        self.assertEqual(sorted(response['cache-control'].split(', ')), ['max-age=60'])
        self.assertEqual(resp_text(response), csv_response)

        # test multiple targets & empty targets
        csv_response = ""
        for i in range(ts-49, ts-5):
            csv_response += "test," + datetime.fromtimestamp(i).strftime("%Y-%m-%d %H:%M:%S") + ",\r\n"
        csv_response += (
            "test," + datetime.fromtimestamp(ts-5).strftime("%Y-%m-%d %H:%M:%S") + ",0.12345678901234568\r\n"
            "test," + datetime.fromtimestamp(ts-4).strftime("%Y-%m-%d %H:%M:%S") + ",0.4\r\n"
            "test," + datetime.fromtimestamp(ts-3).strftime("%Y-%m-%d %H:%M:%S") + ",0.6\r\n"
            "test," + datetime.fromtimestamp(ts-2).strftime("%Y-%m-%d %H:%M:%S") + ",inf\r\n"
            "test," + datetime.fromtimestamp(ts-1).strftime("%Y-%m-%d %H:%M:%S") + ",-inf\r\n"
            "test," + datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S") + ",nan\r\n"
        )
        for i in range(ts-49, ts-5):
            csv_response += "test2," + datetime.fromtimestamp(i).strftime("%Y-%m-%d %H:%M:%S") + ",\r\n"
        csv_response += (
            "test2," + datetime.fromtimestamp(ts-5).strftime("%Y-%m-%d %H:%M:%S") + ",1.0\r\n"
            "test2," + datetime.fromtimestamp(ts-4).strftime("%Y-%m-%d %H:%M:%S") + ",2.0\r\n"
            "test2," + datetime.fromtimestamp(ts-3).strftime("%Y-%m-%d %H:%M:%S") + ",3.0\r\n"
            "test2," + datetime.fromtimestamp(ts-2).strftime("%Y-%m-%d %H:%M:%S") + ",4.0\r\n"
            "test2," + datetime.fromtimestamp(ts-1).strftime("%Y-%m-%d %H:%M:%S") + ",5.0\r\n"
            "test2," + datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S") + ",6.0\r\n"
        )

        response = self.client.get(url + '?target=test&target=%20test2&target=%20&format=csv&from=' + str(ts - 50) + '&now=' + str(ts))
        self.assertEqual(response['content-type'], 'text/csv')
        self.assertEqual(sorted(response['cache-control'].split(', ')), ['max-age=60'])
        self.assertEqual(resp_text(response).split("\r\n"), csv_response.split("\r\n"))
        self.assertEqual(resp_text(response), csv_response)

        response = self.client.get(url + '?target[]=test&target[]=%20test2&target[]=%20&format=csv&from=' + str(ts - 50) + '&now=' + str(ts))
        self.assertEqual(response['content-type'], 'text/csv')
        self.assertEqual(sorted(response['cache-control'].split(', ')), ['max-age=60'])
        self.assertEqual(resp_text(response).split("\r\n"), csv_response.split("\r\n"))
        self.assertEqual(resp_text(response), csv_response)

        # test no targets
        response = self.client.get(url, {'format': 'csv'})
        self.assertEqual(response['content-type'], 'text/csv')
        self.assertEqual(sorted(response['cache-control'].split(', ')), ['max-age=60'])
        self.assertEqual(response.content, b'')

        # test raw format
        raw_data = ("None,None,None,None,None,None,None,None,None,None,None,"
                    "None,None,None,None,None,None,None,None,None,None,None,"
                    "None,None,None,None,None,None,None,None,None,None,None,"
                    "None,None,None,None,None,None,None,None,None,None,None,"
                    "0.12345678901234568,0.4,0.6,inf,-inf,nan")
        raw_response = "test,%d,%d,1|%s\n" % (ts-49, ts+1, raw_data)
        response = self.client.get(url, {'target': 'test', 'format': 'raw', 'from': ts-50, 'now': ts})
        self.assertEqual(resp_text(response), raw_response)

        response = self.client.get(url, {'target': 'test', 'format': 'raw', 'from': ts-50, 'until': ts})
        self.assertEqual(resp_text(response), raw_response)

        response = self.client.get(url, {'target': 'test', 'rawData': 1, 'from': ts-50, 'now': ts})
        self.assertEqual(resp_text(response), raw_response)

        # test pickle format
        expected = [
            {
                'name': u'test',
                'pathExpression': u'test',
                'start': ts - 49,
                'end': ts + 1,
                'step': 1,
                'valuesPerPoint': 1,
                'consolidationFunc': 'average',
                'xFilesFactor': 0.0,
                'values': [None] * 44 + [0.12345678901234568, 0.4, 0.6, float('inf'), float('-inf'), 'NaN'],
            }
        ]
        self.maxDiff = None

        response = self.client.get(url, {'target': 'test', 'format': 'pickle', 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'application/pickle')
        unpickled = pickle.loads(response.content)
        # special handling for NaN value, otherwise assertEqual fails
        self.assertTrue(math.isnan(unpickled[0]['values'][-1]))
        unpickled[0]['values'][-1] = 'NaN'
        self.assertEqual(unpickled, expected)

        response = self.client.get(url, {'target': 'test', 'pickle': 1, 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'application/pickle')
        unpickled = pickle.loads(response.content)
        # special handling for NaN value, otherwise assertEqual fails
        self.assertTrue(math.isnan(unpickled[0]['values'][-1]))
        unpickled[0]['values'][-1] = 'NaN'
        self.assertEqual(unpickled, expected)

        # test msgpack format
        response = self.client.get(url, {'target': 'test', 'format': 'msgpack', 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'application/x-msgpack')
        unpickled = msgpack.loads(response.content, encoding='utf-8')
        # special handling for NaN value, otherwise assertEqual fails
        self.assertTrue(math.isnan(unpickled[0]['values'][-1]))
        unpickled[0]['values'][-1] = 'NaN'
        self.assertEqual(unpickled, expected)

        # test json format
        response = self.client.get(url, {'target': 'test', 'format': 'json', 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'application/json')
        self.assertIn('[1e9999, ' + str(ts - 2) + ']', resp_text(response))
        self.assertIn('[-1e9999, ' + str(ts - 1) + ']', resp_text(response))
        self.assertIn('[null, ' + str(ts) + ']', resp_text(response))
        data = json.loads(response.content)
        expected = [
            {
                'datapoints': [
                    [None, i] for i in range(ts-49, ts-6)
                ] + [
                    [None, ts - 6],
                    [0.12345678901234568, ts - 5],
                    [0.4, ts - 4],
                    [0.6, ts - 3],
                    [float('inf'), ts - 2],
                    [float('-inf'), ts - 1],
                    [None, ts]
                ],
                'target': 'test',
                'tags': {
                    'name': 'test',
                },
            }
        ]
        self.assertEqual(data, expected)

        # test jsonp
        responsejsonp = self.client.get(url, {'target': 'test', 'format': 'json', 'jsonp': 'test', 'from': ts-50, 'now': ts})
        self.assertEqual(responsejsonp['content-type'], 'text/javascript')
        self.assertEqual(resp_text(responsejsonp), 'test(' + resp_text(response) + ')')

        # test noNullPoints
        response = self.client.get(url, {'target': 'test', 'format': 'json', 'noNullPoints': 1, 'now': ts})
        self.assertEqual(response['content-type'], 'application/json')
        self.assertIn('[1e9999, ' + str(ts - 2) + ']', resp_text(response))
        self.assertIn('[-1e9999, ' + str(ts - 1) + ']', resp_text(response))
        self.assertNotIn('[null, ' + str(ts) + ']', resp_text(response))
        data = json.loads(response.content)
        expected = [
            {
                'datapoints': [
                    [0.12345678901234568, ts - 5],
                    [0.4, ts - 4],
                    [0.6, ts - 3],
                    [float('inf'), ts - 2],
                    [float('-inf'), ts - 1],
                ],
                'target': 'test',
                'tags': {
                    'name': 'test',
                },
            }
        ]
        self.assertEqual(data, expected)

        # test noNullPoints excludes series with only None values altogether
        response = self.client.get(url, {'target': 'test', 'format': 'json', 'noNullPoints': 1, 'until': ts-10})
        self.assertEqual(response['content-type'], 'application/json')
        data = json.loads(response.content)
        expected = []
        self.assertEqual(data, expected)

        # test maxDataPoints is respected, testing the returned values is done in test_maxDataPoints
        response = self.client.get(url, {'target': 'test', 'format': 'json', 'maxDataPoints': 10, 'from': ts-50, 'until': ts-10})
        self.assertEqual(response['content-type'], 'application/json')
        data = json.loads(response.content)
        self.assertEqual(len(data[0]['datapoints']), 10)

        # test dygraph
        response = self.client.get(url, {'target': 'test', 'format': 'dygraph', 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'application/json')
        self.assertIn('[' + str((ts - 2) * 1000) + ', Infinity]', resp_text(response))
        self.assertIn('[' + str((ts - 1) * 1000) + ', -Infinity]', resp_text(response))
        data = json.loads(response.content)
        end = data['data'][-7:]
        self.assertEqual(end,
            [[(ts - 6) * 1000, None],
             # Floats lose some precision on Py2. str() makes it match the tested code
            [(ts - 5) * 1000, float(str(0.12345678901234568))],
            [(ts - 4) * 1000, 0.4],
            [(ts - 3) * 1000, 0.6],
            [(ts - 2) * 1000, float('inf')],
            [(ts - 1) * 1000, float('-inf')],
            [ts * 1000, None]])

        responsejsonp = self.client.get(url, {'target': 'test', 'format': 'dygraph', 'jsonp': 'test', 'from': ts-50, 'now': ts})
        self.assertEqual(responsejsonp['content-type'], 'text/javascript')
        self.assertEqual(resp_text(responsejsonp), 'test(' + resp_text(response) + ')')

        # test rickshaw
        response = self.client.get(url, {'target': 'test', 'format': 'rickshaw', 'from': ts-50, 'now': ts})
        self.assertEqual(response['content-type'], 'application/json')
        data = json.loads(response.content)
        end = data[0]['datapoints'][-7:-1]
        self.assertEqual(end,
            [{'x': ts - 6, 'y': None},
            {'x': ts - 5, 'y': 0.12345678901234568},
            {'x': ts - 4, 'y': 0.4},
            {'x': ts - 3, 'y': 0.6},
            {'x': ts - 2, 'y': float('inf')},
            {'x': ts - 1, 'y': float('-inf')}])

        last = data[0]['datapoints'][-1]
        self.assertEqual(last['x'], ts)
        self.assertTrue(math.isnan(last['y']))

        responsejsonp = self.client.get(url, {'target': 'test', 'format': 'rickshaw', 'jsonp': 'test', 'from': ts-50, 'now': ts})
        self.assertEqual(responsejsonp['content-type'], 'text/javascript')
        self.assertEqual(resp_text(responsejsonp), 'test(' + resp_text(response) + ')')


    def verify_maxDataPoints(self, data, tests):
        requestOptions = {}
        for (maxDataPoints, expectedData) in tests:
            requestOptions['maxDataPoints'] = maxDataPoints
            expected = [
                {
                    'datapoints': expectedData,
                    'target': 'test',
                    'tags': {
                        'name': 'test',
                    },
                }
            ]
            response = renderViewJson(requestOptions, copy.deepcopy(data))
            self.assertEqual(response['content-type'], 'application/json')
            result = json.loads(response.content)
            self.assertEqual(result[0]['datapoints'], expected[0]['datapoints'])
            self.assertEqual(result, expected)


    def test_maxDataPoints(self):
        # regular consolidate
        data = [
            TimeSeries('test', 1, 21, 1, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], consolidate='sum')
        ]

        tests = [
            (21, [ [1,  1], [2,  2], [3,  3], [4,  4], [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20] ]),
            (20, [ [1,  1], [2,  2], [3,  3], [4,  4], [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20] ]),
            (19, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (18, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (17, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (16, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (15, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (14, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (13, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (12, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (11, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (10, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (9, [ [9, 3], [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [20, 21] ]),
            (8, [ [9, 3], [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [20, 21] ]),
            (7, [ [9, 3], [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [20, 21] ]),
            (6, [ [18, 4], [34, 8], [50, 12], [66, 16], [39, 20] ]),
            (5, [ [18, 4], [34, 8], [50, 12], [66, 16], [39, 20] ]),
            (4, [ [30, 5], [55, 10], [80, 15], [39, 20] ]),
            (3, [ [63, 7], [112, 14], [20, 21] ]),
            (2, [ [135, 10], [39, 20] ]),
            (1, [ [210, 1] ]),
        ]

        self.verify_maxDataPoints(data, tests)

        # advance time window 2 seconds
        data = [
            TimeSeries('test', 3, 23, 1, [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22], consolidate='sum')
        ]

        tests = [
            (21, [ [3,  3], [4,  4], [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22] ]),
            (20, [ [3,  3], [4,  4], [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22] ]),
            (19, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (18, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (17, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (16, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (15, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (14, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (13, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (12, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (11, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (10, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (9, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21] ]),
            (8, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21] ]),
            (7, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21] ]),
            (6, [ [18, 4], [34, 8], [50, 12], [66, 16], [82, 20] ]),
            (5, [ [18, 4], [34, 8], [50, 12], [66, 16], [82, 20] ]),
            (4, [ [30, 5], [55, 10], [80, 15], [82, 20] ]),
            (3, [ [63, 7], [112, 14], [63, 21] ]),
            (2, [ [135, 10], [82, 20] ]),
            (1, [ [250, 3] ]),
        ]

        self.verify_maxDataPoints(data, tests)

        # advance time window 4 seconds
        data = [
            TimeSeries('test', 5, 25, 1, [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24], consolidate='sum')
        ]

        tests = [
            (21, [ [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22], [23,  23], [24,  24] ]),
            (20, [ [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22], [23,  23], [24,  24] ]),
            (19, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (18, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (17, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (16, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (15, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (14, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (13, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (12, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (11, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (10, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (9, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21], [47, 24] ]),
            (8, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21], [47, 24] ]),
            (7, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21], [47, 24] ]),
            (6, [ [34, 8], [50, 12], [66, 16], [82, 20], [47, 24] ]),
            (5, [ [34, 8], [50, 12], [66, 16], [82, 20], [47, 24] ]),
            (4, [ [55, 10], [80, 15], [105, 20], [24, 25] ]),
            (3, [ [63, 7], [112, 14], [110, 21] ]),
            (2, [ [135, 10], [129, 20] ]),
            (1, [ [290, 5] ]),
        ]

        self.verify_maxDataPoints(data, tests)

        # xFilesFactor = 1
        data = [
            TimeSeries('test', 1, 21, 1, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], consolidate='sum', xFilesFactor=1)
        ]

        tests = [
            (21, [ [1,  1], [2,  2], [3,  3], [4,  4], [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20] ]),
            (20, [ [1,  1], [2,  2], [3,  3], [4,  4], [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20] ]),
            (19, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (18, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (17, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (16, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (15, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (14, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (13, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (12, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (11, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (10, [ [3, 2], [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20] ]),
            (9, [ [9, 3], [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [None, 21] ]),
            (8, [ [9, 3], [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [None, 21] ]),
            (7, [ [9, 3], [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [None, 21] ]),
            (6, [ [18, 4], [34, 8], [50, 12], [66, 16], [None, 20] ]),
            (5, [ [18, 4], [34, 8], [50, 12], [66, 16], [None, 20] ]),
            (4, [ [30, 5], [55, 10], [80, 15], [None, 20] ]),
            (3, [ [63, 7], [112, 14], [None, 21] ]),
            (2, [ [135, 10], [None, 20] ]),
            (1, [ [210, 1] ]),
        ]

        self.verify_maxDataPoints(data, tests)

        # advance time window 2 seconds
        data = [
            TimeSeries('test', 3, 23, 1, [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22], consolidate='sum', xFilesFactor=1)
        ]

        tests = [
            (21, [ [3,  3], [4,  4], [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22] ]),
            (20, [ [3,  3], [4,  4], [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22] ]),
            (19, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (18, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (17, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (16, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (15, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (14, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (13, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (12, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (11, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (10, [ [7, 4], [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22] ]),
            (9, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21] ]),
            (8, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21] ]),
            (7, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21] ]),
            (6, [ [18, 4], [34, 8], [50, 12], [66, 16], [82, 20] ]),
            (5, [ [18, 4], [34, 8], [50, 12], [66, 16], [82, 20] ]),
            (4, [ [30, 5], [55, 10], [80, 15], [None, 20] ]),
            (3, [ [63, 7], [112, 14], [None, 21] ]),
            (2, [ [135, 10], [None, 20] ]),
            (1, [ [250, 3] ]),
        ]

        self.verify_maxDataPoints(data, tests)

        # advance time window 4 seconds
        data = [
            TimeSeries('test', 5, 25, 1, [5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24], consolidate='sum', xFilesFactor=1)
        ]

        tests = [
            (21, [ [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22], [23,  23], [24,  24] ]),
            (20, [ [5,  5], [6,  6], [7,  7], [8,  8], [9,  9], [10, 10], [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22], [23,  23], [24,  24] ]),
            (19, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (18, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (17, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (16, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (15, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (14, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (13, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (12, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (11, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (10, [ [11, 6], [15, 8], [19, 10], [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24] ]),
            (9, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21], [None, 24] ]),
            (8, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21], [None, 24] ]),
            (7, [ [18, 6], [27, 9], [36, 12], [45, 15], [54, 18], [63, 21], [None, 24] ]),
            (6, [ [34, 8], [50, 12], [66, 16], [82, 20], [None, 24] ]),
            (5, [ [34, 8], [50, 12], [66, 16], [82, 20], [None, 24] ]),
            (4, [ [55, 10], [80, 15], [105, 20], [None, 25] ]),
            (3, [ [63, 7], [112, 14], [None, 21] ]),
            (2, [ [135, 10], [None, 20] ]),
            (1, [ [290, 5] ]),
        ]

        self.verify_maxDataPoints(data, tests)

        # advance time window 10 seconds
        data = [
            TimeSeries('test', 11, 31, 1, [11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30], consolidate='sum', xFilesFactor=1)
        ]

        tests = [
            (21, [ [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22], [23,  23], [24,  24], [25, 25], [26, 26], [27, 27], [28, 28], [29, 29], [30, 30] ]),
            (20, [ [11, 11], [12, 12], [13, 13], [14, 14], [15, 15], [16, 16], [17, 17], [18, 18], [19, 19], [20, 20], [21,  21], [22,  22], [23,  23], [24,  24], [25, 25], [26, 26], [27, 27], [28, 28], [29, 29], [30, 30] ]),
            (19, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (18, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (17, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (16, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (15, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (14, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (13, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (12, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (11, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (10, [ [23, 12], [27, 14], [31, 16], [35, 18], [39, 20], [43, 22], [47, 24], [51, 26], [55, 28], [59, 30] ]),
            (9, [ [36, 12], [45, 15], [54, 18], [63, 21], [72, 24], [81, 27], [None, 30] ]),
            (8, [ [36, 12], [45, 15], [54, 18], [63, 21], [72, 24], [81, 27], [None, 30] ]),
            (7, [ [36, 12], [45, 15], [54, 18], [63, 21], [72, 24], [81, 27], [None, 30] ]),
            (6, [ [50, 12], [66, 16], [82, 20], [98, 24], [114, 28] ]),
            (5, [ [50, 12], [66, 16], [82, 20], [98, 24], [114, 28] ]),
            (4, [ [80, 15], [105, 20], [130, 25], [None, 30] ]),
            (3, [ [112, 14], [161, 21], [None, 28] ]),
            (2, [ [235, 20], [None, 30] ]),
            (1, [ [410, 11] ]),
        ]

        self.verify_maxDataPoints(data, tests)


    def test_hash_request(self):
        # Requests with the same parameters should hash to the same values,
        # regardless of HTTP method.
        target_qd = QueryDict('&target=randomWalk(%27random%20walk%27)'
                       '&target=randomWalk(%27random%20walk2%27)'
                       '&target=randomWalk(%27random%20walk3%27)')
        empty_qd = QueryDict('')
        post_request = HttpRequest()
        post_request.POST = target_qd.copy()
        post_request.GET = empty_qd.copy()
        get_request = HttpRequest()
        get_request.GET = target_qd.copy()
        get_request.POST = empty_qd.copy()

        self.assertEqual(hashRequest(get_request), hashRequest(post_request))

        # Check that POST parameters are included in cache key calculations
        post_request_with_params = HttpRequest()
        post_request_with_params.GET = empty_qd.copy()
        post_request_with_params.POST = target_qd.copy()
        empty_post_request = HttpRequest()
        empty_post_request.GET = empty_qd.copy()
        empty_post_request.POST = empty_qd.copy()

        self.assertNotEqual(hashRequest(post_request_with_params),
                            hashRequest(empty_post_request))

        # Check that changing the order of the parameters has no impact on the
        # cache key
        request_params = HttpRequest()
        request_qd = QueryDict('&foo=1&bar=2')
        request_params.GET = request_qd.copy()
        request_params.POST = empty_qd.copy()

        reverse_request_params = HttpRequest()
        reverse_request_qd = QueryDict('&bar=2&foo=1')
        reverse_request_params.GET = reverse_request_qd.copy()
        reverse_request_params.POST = empty_qd.copy()

        self.assertEqual(hashRequest(request_params),
                        hashRequest(reverse_request_params))

    def test_hash_data(self):
        targets = ['foo=1', 'bar=2']
        start_time = datetime.fromtimestamp(0)
        end_time = datetime.fromtimestamp(1000)
        xFilesFactor = 1
        self.assertEqual(hashData(targets, start_time, end_time, xFilesFactor), '1b3f369c2473cd151fd450d953f41d2a')
        self.assertEqual(hashData(reversed(targets), start_time, end_time, xFilesFactor), '1b3f369c2473cd151fd450d953f41d2a')

    def test_correct_timezone(self):
        url = reverse('render')
        response = self.client.get(url, {
                 'target': 'constantLine(12)',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
                 # tz is UTC
        })
        data = json.loads(response.content)[0]['datapoints']
        # all the from/until/tz combinations lead to the same window
        expected = [[12, 1393398060], [12, 1393399860], [12, 1393401660]]
        self.assertEqual(data, expected)

        response = self.client.get(url, {
                 'target': 'constantLine(12)',
                 'format': 'json',
                 'from': '08:01_20140226',
                 'until': '09:01_20140226',
                 'tz': 'Europe/Berlin',
        })
        data = json.loads(response.content)[0]['datapoints']
        # all the from/until/tz combinations lead to the same window
        expected = [[12, 1393398060], [12, 1393399860], [12, 1393401660]]
        self.assertEqual(data, expected)

    def test_template_numeric_variables(self):
        url = reverse('render')
        response = self.client.get(url, {
                 'target': 'template(constantLine($1),12)',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
        })
        data = json.loads(response.content)[0]['datapoints']
        # all the from/until/tz combinations lead to the same window
        expected = [[12, 1393398060], [12, 1393399860], [12, 1393401660]]
        self.assertEqual(data, expected)

        url = reverse('render')
        response = self.client.get(url, {
                 'target': 'template(constantLine($num),num=12)',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
        })
        data = json.loads(response.content)[0]['datapoints']
        # all the from/until/tz combinations lead to the same window
        expected = [[12, 1393398060], [12, 1393399860], [12, 1393401660]]
        self.assertEqual(data, expected)

        url = reverse('render')
        response = self.client.get(url, {
                 'target': 'template(constantLine($num))',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
                 'template[num]': '12',
        })
        data = json.loads(response.content)[0]['datapoints']
        # all the from/until/tz combinations lead to the same window
        expected = [[12, 1393398060], [12, 1393399860], [12, 1393401660]]
        self.assertEqual(data, expected)

    def test_template_string_variables(self):
        url = reverse('render')
        response = self.client.get(url, {
                 'target': 'template(time($1),"nameOfSeries")',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
        })
        data = json.loads(response.content)[0]
        self.assertEqual(data['target'], 'nameOfSeries')

        url = reverse('render')
        response = self.client.get(url, {
                 'target': 'template(time($name),name="nameOfSeries")',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
        })
        data = json.loads(response.content)[0]
        self.assertEqual(data['target'], 'nameOfSeries')

        url = reverse('render')
        response = self.client.get(url, {
                 'target': 'template(time($name))',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
                 'template[name]': 'nameOfSeries',
        })
        data = json.loads(response.content)[0]
        self.assertEqual(data['target'], 'nameOfSeries')

    def test_template_pathExpression_variables(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        url = reverse('render')
        response = self.client.get(url, {
                 'target': 'template(sumSeries(hosts.$1.cpu),"worker1")',
                 'format': 'json',
        })
        data = json.loads(response.content)[0]
        self.assertEqual(data['target'], 'sumSeries(hosts.worker1.cpu)')

        response = self.client.get(url, {
                 'target': 'template(sumSeries(hosts.$1.cpu),"worker1")',
                 'format': 'json',
                 'template[1]': 'worker*'
        })
        data = json.loads(response.content)[0]
        self.assertEqual(data['target'], 'sumSeries(hosts.worker*.cpu)')

        response = self.client.get(url, {
                 'target': 'template(sumSeries(hosts.$hostname.cpu))',
                 'format': 'json',
                 'template[hostname]': 'worker*'
        })
        data = json.loads(response.content)[0]
        self.assertEqual(data['target'], 'sumSeries(hosts.worker*.cpu)')

class ConsistentHashRingTest(TestCase):
    def test_chr_compute_ring_position(self):
        hosts = [("127.0.0.1", "cache0"),("127.0.0.1", "cache1"),("127.0.0.1", "cache2")]
        hashring = ConsistentHashRing(hosts)
        self.assertEqual(hashring.compute_ring_position('hosts.worker1.cpu'), 64833)
        self.assertEqual(hashring.compute_ring_position('hosts.worker2.cpu'), 38509)

    def test_chr_add_node(self):
        hosts = [("127.0.0.1", "cache0"),("127.0.0.1", "cache1"),("127.0.0.1", "cache2")]
        hashring = ConsistentHashRing(hosts)
        self.assertEqual(hashring.nodes, set(hosts))
        hashring.add_node(("127.0.0.1", "cache3"))
        hosts.insert(0,("127.0.0.1", "cache3"))
        self.assertEqual(hashring.nodes, set(hosts))
        self.assertEqual(hashring.nodes_len, 4)

    def test_chr_add_node_duplicate(self):
        hosts = [("127.0.0.1", "cache0"),("127.0.0.1", "cache1"),("127.0.0.1", "cache2")]
        hashring = ConsistentHashRing(hosts)
        self.assertEqual(hashring.nodes, set(hosts))
        hashring.add_node(("127.0.0.1", "cache2"))
        self.assertEqual(hashring.nodes, set(hosts))
        self.assertEqual(hashring.nodes_len, 3)

    def test_chr_remove_node(self):
        hosts = [("127.0.0.1", "cache0"),("127.0.0.1", "cache1"),("127.0.0.1", "cache2")]
        hashring = ConsistentHashRing(hosts)
        self.assertEqual(hashring.nodes, set(hosts))
        hashring.remove_node(("127.0.0.1", "cache2"))
        hosts.pop()
        self.assertEqual(hashring.nodes, set(hosts))
        self.assertEqual(hashring.nodes_len, 2)

    def test_chr_remove_node_missing(self):
        hosts = [("127.0.0.1", "cache0"),("127.0.0.1", "cache1"),("127.0.0.1", "cache2")]
        hashring = ConsistentHashRing(hosts)
        self.assertEqual(hashring.nodes, set(hosts))
        hashring.remove_node(("127.0.0.1", "cache4"))
        self.assertEqual(hashring.nodes, set(hosts))
        self.assertEqual(hashring.nodes_len, 3)

    def test_chr_get_node(self):
        hosts = [("127.0.0.1", "cache0"),("127.0.0.1", "cache1"),("127.0.0.1", "cache2")]
        hashring = ConsistentHashRing(hosts)
        node = hashring.get_node('hosts.worker1.cpu')
        self.assertEqual(node, ('127.0.0.1', 'cache2'))

    def test_chr_get_nodes(self):
        hosts = [("127.0.0.1", "cache0"),("127.0.0.1", "cache1"),("127.0.0.1", "cache2")]
        hashring = ConsistentHashRing(hosts)
        node = list(hashring.get_nodes('hosts.worker1.cpu'))
        self.assertEqual(node, [('127.0.0.1', 'cache2'), ('127.0.0.1', 'cache0'), ('127.0.0.1', 'cache1')])


class ConsistentHashRingTestFNV1A(TestCase):
    def test_chr_compute_ring_position_fnv1a(self):
        hosts = [("127.0.0.1", "ba603c36342304ed77953f84ac4d357b"),("127.0.0.2", "5dd63865534f84899c6e5594dba6749a"),
        ("127.0.0.3", "866a18b81f2dc4649517a1df13e26f28")]
        hashring = ConsistentHashRing(hosts, hash_type='fnv1a_ch')
        self.assertEqual(hashring.compute_ring_position('hosts.worker1.cpu'), 59573)
        self.assertEqual(hashring.compute_ring_position('hosts.worker1.load'), 57163)
        self.assertEqual(hashring.compute_ring_position('hosts.worker2.cpu'), 35749)
        self.assertEqual(hashring.compute_ring_position('hosts.worker2.network'), 43584)
        self.assertEqual(hashring.compute_ring_position('hosts.worker3.cpu'), 12600)
        self.assertEqual(hashring.compute_ring_position('hosts.worker3.irq'), 10052)
        self.assertEqual(hashring.compute_ring_position(u'a\xac\u1234\u20ac\U00008000'), 38658)

    def test_chr_get_node_fnv1a(self):
        hosts = [("127.0.0.1", "ba603c36342304ed77953f84ac4d357b"), ("127.0.0.2", "5dd63865534f84899c6e5594dba6749a"),
                 ("127.0.0.3", "866a18b81f2dc4649517a1df13e26f28")]
        hashring = ConsistentHashRing(hosts, hash_type='fnv1a_ch')
        self.assertEqual(hashring.get_node('hosts.worker1.cpu'),
                         ('127.0.0.1', 'ba603c36342304ed77953f84ac4d357b'))
        self.assertEqual(hashring.get_node('hosts.worker2.cpu'),
                         ('127.0.0.3', '866a18b81f2dc4649517a1df13e26f28'))
        self.assertEqual(hashring.get_node(
                        'stats.checkout.cluster.padamski-wro.api.v1.payment-initialize.count'),
                        ('127.0.0.3', '866a18b81f2dc4649517a1df13e26f28'))
