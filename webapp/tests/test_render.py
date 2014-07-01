from datetime import datetime
import json
import os
import time

from graphite.render.hashing import hashRequest, hashData
import whisper

from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import HttpRequest, QueryDict
from django.test import TestCase


class RenderTest(TestCase):
    db = os.path.join(settings.WHISPER_DIR, 'test.wsp')

    def wipe_whisper(self):
        try:
            os.remove(self.db)
        except OSError:
            pass

    def test_render_view(self):
        url = reverse('graphite.render.views.renderView')

        response = self.client.get(url, {'target': 'test', 'format': 'json'})
        self.assertEqual(json.loads(response.content), [])

        response = self.client.get(url, {'target': 'test'})
        self.assertEqual(response['Content-Type'], 'image/png')

        self.addCleanup(self.wipe_whisper)
        whisper.create(self.db, [(1, 60)])

        ts = int(time.time())
        whisper.update(self.db, 0.5, ts - 2)
        whisper.update(self.db, 0.4, ts - 1)
        whisper.update(self.db, 0.6, ts)

        response = self.client.get(url, {'target': 'test', 'format': 'json'})
        data = json.loads(response.content)
        end = data[0]['datapoints'][-4:]
        self.assertEqual(
            end, [[None, ts - 3], [0.5, ts - 2], [0.4, ts - 1], [0.6, ts]])

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

