import random
import time
import unittest
import os.path
import glob
import re

from logging import FileHandler
from django.conf import settings
from graphite.logger import log, GraphiteLogger
from django.test import TestCase

class MockPythonLogger(object):
    
    def __init__(self):
        self.methodsCalled = {}
        pass

    def info(self,      inputText):     self.methodsCalled['info'           ] = inputText
    def exception(self, inputText):     self.methodsCalled['exception'      ] = inputText
    def warn(self,      inputText):     self.methodsCalled['warn'           ] = inputText 
    def warning(self,   inputText):     self.methodsCalled['warning'        ] = inputText 
    def debug(self,     inputText):     self.methodsCalled['debug'          ] = inputText 
    def error(self,     inputText):     self.methodsCalled['error'          ] = inputText 
    def log(self, level, inputText):    self.methodsCalled['log'            ] = inputText
 

class GraphiteLoggerTest(TestCase):

    def test_init(self):
        """ Tesing initialization. """
        for logger in ['infoLogger', 'exceptionLogger', 'cacheLogger',
                       'renderingLogger', 'metricAccessLogger']:
            self.assertTrue(hasattr(log, logger))

    def test_config_logger(self):
        pass

    def test_instantiate(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
    
    def test_info_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.infoLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.info(outText)
        saved = g.infoLogger.methodsCalled.get('info')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)
        
    def test_exception_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.exceptionLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.exception(outText)
        saved = g.exceptionLogger.methodsCalled.get('exception')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)

    def test_cache_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.cacheLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.cache(outText)
        saved = g.cacheLogger.methodsCalled.get('log')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)

    def test_rendering_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.renderingLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.rendering(outText)
        saved = g.renderingLogger.methodsCalled.get('log')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)

    def test_metric_access_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.metricAccessLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.metric_access(outText)
        saved = g.metricAccessLogger.methodsCalled.get('log')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)

    def test_warn_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.infoLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.warn(outText)
        saved = g.infoLogger.methodsCalled.get('warn')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)

    def test_warning_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.infoLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.warning(outText)
        saved = g.infoLogger.methodsCalled.get('warning')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)

    def test_debug_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.infoLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.debug(outText)
        saved = g.infoLogger.methodsCalled.get('debug')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)

    def test_error_001(self):
        g = GraphiteLogger()
        assert g, "Could not instantiate logger."
        g.infoLogger = MockPythonLogger()
        outText = "test text here 0001 %s" % (random.random())
        retval = g.error(outText)
        saved = g.infoLogger.methodsCalled.get('error')
        assert saved == outText, "Should outText = %s, instead: %s" % (outText, saved)


    def test_info_log(self):
        """ Testing writing to a log file. """
        message = 'Test Info Message'
        log.info(message)
        lines = [l for l in open(os.path.join(settings.LOG_DIR,
                 'info.log')).readlines()]
        self.assertEqual(message, lines[-1].split('::')[1].strip())

    def test_metric_log(self):
        """ Test writing to a not configured logger. """
        message = 'Test Info Message'
        log.metric_access(message)
        file_name = os.path.join(settings.LOG_DIR, 'metricaccess.log')
        self.assertFalse(os.path.exists(file_name))

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
        old_val = settings.LOG_ROTATE
        settings.LOG_ROTATE = False
        log = GraphiteLogger()
        self.assertTrue(isinstance(log.infoLogger.handlers[0], FileHandler))
        self.assertTrue(isinstance(log.exceptionLogger.handlers[0], FileHandler))
        settings.LOG_ROTATE = old_val
