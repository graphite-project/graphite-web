import os
import shutil
import unittest

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'data'))
_STORAGE_DIR = os.path.join(DATA_DIR, 'storage')
os.environ.setdefault('GRAPHITE_STORAGE_DIR', _STORAGE_DIR)


class TestCase(unittest.TestCase):
    def _cleanup(self):
        shutil.rmtree(DATA_DIR, ignore_errors=True)

    def setUp(self):
        self._cleanup()

    def tearDown(self):
        self._cleanup()
