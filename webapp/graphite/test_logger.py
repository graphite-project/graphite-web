import unittest
import tempfile

from django.conf import settings
# This line has to occur before importing functions and datalib.
temp_dir = tempfile.mkdtemp(prefix='graphite-log-test')
settings.configure(
    LOG_DIR=temp_dir,
    LOG_CACHE_PERFORMANCE='',
    LOG_RENDERING_PERFORMANCE='',
    LOG_METRIC_ACCESS='',
    LOG_ROTATE=True,
    )

from graphite.logger import log


class TestLogger(unittest.TestCase):

    def test_init(self):
        for logger in ['infoLogger', 'exceptionLogger', 'cacheLogger',
                       'renderingLogger', 'metricAccessLogger']:
            self.assertTrue(hasattr(log, logger))

    def test_config_logger(self):
        pass

