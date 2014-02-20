import random
import time

from django.test import TestCase

from graphite.logger import GraphiteLogger
#from graphite.intervals import Interval, IntervalSet
#from graphite.node import LeafNode, BranchNode
#from graphite.storage import Store, get_finder

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
