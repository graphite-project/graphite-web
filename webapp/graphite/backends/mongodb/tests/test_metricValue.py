#!/usr/bin/env python2.6
###############################################################################

import sys
import os
import unittest
import random

###############################################################################

DCM_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
sys.path.insert(0, DCM_ROOT)

from metricValue import *

###############################################################################


class MockOptionParser(object):
    def __init__(self, metricname=None):
        self.metricname = metricname

    def add_option(self, *args, **kwargs):
        pass
    def parse_args(self, *args, **kwargs):
        class Useless(object):
            def __init__(self):
                pass
        x = Useless()
        x.metricname = self.metricname
        return (x, x)

###############################################################################


class MockCollection(object):
    def __init__(self):
        self.updateCalled   = False
        self.updateDict1    = None
        self.updateDict2    = None
        self.updateKwargs   = None
        
    def update(self, dict1, dict2, **kwargs):
        self.updateCalled   = True
        self.updateDict1    = dict1
        self.updateDict2    = dict2
        self.updateKwargs   = kwargs        


###############################################################################


class TestMetricValue(unittest.TestCase):

    dbname          = "unittest_metricvalue"
    mongo_server    = 'graphdb301p.dev.ch3.s.com'  # DO NOT RUN AGAINST PRODUCTION SERVER!  WILL DELETE DATA!
    mongo_port      = 27017

    def writeLog(self, outstring):
        print outstring

    def getOptionParser(self):
        return self.mockOptionParserInstance

    def doNothing(self, **kwargs):
        pass

    def test_trivial(self):
        return True

    def test_001(self):
        mv = MetricValue(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname, simpleConn=True)
        mv.closeConnection()
        return True

    def test_insertNewDoc(self):
        mv = MetricValue(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname, simpleConn=True)
        metricname = 'a.b.c.d.%s' % (int(random.random() * 10000))
        metricValue = 100 * random.random()
        now = time.time()
        mtdoc1 = mv.db.metricCounters.insert({'name': "nextmetrictypeid", 'value': 1000})
        assert mtdoc1, "must create metricCounters record or test will fail."
        mtid = mv.insertNewDoc(metricname, [[metricValue, now]])
        time.sleep(2) # query after save sometimes fails because it can read from replicas.
        print "saved metric, name=%s, val=%s, now=%s, mtid=%s" % (metricname, metricValue, now, mtid)
        doc = mv.getLatestDocByMetricName(metricname)
        print "got latest doc: %s" % (doc)
        assert doc['metricname'     ]  == metricname, "metricname incorrect, got %s instead of %s." % (doc['metricname'], metricname)
        assert (abs(int(doc['startdatetime']) - int(now)) < 2), "startdatetime incorrect, got %s instead of %s." % (int(doc['startdatetime']), int(now))
        assert len(doc['vals'  ]) == 1, "should have 1 vals elem, instead have %s." % (doc['vals'])
        assert doc.get('metrictypeid', None), "Should have metrictypeid."
        offsets    = len(doc['offsets'])
        measurementsPerDoc = mv.getMeasurementsPerDoc()
        shouldhave = (measurementsPerDoc - 1)
        assert  offsets == shouldhave, "should have %d offset data points, instead have %d."  % (shouldhave, offsets)
        mv.closeConnection()
        return True

    def clearTestDatabase(self):
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        assert self.dbname != 'megamaid', "CANNOT TEST ON MEGAMAID, would remove real data."

        assert (mt.db.metricType.count() < 60), "ERROR!  ERROR!  TRYING TO DELETE LOTS OF RECORDS FROM METRICTYPE! count=%s" % (mt.db.metricType.count())
        mt.db.metricType.remove({})
        assert (mt.db.metricType.count() == 0), "ERROR!  ERROR!  Failed to delete metrictype records, count=%s" % (mt.db.metricType.count())

        assert (mt.db.metricValue.count() < 60), "ERROR!  ERROR!  TRYING TO DELETE LOTS OF RECORDS FROM METRICTYPE! count=%s" % (mt.db.metricValue.count())
        mt.db.metricValue.remove({})
        assert (mt.db.metricValue.count() == 0), "ERROR!  ERROR!  Failed to delete metrictype records, count=%s" % (mt.db.metricValue.count())

    def test_insertMultipleGeneratesMultiple(self):
        self.logger = MockLogger()
        self.logger.warning("starting test_insertMultipleGeneratesMultiple.")
        mv = MetricValue(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname, simpleConn=True)
        self.logger.warning("starting test_insertMultipleGeneratesMultiple.  Have mv.")
        self.clearTestDatabase()
        self.logger.warning("test_insertMultipleGeneratesMultiple():  cleared test db.")
        mtdoc1 = mv.db.metricCounters.insert({'name': "nextmetrictypeid", 'value': 1000})
        mv._measurementsPerDoc = 3
        namesarray = []
        for i in range(0, 9):
            metricname = 'a.b.c.%s.%d' % (int(random.random() * 10000), i)
            print "inserting metricname into mpd (measurements per document) cache: %s." % (metricname)
            namesarray.append(metricname)

        self.logger.warning("test_insertMultipleGeneratesMultiple():  mpdCache created.")
        
        valsDict = {}
        mockTime = int(time.time())
        for i in range(0, len(namesarray)):
            for j in range(0, i):
                metricValue     = 100 * random.random()
                mockTime        += 1
                metricName      = namesarray[i]
                mValsArray      = valsDict.get(metricName, [])
                mValsArray.append((metricValue, mockTime))
                valsDict[metricName] = mValsArray
                retval = mv.addMeasurement(metricName, metricValue, mockTime)
                print "for metricname '%s', inserted rec w/ val=%s, time=%s." % (metricname, metricValue, mockTime)
        print "valsDict = %s" % (pformat(valsDict))
        
        allDocs = {}
        for mn in namesarray:
            dlist = mv.getByName(mn)
            print "test_insertMultiple(): for name %s, have docs: %s\n" % (mn, dlist)
            allDocs[mn] = dlist

        print "docs: %s" % (pformat(allDocs))
        #assert False, "intentional break."
        #allDocs.extend(dlist)

        assert (len(allDocs.keys()) == 9), "should have 8 keys, one for each metric name: %s, instead have \n%s." % (pformat(namesarray), pformat(allDocs))
        assert len(allDocs[namesarray[0]]) == 0, "Should have 0 documents for metricname 0 (%s).  alldocs=%s" % (namesarray[0], pformat(allDocs[namesarray[0]]))
        assert len(allDocs[namesarray[1]]) == 1, "Should have 1 document  for metricname 1 (%s).  alldocs=%s" % (namesarray[1], pformat(allDocs[namesarray[1]]))
        assert len(allDocs[namesarray[2]]) == 1, "Should have 1 document  for metricname 2 (%s).  alldocs=%s" % (namesarray[2], pformat(allDocs[namesarray[2]]))
        assert len(allDocs[namesarray[3]]) == 1, "Should have 2 documents for metricname 3 (%s).  alldocs=%s" % (namesarray[3], pformat(allDocs[namesarray[3]]))
        assert len(allDocs[namesarray[4]]) == 1, "Should have 2 documents for metricname 4 (%s).  alldocs=%s" % (namesarray[4], pformat(allDocs[namesarray[4]]))
        assert len(allDocs[namesarray[5]]) == 1, "Should have 2 documents for metricname 5 (%s).  alldocs=%s" % (namesarray[5], pformat(allDocs[namesarray[5]]))
        assert len(allDocs[namesarray[6]]) == 1, "Should have 2 documents for metricname 6 (%s).  alldocs=%s" % (namesarray[6], pformat(allDocs[namesarray[6]]))
        assert len(allDocs[namesarray[7]]) == 1, "Should have 3 documents for metricname 7 (%s).  alldocs=%s" % (namesarray[7], pformat(allDocs[namesarray[7]]))
        assert len(allDocs[namesarray[8]]) == 1, "Should have 3 documents for metricname 8 (%s).  alldocs=%s" % (namesarray[8], pformat(allDocs[namesarray[8]]))

        ######### same thing, only count the actual number of items in the data array:
        
        assert (len(allDocs[namesarray[1]][0]['vals']) == 1), "Should have 1 record point  in doc 1-0.  na=%s, alldocs=%s" % (allDocs[namesarray[1]], pformat(allDocs[namesarray[1]]))
        assert (len(allDocs[namesarray[2]][0]['vals']) == 2), "Should have 1 record point  in doc 2-0.  na=%s, alldocs=%s" % (allDocs[namesarray[2]], pformat(allDocs[namesarray[2]]))
        assert (len(allDocs[namesarray[3]][0]['vals']) == 3), "Should have 1 record point  in doc 3-0.  na=%s, alldocs=%s" % (allDocs[namesarray[3]], pformat(allDocs[namesarray[3]]))
        assert (len(allDocs[namesarray[4]][0]['vals']) == 4), "Should have 1 record points in doc 4-0.  na=%s, alldocs=%s" % (allDocs[namesarray[4]], pformat(allDocs[namesarray[4]]))
        assert (len(allDocs[namesarray[5]][0]['vals']) == 5), "Should have 2 record points in doc 5-0.  na=%s, alldocs=%s" % (allDocs[namesarray[5]], pformat(allDocs[namesarray[5]]))
        assert (len(allDocs[namesarray[6]][0]['vals']) == 6), "Should have 3 record points in doc 6-0.  na=%s, alldocs=%s" % (allDocs[namesarray[6]], pformat(allDocs[namesarray[6]]))
        assert (len(allDocs[namesarray[7]][0]['vals']) == 7), "Should have 3 record points in doc 7-1.  na=%s, alldocs=%s" % (allDocs[namesarray[7]], pformat(allDocs[namesarray[7]]))
        assert (len(allDocs[namesarray[8]][0]['vals']) == 8), "Should have 3 record points in doc 8-2.  na=%s, alldocs=%s" % (allDocs[namesarray[8]], pformat(allDocs[namesarray[8]]))

        # same thing for offset data:        
        assert (len(allDocs[namesarray[1]][0]['offsets']) == 2), "Should have 1 record point  in doc 1-0.  na=%s, alldocs=%s" % (allDocs[namesarray[1]][0], pformat(allDocs))
        assert (len(allDocs[namesarray[2]][0]['offsets']) == 1), "Should have 1 record point  in doc 2-0.  na=%s, alldocs=%s" % (allDocs[namesarray[2]][0], pformat(allDocs))
        assert (len(allDocs[namesarray[3]][0]['offsets']) == 0), "Should have 1 record point  in doc 3-0.  na=%s, alldocs=%s" % (allDocs[namesarray[3]][0], pformat(allDocs))
        assert (len(allDocs[namesarray[4]][0]['offsets']) == 0), "Should have 3 record points in doc 4-1.  na=%s, alldocs=%s" % (allDocs[namesarray[4]][1], pformat(allDocs))
        assert (len(allDocs[namesarray[5]][0]['offsets']) == 0), "Should have 2 record points in doc 5-0.  na=%s, alldocs=%s" % (allDocs[namesarray[5]][0], pformat(allDocs))
        assert (len(allDocs[namesarray[6]][0]['offsets']) == 0), "Should have 3 record points in doc 6-1.  na=%s, alldocs=%s" % (allDocs[namesarray[6]][1], pformat(allDocs))
        assert (len(allDocs[namesarray[7]][0]['offsets']) == 0), "Should have 3 record points in doc 7-2.  na=%s, alldocs=%s" % (allDocs[namesarray[7]][2], pformat(allDocs))
        assert (len(allDocs[namesarray[8]][0]['offsets']) == 0), "Should have 3 record points in doc 8-0.  na=%s, alldocs=%s" % (allDocs[namesarray[8]][0], pformat(allDocs))
        

    def test_closeConnection(self):
        from mods.metricValue import MetricValue as MV
        MV.__init__ = self.doNothing
        mv = MV(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname, simpleConn=True)
        mv.logger = MockLogger()
        
        class MyTestConn(object):
            def __init__(self):
                self.closeCalled = False
            def close(self):
                self.closeCalled = True
 
        mv.connection = MyTestConn()
        mv.closeConnection()
        assert mv.connection.closeCalled == True, "metricValue.closeConnection() should have invoked close() on _connection, didn't."
        

###############################################################################

if __name__ == '__main__': # pragma: no cover
    logging.basicConfig( stream=sys.stderr )
    logging.getLogger( "SomeTest.testSomething" ).setLevel( logging.DEBUG )
    unittest.main()

###############################################################################
###############################################################################
###############################################################################
