import os

from __setup import TestCase

class QueryTest(TestCase):
    _test_data = [0.5, 0.4, 0.6]

    def setUp(self):
        import time
        super(QueryTest, self).setUp()
        import whisper
        from graphite import settings
        if not os.path.exists(settings.WHISPER_DIR):
            os.makedirs(settings.WHISPER_DIR)
        self.db = os.path.join(settings.WHISPER_DIR, 'test.wsp')
        whisper.create(self.db, [(1, 60)])

        ts = int(time.time())
        for i, value in enumerate(reversed(self._test_data)):
            whisper.update(self.db, value, ts - i)
        self.ts = ts


    def test_query(self):
        from graphite import query
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
