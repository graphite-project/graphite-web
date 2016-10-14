from datetime import datetime
import json
import os
import time
import logging
import shutil

from graphite.render.hashing import ConsistentHashRing, hashRequest, hashData
import whisper

from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import HttpRequest, QueryDict
from django.test import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())


class RenderTest(TestCase):
    db = os.path.join(settings.WHISPER_DIR, 'test.wsp')
    hostcpu = os.path.join(settings.WHISPER_DIR, 'hosts/hostname/cpu.wsp')

    def wipe_whisper(self):
        try:
            os.remove(self.db)
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

    def test_render_view(self):
        url = reverse('graphite.render.views.renderView')

        response = self.client.get(url, {'target': 'test', 'format': 'raw'})
        self.assertEqual(response.content, "")
        self.assertEqual(response['Content-Type'], 'text/plain')

        response = self.client.get(url, {'target': 'test', 'format': 'json'})
        self.assertEqual(json.loads(response.content), [])
        self.assertTrue(response.has_header('Expires'))
        self.assertTrue(response.has_header('Last-Modified'))
        self.assertTrue(response.has_header('Cache-Control'))

        response = self.client.get(url, {'target': 'test'})
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertTrue(response.has_header('Expires'))
        self.assertTrue(response.has_header('Last-Modified'))
        self.assertTrue(response.has_header('Cache-Control'))

        response = self.client.get(url, {'target': 'test', 'format': 'dygraph'})
        self.assertEqual(json.loads(response.content), {})
        self.assertTrue(response.has_header('Expires'))
        self.assertTrue(response.has_header('Last-Modified'))
        self.assertTrue(response.has_header('Cache-Control'))

        response = self.client.get(url, {'target': 'test', 'format': 'rickshaw'})
        self.assertEqual(json.loads(response.content), [])
        self.assertTrue(response.has_header('Expires'))
        self.assertTrue(response.has_header('Last-Modified'))
        self.assertTrue(response.has_header('Cache-Control'))

        self.addCleanup(self.wipe_whisper)
        whisper.create(self.db, [(1, 60)])

        ts = int(time.time())
        whisper.update(self.db, 0.1234567890123456789012, ts - 2)
        whisper.update(self.db, 0.4, ts - 1)
        whisper.update(self.db, 0.6, ts)

        response = self.client.get(url, {'target': 'test', 'format': 'raw'})
        raw_data = ("None,None,None,None,None,None,None,None,None,None,None,"
                    "None,None,None,None,None,None,None,None,None,None,None,"
                    "None,None,None,None,None,None,None,None,None,None,None,"
                    "None,None,None,None,None,None,None,None,None,None,None,"
                    "None,None,None,None,None,None,None,None,None,None,None,"
                    "None,None,0.12345678901234568,0.4,0.6")
        raw_response = "test,%d,%d,1|%s\n" % (ts-59, ts+1, raw_data)
        self.assertEqual(response.content, raw_response)

        response = self.client.get(url, {'target': 'test', 'format': 'json'})
        data = json.loads(response.content)
        end = data[0]['datapoints'][-4:]
        self.assertEqual(
            end, [[None, ts - 3], [0.12345678901234568, ts - 2], [0.4, ts - 1], [0.6, ts]])

        response = self.client.get(url, {'target': 'test', 'format': 'dygraph'})
        data = json.loads(response.content)
        end = data['data'][-4:]
        self.assertEqual(end,
            [[(ts - 3) * 1000, None],
            [(ts - 2) * 1000, 0.123456789012],
            [(ts - 1) * 1000, 0.4],
            [ts * 1000, 0.6]])

        response = self.client.get(url, {'target': 'test', 'format': 'rickshaw'})
        data = json.loads(response.content)
        end = data[0]['datapoints'][-4:]
        self.assertEqual(end,
            [{'x': ts - 3, 'y': None},
            {'x': ts - 2, 'y': 0.12345678901234568},
            {'x': ts - 1, 'y': 0.4},
            {'x': ts, 'y': 0.6}])

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
        self.assertEqual(hashData(targets, start_time, end_time),
                        hashData(reversed(targets), start_time, end_time))

    def test_correct_timezone(self):
        url = reverse('graphite.render.views.renderView')
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
        url = reverse('graphite.render.views.renderView')
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

        url = reverse('graphite.render.views.renderView')
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

        url = reverse('graphite.render.views.renderView')
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
        url = reverse('graphite.render.views.renderView')
        response = self.client.get(url, {
                 'target': 'template(time($1),"nameOfSeries")',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
        })
        data = json.loads(response.content)[0]
        self.assertEqual(data['target'], 'nameOfSeries')

        url = reverse('graphite.render.views.renderView')
        response = self.client.get(url, {
                 'target': 'template(time($name),name="nameOfSeries")',
                 'format': 'json',
                 'from': '07:01_20140226',
                 'until': '08:01_20140226',
        })
        data = json.loads(response.content)[0]
        self.assertEqual(data['target'], 'nameOfSeries')

        url = reverse('graphite.render.views.renderView')
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

        url = reverse('graphite.render.views.renderView')
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
        node = hashring.get_nodes('hosts.worker1.cpu')
        self.assertEqual(node, [('127.0.0.1', 'cache2'), ('127.0.0.1', 'cache0'), ('127.0.0.1', 'cache1')])


class ConsistentHashRingTestFNV1A(TestCase):
    def test_chr_compute_ring_position_fnv1a(self):
        hosts = [("127.0.0.1", "ba603c36342304ed77953f84ac4d357b"),("127.0.0.2", "5dd63865534f84899c6e5594dba6749a"),
        ("127.0.0.3", "866a18b81f2dc4649517a1df13e26f28")]
        hashring = ConsistentHashRing(hosts, hash_type='fnv1a_ch')
        self.assertEqual(hashring.compute_ring_position('hosts.worker1.cpu'), 59573)
        self.assertEqual(hashring.compute_ring_position('hosts.worker2.cpu'), 35749)

    def test_chr_get_node_fnv1a(self):
        hosts = [("127.0.0.1", "ba603c36342304ed77953f84ac4d357b"), ("127.0.0.2", "5dd63865534f84899c6e5594dba6749a"),
                 ("127.0.0.3", "866a18b81f2dc4649517a1df13e26f28")]
        hashring = ConsistentHashRing(hosts, hash_type='fnv1a_ch')
        self.assertEqual(hashring.get_node('hosts.worker1.cpu'),
                         ('127.0.0.1', 'ba603c36342304ed77953f84ac4d357b'))
        self.assertEqual(hashring.get_node('hosts.worker2.cpu'),
                         ('127.0.0.3', '866a18b81f2dc4649517a1df13e26f28'))
