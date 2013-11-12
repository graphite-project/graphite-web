import unittest
import tempfile
import os.path
import glob
import re

from django.conf import settings
# This line has to occur before importing logger and datalib.
temp_dir = tempfile.mkdtemp(prefix='graphite-log-test')
settings.configure(
    LOG_DIR=temp_dir,
    LOG_CACHE_PERFORMANCE=False,
    LOG_RENDERING_PERFORMANCE=False,
    LOG_METRIC_ACCESS=False,
    LOG_ROTATE=True,
    )

from graphite.logger import log


class TestLogger(unittest.TestCase):

    def test_init(self):
        """ Tesing initialization. """
        for logger in ['infoLogger', 'exceptionLogger', 'cacheLogger',
                       'renderingLogger', 'metricAccessLogger']:
            self.assertTrue(hasattr(log, logger))

    def test_config_logger(self):
        pass

    def test_info_log(self):
        """ Testing writing to a log file. """
        message = 'Test Info Message'
        log.info(message)
        lines = [l for l in open(os.path.join(temp_dir, 'info.log'))]
        self.assertEqual(message, lines[0].split('::')[1].strip())

    def test_metric_log(self):
        """ Test writing to a not configured logger. """
        message = 'Test Info Message'
        log.metric_access(message)
        file_name = os.path.join(temp_dir, 'metricaccess.log')
        self.assertFalse(os.path.exists(file_name))

    def test_rotate(self):
        """ Force rotation of the log file. """
        handler = log.infoLogger.handlers[0]
        handler.doRollover()
        files = glob.glob(os.path.join(temp_dir, 'info.log.*'))
        matches = [re.match('info.log.[0-9]{4}-[0-9]{2}-[0-9]{2}',
                   os.path.basename(f)) for f in files]
        self.assertTrue(any(matches))
