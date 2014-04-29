import json
import os
import time
import logging

import whisper

from graphite import settings
from graphite import query
from unittest import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())


class QueryTest(TestCase):
    db = os.path.join(settings.WHISPER_DIR, 'test.wsp')
    _test_data = [0.5, 0.4, 0.6]

    def wipe_whisper(self):
        try:
            os.remove(self.db)
        except OSError:
            pass

    def create_db(self):
        whisper.create(self.db, [(1, 60)])

        ts = int(time.time())
        for i, value in enumerate(reversed(self._test_data)):
            whisper.update(self.db, value, ts - i)
        return ts


    def test_query(self):
        self.addCleanup(self.wipe_whisper)
        self.create_db()

        data = query.query({'target': 'test'})
        end = data[0]#[-4:]
        match = False
        # We iterate through all values and check
        # _test_data against 3 consecutive values
        # because sometimes whisper adds None
        # value(s) to the end (depending on time)
        for i, value in enumerate(end):
            if value == self._test_data[0]:
                self.assertEqual(end[i:i+3], self._test_data)
                match = True
                break
        self.assertTrue(match)
