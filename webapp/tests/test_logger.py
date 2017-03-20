import unittest
import os.path
import glob
import re

from logging import FileHandler

from django.conf import settings

from graphite.logger import log, GraphiteLogger
from graphite.worker_pool.pool import get_pool


class TestLogger(unittest.TestCase):

    def test_init(self):
        """ Tesing initialization. """
        for logger in ['infoLogger', 'exceptionLogger', 'cacheLogger',
                       'renderingLogger']:
            self.assertTrue(hasattr(log, logger))

    def test_config_logger(self):
        pass

    def test_info_log(self):
        """ Testing writing to a log file. """
        message = 'Test Info Message'
        log.info(message)
        lines = [l for l in open(os.path.join(settings.LOG_DIR,
                 'info.log')).readlines()]
        self.assertEqual(message, lines[-1].split('::')[1].strip())

    def test_rotate(self):
        """ Force rotation of the log file. """
        handler = log.infoLogger.handlers[0]
        handler.doRollover()
        files = glob.glob(os.path.join(settings.LOG_DIR, 'info.log.*'))
        matches = [re.match('info.log.[0-9]{4}-[0-9]{2}-[0-9]{2}',
                   os.path.basename(f)) for f in files]
        self.assertTrue(any(matches))

    def test_no_rotate(self):
        """ Check that deactivating log rotation creates plain FileHandlers.
        """
        old_val = settings.LOG_ROTATION
        settings.LOG_ROTATION = False
        log = GraphiteLogger()
        self.assertTrue(isinstance(log.infoLogger.handlers[0], FileHandler))
        self.assertTrue(isinstance(log.exceptionLogger.handlers[0], FileHandler))
        settings.LOG_ROTATION = old_val

    def tearDown(self):
        get_pool().close()
