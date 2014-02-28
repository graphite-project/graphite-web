import json
import os
import time
import logging

import whisper

from django.conf import settings
from django.core.urlresolvers import reverse
from django.test import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())


class RenderTest(TestCase):
    db = os.path.join(settings.WHISPER_DIR, 'test.wsp')

    def wipe_whisper(self):
        try:
            os.remove(self.db)
        except OSError:
            pass

    def assertEqual(self, actual, shouldBe, msg=None):
        out = "Actual: %s, should be: %s; msg: %s" % (actual, shouldBe, msg)
        assert actual == shouldBe, out

    def test_render_view(self):
        url = reverse('graphite.render.views.renderView')

        response = self.client.get(url, {'target': 'test', 'format': 'json'})
        self.assertEqual(json.loads(response.content), [])

        response = self.client.get(url, {'target': 'test'})
        self.assertEqual(response['Content-Type'], 'image/png')

        self.addCleanup(self.wipe_whisper)
        whisper.create(self.db, [(1, 60)])

        saveTs = int(time.time())
        whisper.update(self.db, 0.5, saveTs - 2)
        whisper.update(self.db, 0.4, saveTs - 1)
        whisper.update(self.db, 0.6, saveTs - 0)

        # Note: If saving to whisper takes over 1 second, data is not 
        # at the end of the returned-data array.  Therefore, assemble data
        # for verification.

        response = self.client.get(url, {'target': 'test', 'format': 'json'})
        data = json.loads(response.content)
        dd = {}
        lastTs = 0
        populated = [ saveTs , saveTs-1, saveTs-2 ]
        for val, ts in data[0]['datapoints']:
            #print "val: %s, ts: %s" % (val, ts)
            dd[ts] = val
            assert ts > lastTs, "timestamps should increase."
            lastTs = ts
            if ts not in populated:
                assert val is None
        msg = "Orig saveTs: %s.  Data at time %s, offset %d"
        self.assertEqual(dd[saveTs - 2], 0.5, msg % (saveTs, saveTs-2, 2)) 
        self.assertEqual(dd[saveTs - 1], 0.4, msg % (saveTs, saveTs-1, 1))
        self.assertEqual(dd[saveTs - 0], 0.6, msg % (saveTs, saveTs-0, 0))
        return True

