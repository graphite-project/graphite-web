#!/usr/bin/env python2.6
###############################################################################

import sys
import os
import unittest
import time

DCM_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
sys.path.insert(0, DCM_ROOT)

from mongoMetricWriter import MongoMetricWriter

###############################################################################

class MockQueue(object):
    
    def __init__(self):
        self.q = []
    
    def get(self):
        if not self.q:
            return None
        obj = self.q.pop()
        return obj

    def put(self, obj):
        self.q.append(obj)
        
    @property
    def qsize(self):
        return len(self.q)

###############################################################################

class TestMongoMetricWriter(unittest.TestCase):

    def doNothing(self, *args, **kwargs):
        pass

    def test_trivial(self):
        return True

    def test_instantiate(self):
        myq = MockQueue()
        mw = MongoMetricWriter(queue=myq)
        assert mw, "should have valid MongoMetricWriter object."

    def removeTestData(self, dataDir):
        if not os.path.exists(dataDir):
            os.mkdir(dataDir)
        for f in os.listdir(dataDir):
            if f not in ['.', '..']:
                os.remove('%s/%s' % (dataDir, f))
        return

    def test_getCurrentStorage(self):
        myq = MockQueue()
        mw = MongoMetricWriter(queue=myq)
        dataDir = '/tmp/testMongoMetricWriter'
        mw.dataDir = dataDir
        self.removeTestData(dataDir)
        (bytes, files) = mw.getCurrentStorage()
        print "Before check  : Bytes: %s, files=%s" % (bytes, files)
        recs = []
        recs.append({'a':1, 'b':2, 'c': 3})
        recs.append({'d':1, 'e':2, 'f': 3})
        mw.saveExtraRecords(recs)
        (bytes, files) = mw.getCurrentStorage()
        print "After, storage: Bytes: %s, files=%s" % (bytes, files)
        assert bytes == 90, "bytes should be 84, instead is %s." % (bytes)
        assert len(files) == 1, "should have 1 file, instead: %s" % (files)

    def test_saveExtraRecords(self):
        myq = MockQueue()
        mw = MongoMetricWriter(queue=myq)
        dataDir = '/tmp/testMongoMetricWriter'
        mw.dataDir = dataDir
        self.removeTestData(dataDir)
        recs = []
        rec1 = {'a':1, 'b':2, 'c': 3}
        rec2 = {'d':1, 'e':2, 'f': 3}
        recs.append(rec1)
        recs.append(rec2)
        mw.saveExtraRecords(recs)
        mw.getQueueDataFromFile(2)        
        gotRecs = []
        for n in range(0, myq.qsize):
            print "retrieving elem %s" % (n)            
            try:
                gotRecs.append(myq.get())
            except:
                break
        assert len(gotRecs) == 2, "Should have 2 elements, don't: %s" % (gotRecs)
        assert rec1 in gotRecs, "Should have rec1, don't: %s" % (gotRecs)
        assert rec2 in gotRecs, "Should have rec2, don't: %s" % (gotRecs)
        return


###############################################################################


if __name__ == '__main__': # pragma: no cover
    logging.basicConfig( stream=sys.stderr )
    logging.getLogger( "SomeTest.testSomething" ).setLevel( logging.DEBUG )
    unittest.main()
    

###############################################################################
###############################################################################
###############################################################################
