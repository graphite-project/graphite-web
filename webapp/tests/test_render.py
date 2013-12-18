import json
import os
import time
import whisper

from django.conf import settings
from django.core.urlresolvers import reverse
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
