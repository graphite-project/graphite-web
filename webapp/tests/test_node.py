import time
import inspect
from pprint import pformat

from django.test import TestCase
from graphite.logger import log
from graphite.node import LeafNode, BranchNode
from graphite.intervals import Interval, IntervalSet

class MockLogger(object):
    def info(self, instring):
        print instring

# duck punch so we can see tracebacks:
myMockLogger = MockLogger()
log.info      = myMockLogger.info
log.exception = myMockLogger.info 

class MockReader(object):
    
    def __init__(self):
        self.getIntervalsCalled = False
        self.testNumber = 0
        self.fetchCalled = False
    
    def get_intervals(self, startTime=None, endTime=None):
        # print "get intervals being called during test number %s"  % (pformat(inspect.stack()[2][3]))
        self.startTime = startTime
        self.endTime   = endTime
        self.getIntervalsCalled = True
        i = Interval(0, time.time())
        return IntervalSet([i])
    
    def fetch(self, startTime=None, endTime=None):
        self.startTime = startTime
        self.endTime   = endTime
        self.fetchCalled = True
        return

class NodeTest(TestCase):

    def test_instantiate_branch(self):
        n = BranchNode("path")
        assert n, "Could not instantiate BranchNode."
        assert n.is_leaf == False, "branch is not a leaf."
    
    def test_instantiate_leaf_normal(self):
        mr = MockReader()
        n = LeafNode("path", mr)
        assert n, "Could not instantiate LeafNode."
        assert n.is_leaf == True, "LeafNode isLeaf should be true."
        assert n.avoidIntervals is False, "avoid intervals should default false."
        assert n.reader == mr, "leaf should have reader object we passed in." 
        assert isinstance(n.intervals, IntervalSet), "intervals value should be of type IntervalSet, isn't: %s" % (type(n.intervals))
        assert isinstance([x for x in n.intervals][0], Interval), "intervals should be an Interval class instantiation: %s." % (type(firstInterval))
        assert mr.getIntervalsCalled, "Normal case - get_intervals should be called at instantiation."
        
    def test_instantiate_leaf_avoidIntervals(self):
        mr = MockReader()
        n = LeafNode("path", mr, avoidIntervals=True)
        assert n, "Could not instantiate LeafNode."
        assert n.is_leaf == True, "LeafNode isLeaf should be true."
        assert n.avoidIntervals is True, "avoidIntervals was set True, should be True."
        assert n.reader == mr, "leaf should have reader object we passed in." 
        assert isinstance(n.intervals, IntervalSet), "intervals value should be of type IntervalSet, isn't: %s" % (type(n.intervals))
        assert isinstance([x for x in n.intervals][0], Interval), "intervals should be an Interval class instantiation: %s." % (type(firstInterval))
        assert not mr.getIntervalsCalled, "Should NOT have called get_intervals when we explicitly say not to."
        
    def test_leaf_avoidIntervals_normal_fetch(self):
        mr = MockReader()
        n = LeafNode("path", mr)
        mr.getIntervalsCalled = False  # reset indicator to see if called in fetch()...
        n.fetch(float("-inf"), float("inf"))
        assert not mr.getIntervalsCalled, "should not call get_intervals, that should only be called at instantiation."
        assert mr.fetchCalled, "should have called fetch(), just did it."
        
    def test_leaf_avoidIntervals_true_fetch(self):
        mr = MockReader()
        n = LeafNode("path", mr, avoidIntervals=True)
        assert not mr.getIntervalsCalled, "should not have called get_intervals, that's what we're trying to avoid."
        st = time.time() + 100
        et = time.time() + 300
        n.fetch(st, et)
        assert mr.getIntervalsCalled, "Should have called get_intervals() during fetch."
        assert mr.fetchCalled, "should have called fetch(), just did it."

