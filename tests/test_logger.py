import logging
from graphite.logger import log

from __setup import TestCase

class TestLogger(TestCase):

    def test_init(self):
        """ Testing initialization. """
        for logger in ['infoLogger', 'exceptionLogger', 'cacheLogger']:
            self.assertIsInstance(getattr(log, logger), logging.Logger)

