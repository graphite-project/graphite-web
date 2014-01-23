#!/usr/bin/env python2.6
###############################################################################

import sys
import os
import unittest
import time
import copy
import random
import inspect

from dcm.mods.metricType import *

###############################################################################


class TestMetricType(unittest.TestCase):
    # for one test, run:
    # nosetests metricType:TestMetricType.test_simpleRetrieve

    dbname          = "unittest_metrictype"
    #mongo_server    = 'graphdb301p.dev.ch3.s.com'  # DO NOT RUN AGAINST PRODUCTION SERVER!  WILL DELETE DATA!
    #mongo_port      = 27017

    mongo_server    = 'graphdb301p.dev.ch3.s.com'
    mongo_port      = 27017

    def writeLog(self, outstring):
        print outstring

    def clearTestDatabase(self):
        try:
            cf = inspect.stack()[1][3]
        except:
            print traceback.format_exc()
            cf = None
        print "*" * 80
        print "clearTestDatabase() called by: %s" % (cf)
        
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        assert self.dbname != 'megamaid', "CANNOT TEST ON MEGAMAID, would remove real data."

        assert (mt.db.metricType.count() < 100), "ERROR TRYING TO DELETE LOTS OF RECORDS FROM METRICTYPE! count=%s" % (mt.db.metricType.count())
        mt.db.metricType.remove({})
        assert (mt.db.metricType.count() == 0), "ERROR Failed to delete metrictype records, count=%s" % (mt.db.metricType.count())

        assert (mt.db.metricValue.count() < 100), "ERROR TRYING TO DELETE LOTS OF RECORDS FROM METRICTYPE! count=%s" % (mt.db.metricValue.count())
        mt.db.metricValue.remove({})
        assert (mt.db.metricValue.count() == 0), "ERROR Failed to delete metrictype records, count=%s" % (mt.db.metricValue.count())
            
        mt.db.metricCounters.drop()
        # must always recreate metricCounters so have metrictypeids new each time, and on new databases, have them at all.
        mt.db.metricCounters.insert({'name': "nextmetrictypeid", 'value': 1000})
        mt.db.metricCounters.ensure_index('name', unique=True)
        mt.db.metricCounters.index_information()

    def test_simpleCreate(self):
        self.clearTestDatabase()
        mta = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = "a.b.c.d." + str(int(random.random() * 1000))
        print "test_simpleCreate(): testName=%s" % (testName)
        origMtRec = mta.getByName(testName)
        print "_" * 80
        print "test_simpleCreate(): did getByName, returned: %s" % (origMtRec)
        testResults = { 
            testName : { 'parentName' : 'a.b.c.d', 'childNames' : [            ] },
            'a.b.c.d': { 'parentName' : 'a.b.c',   'childNames' : [ testName   ] },
            'a.b.c'  : { 'parentName' : 'a.b',     'childNames' : [ 'a.b.c.d'  ] },
            'a.b'    : { 'parentName' : 'a',       'childNames' : [ 'a.b.c'    ] },
            'a'      : { 'parentName' : None,      'childNames' : [ 'a.b'      ] },
            }

        for mtdoc in mta.db.metricType.find():
            print "DOC: id=%10.10d, name=%10.10s, parent: %10.10s, children: %20.20s" % (mtdoc['metrictypeid'], mtdoc['metricname'], mtdoc['parent'], mtdoc['children'])

        for tname, tresult in testResults.items():
            print "testing name: %s" % (tname)
            doc = mta.db.metricType.find_one({'metricname' : tname })
            parentDoc = mta.db.metricType.find_one({'metricname' : tresult['parentName'] })
            if tresult['parentName']:
                assert parentDoc, "Must have found parent doc with name: %s, tname=%s, tresult=%s" % (tresult['parentName'], tname, tresult)
                assert doc['parent'] == parentDoc['metrictypeid']
                assert set(parentDoc['children']) == set([ doc['metrictypeid'] ])
            for childName in tresult['childNames']:
                childDoc = mta.db.metricType.find_one({'metricname' : childName })
                assert childDoc, "should have found child with metricname: %s" % (childDoc)
                assert childDoc['parent'] == doc['metrictypeid'], "children should have parent of self."
                

    def test_createWithSiblings(self):
        self.clearTestDatabase()
        mta = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testNameOne = "a.b.c.d." + str(int(random.random() * 1000))
        print "createWithSiblings(): testName=%s" % (testNameOne)
        origMtRec = mta.getByName(testNameOne)

        testNameTwo = "a.b.c.d." + str(int(random.random() * 1000))
        print "createWithSiblings(): testName=%s" % (testNameTwo)
        origMtRec = mta.getByName(testNameTwo)

        print "_" * 80
        print "createWithSiblings(): did getByName, returned: %s" % (origMtRec)

        testResults = { 
            testNameOne : { 'parentName' : 'a.b.c.d', 'childNames' : [                              ] },
            testNameTwo : { 'parentName' : 'a.b.c.d', 'childNames' : [                              ] },
            'a.b.c.d'   : { 'parentName' : 'a.b.c',   'childNames' : [ testNameOne, testNameTwo     ] },
            'a.b.c'     : { 'parentName' : 'a.b',     'childNames' : [ 'a.b.c.d'                    ] },
            'a.b'       : { 'parentName' : 'a',       'childNames' : [ 'a.b.c'                      ] },
            'a'         : { 'parentName' : None,      'childNames' : [ 'a.b'                        ] },
            }

        for mtdoc in mta.db.metricType.find():
            print "createWithSiblings DOC: id=%10.10d, name=%10.10s, parent: %10.10s, children: %40.40s" % (mtdoc['metrictypeid'], mtdoc['metricname'], mtdoc['parent'], mtdoc['children'])

        for tname, tresult in testResults.items():
            print "createWithSiblings() testing name: %s" % (tname)
            doc = mta.db.metricType.find_one({'metricname' : tname })
            parentDoc = mta.db.metricType.find_one({'metricname' : tresult['parentName'] })
            if tresult['parentName']:
                assert parentDoc, "Must have found parent doc with name: %s, tname=%s, tresult=%s" % (tresult['parentName'], tname, tresult)
                assert doc['parent'] == parentDoc['metrictypeid']
                assert doc['metrictypeid'] in set(parentDoc['children']), "should have orig in parent's child: parent's children: %s and docid %s" % (set(parentDoc['children']))
            for childName in tresult['childNames']:
                childDoc = mta.db.metricType.find_one({'metricname' : childName })
                assert childDoc, "should have found child with metricname: %s" % (childDoc)
                assert childDoc['parent'] == doc['metrictypeid'], "children should have parent of self."

    def test_simpleRetrieve(self):
        """
        Simple test.  Store something, return value should be document created.
        """
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = "a.b.c.d." + str(int(random.random() * 1000))
        
        res = mt.createMetricTypeDoc(testName)
        metrictypeid = res['metrictypeid']
        print "Metric type id created: %s" % (metrictypeid)
        print "cache dump: %s" % (pformat(mt._cache))
        assert int(metrictypeid), "metrictypeid should be numeric (convertable an integer)."
        assert (type(res) == type({})), "createMetric() should return a type dict."
        assert res['metricname'   ] == testName, "oustring should equal instring."
        doc = mt.getById(metrictypeid)
        assert doc and (testName == doc.get('metricname', None)), "Did lookup of the metricname given the ID again, got different value. orig=%s, new=%s" % (testName, doc)

    def test_saveWithEmptyMetricNameShouldFail(self):
        """
        Simple test.  Store something, return value should be document created.
        Then, retrieve it.  But, make sure it can't retrieve using db, must use cache.
        """
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = ""
        problem = False
        try:
            mt.createMetricTypeDoc(testName)
        except:
            problem = True
        assert problem, "should have had exception because testname is empty."


    def test_simpleRetrieveWithCache(self):
        """
        Simple test.  Store something, return value should be document created.
        Then, retrieve it.  But, make sure it can't retrieve using db, must use cache.
        """
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = "a.b.c.d." + str(int(random.random() * 1000))
        res = mt.createMetricTypeDoc(testName)
        idsaved = res['metrictypeid']
        # XXX Do you really want to print out the whole cache?
        assert mt._cache[testName], "should have elem in cache now, saved it, cache: %s" % (pformat(mt._cache))
        mt.closeConnection()
        idfound = None
        try:
            idfound = mt.getIdByName(testName)
        except:
            pass
        assert idsaved == idfound, "found id=%s, saved_id=%s." % (idfound, idsaved)

    def test_simpleRetrieveWithCache_shouldfail(self):
        """
        Simple test.  Store something, return value should be document created.
        Then, retrieve it.  But, make sure it can't retrieve using db, must use cache.
        """
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = "a.b.c.d." + str(int(random.random() * 1000))
        res = mt.createMetricTypeDoc(testName)
        idsaved = res['metrictypeid']
        mt.closeConnection()
        mt._cache = {}
        problem = False
        try:
            idfound = mt.getIdByName(testName)
        except AttributeError:
            problem = True
        assert problem, "should have had AttributeError when trying to get something when no array and no db connection."

    def test_twoWithSameName(self):
        """
        Attempt to create a duplicate metrictype.
        Should just return the existing metrictype instead of creating a duplicate.
        """
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = "a.b.c.d." + str(int(random.random() * 1000))
        resA = mt.createMetricTypeDoc(testName)
        metrictypeidA = resA['metrictypeid']
        resB = mt.createMetricTypeDoc(testName)
        metrictypeidB = resB['metrictypeid']
        assert (metrictypeidA == metrictypeidB), "Should not create a duplicate metrictype - same metricname, different metrictypeid.  But, it did: first=%s, second=%s." % (pformat(resA), pformat(resB))

    def test_getIdByName(self):

        self.clearTestDatabase()
        testName = "a.b.c.d." + str(int(random.random() * 1000))
        mta = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        resa = mta.createMetricTypeDoc(testName)
        resa_metrictypeid = resa['metrictypeid']
        mtb = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        resb_metrictypeid = mtb.getIdByName(testName)
        assert (resa_metrictypeid == resb_metrictypeid), "Should have same metric id from getIdByName() as was returned when doc was stored.  got %s instead of %s." % (pformat(resb_metrictypeid), pformat(resa))

    def test_get_missing_metrictypeid(self):

        self.clearTestDatabase()
        testName = "asdfasdfasdf" + str(int(random.random() * 1000))
        # search for something that isn't there, ensure returns None.
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        res_metrictypeid = mt.getIdByName(testName, saveNew=False)
        assert (res_metrictypeid is None), "Should not find something that isn't there." % (pformat(res_metrictypeid))

    def test_getByRegex(self):
        self.clearTestDatabase()
        mta = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testNames = []
        for i in range(1, 11):
            tn = "a.b.c.d." + str(int(random.random() * 1000))
            testNames.append(tn)
            mta.createMetricTypeDoc(tn)
        for i in range(1, 11):
            tn = "a.X.c.d." + str(int(random.random() * 1000))
            testNames.append(tn)
            mta.createMetricTypeDoc(tn)
        print "have test names : %s" % (pformat(testNames))
        mtb = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        docs = mtb.getByRegex(".*b\.c.*")
        out = [x.get('metricname', "") for x in docs]
        print "got all docs with b.c in them: %s" % (out)
        namesListCopy = copy.copy(testNames)
        print "test names copy : %s" % (pformat(namesListCopy))
        for rec in docs:
            removeName = rec['metricname']
            if (removeName in namesListCopy):
                namesListCopy.remove(removeName)
        print "names leftover: %s" % (namesListCopy)
        assert (len(namesListCopy) == 10), "should only have names leftover that are the ones with X in them, instead have: %s" % (pformat(namesListCopy))

    def test_connect_disconnect_001(self):
        self.clearTestDatabase()
        mta = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        mta.closeConnection()
        mta.closeConnection()
        mta.connection = 1
        mta.closeConnection()

    def test_getByName(self):
        self.clearTestDatabase()
        leaf_part = str(int(random.random() * 1000))
        testName = "abc.def.fff." + leaf_part
        mta = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        res = mta.getByName(testName, saveNew=False)
        assert (res is None), "Result of a query for a non-existent metrictype should be: None."
        res = mta.getByName(testName, saveNew=True)
        assert (res is not None), "Result of a query for a non-existent metrictype, with saveNew=True, should be the created record."

    def test_sortmethod(self):
        self.clearTestDatabase()
        mta = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        mta.db.aaa.insert({ 'a' : 4})
        mta.db.aaa.insert({ 'a' : 5})
        mta.db.aaa.insert({ 'a' : 1})
        mta.db.aaa.insert({ 'a' : 2})
        mta.db.aaa.insert({ 'a' : 3})
        mta.db.aaa.insert({ 'a' : 6})
        mta.db.aaa.insert({ 'a' : 7})
        res = mta.db.aaa.find()            
        #for x in res: print "have res: %s" % (pformat(x))
        res = mta.db.aaa.find({'a':2}).sort('_id', -1).limit(1)
        for x in res: print "have res: %s" % (pformat(x))

    def test_parentingOne(self):
        """
        Attempt to create a duplicate metrictype.
        Should just return the existing metrictype instead of creating a duplicate.
        """
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = "a.b.c.d." + str(int(random.random() * 1000))
        print "testing create metric type doc, testname=%s" % (pformat(testName))
        resA = mt.createMetricTypeDoc(testName)
        metrictypeidA = resA['metrictypeid']
        allMetricTypes = mt.db.metricType.find()
        for mt in allMetricTypes:
            print "Found mt name=%s, mtid=%s, parent mtid=%s" % (mt['metricname'], mt['metrictypeid'], mt['parent'])

    def test_createMetricName_badData(self):
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        # testname, should raise exception.
        testArr = [ 
            ( '',             True),  ( 'aaaa',         True),  ( 'aa.b"b',       True),
            ( '.aaaa',        True),  ( '.aaaa.bbb',    True),  ( "aa.b'b",       True),
            ( '..aaaa.bbb',   True),  ( 'aaa.',         True),  ( 'aa.b~b',       True),
            ( 'aaaa..bbb',    True),  ( 'aaaa.bbb.',    True),  ( 'aa.b`b',       True),
            ( 'aaaa.bbb..',   True),  ( 'aa bb.cc',     True),  ( 'aa.b?b',       True),
            ( 'aa b1b',       True),  ( 'aa.b?b',       True),  ( 'aa.b?b',       True),
            ( 'aa.b*b',       True),  ( 'aa.b\nb',      True),  ( 'aa.b\nb',      True),
            ( 'aa.bb\n',      True),  ( 'aa.b!b',       True),  ( 'aa.b!b',       True),
            ( 'aa.b@b',       True),  ( 'aa.b#b',       True),  ( 'aa.b#b',       True),
            ( 'aa.b$b',       True),  ( 'aa.b%b',       True),  ( 'aa.b%b',       True),
            ( 'aa.b^*b',      True),  ( 'aa.b&b',       True),  ( 'aa.b&b',       True),
            ( 'aa.b(b',       True),  ( 'aa.b)b',       True),  ( 'aa.b)b',       True),
            ( 'aa.b<b',       True),  ( 'aa.b>b',       True),  ( 'aa.b>b',       True),
            ( 'aa.b:b',       False),  ( 'aa.b;b',       True),  ( 'aa.b;b',       True),
            ( 'aa.b_b',       False),
            ( 'aa.b-b',       False),
            ( 'aaaa.bbb',     False),
            ]

        for name, res in testArr:
            print "testing name = '%s', res=%s" % (name, res)
            hadFault = False
            try:
                print "test_createMetricName_badData(): creating mt w/ name: %s" % (name)
                resA = mt.createMetricTypeDoc(name)
                # print "result of create metric: %s" % (pformat(resA))
            except BadMetricNameException:
                hadFault = True
                #msg2 = traceback.format_exc().split('\n')[:-1]
                #print "Test caught BadMetricName exception, msg: %s" % (msg2)
            assert hadFault == res, "HadFault=%s, supposed to be %s, test name '%s'." % (hadFault, res, name)

    def test_childrenlist(self):
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = "a.b.c.d." + str(int(random.random() * 1000))
        print "testing create metric type doc, testname=%s" % (pformat(testName))
        resA = mt.createMetricTypeDoc(testName)
        metrictypeidA = resA['metrictypeid']
        allMetricTypes = mt.db.metricType.find()
        resArray = {
             'a'       : [ 1001 ],
             'a.b'     : [ 1002 ],
             'a.b.c'   : [ 1003 ],
             'a.b.c.d' : [ 1004 ],
             }
         
        for thisMt in allMetricTypes:
            mnstring    = thisMt['metricname']
            childList   = thisMt.get('children', [])
            shouldBe    = resArray.get(mnstring, None)
            print "Found mt name=%s, mtid=%s, parent mtid=%s, children=%s, shouldBeChildren=%s" % (mnstring, thisMt['metrictypeid'], thisMt['parent'], childList, shouldBe)

    def test_getParentMetricName(self):
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        mnList = { 
            'a1.b.c.d1' : 'a1.b.c',
            'a2.b.c'    : 'a2.b',    
            'a3.b'      : 'a3',      
            'a4'        : None,
            }
        
        for mn, pmn in mnList.items():
            res = mt.getParentMetricName(mn)
            assert (pmn == res), "metricName '%s' should have parent metric name: '%s', instead is '%s'." % (mn, pmn, res)
    
    def printAllMetricTypeRecs(self, mt):
        res = mt.getAllMetricTypeRecords()
        resList = list(res)
        print "MetricType Records List: "
        for r in resList:
            print "PrintAll(): mn=%20.20s id=%10.10s pmtid=%10.10s childmtids=%40.40s" % (
                r.get('metricname', None), r.get('metrictypeid', None), r.get('parent', None), r.get('children', None))

    def test_fixParent(self):
        # setup:        
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = 'aaaa.bbbb'
        mtdoc = dict(metricname=testName, metrictypeid=9999, parent=None)
        mt.db.metricType.save(mtdoc)
        print "ALL METRICTYPE RECS BEFORE DELETE:"
        self.printAllMetricTypeRecs(mt)

        # now have one rec w/ broken parent.  try to fix it and see if it works.
        mt.fixParent(testName)
        self.printAllMetricTypeRecs(mt)

    def test_fixParent_missingField(self):
        # setup:        
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = 'aaaa.bbbb'
        mt.createMetricTypeDoc(testName, 9999)
        print "ALL METRICTYPE RECS BEFORE DELETE:"
        self.printAllMetricTypeRecs(mt)
        res = mt.db.metricType.update({ 'metricname' : testName}, { '$set' : { 'parent' : None }}, w=1)
        print "ALL METRICTYPE RECS AFTER  DELETE:"
        self.printAllMetricTypeRecs(mt)
        print "result of update to remove parent: %s" % (res)

        # now have one rec w/ broken parent.  try to fix it and see if it works.
        mt.fixParent(testName)
        print "ALL METRICTYPE RECS AFTER FIXUP:"
        self.printAllMetricTypeRecs(mt)

    def test_fixParent_baselevel(self):
        # setup:        
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        testName = 'aaaa'
        mtdoc = dict(metricname=testName, metrictypeid=9999)
        mt.db.metricType.save(mtdoc)
        self.printAllMetricTypeRecs(mt)

        # now have one rec w/ broken parent.  try to fix it and see if it works.
        mt.fixParent(testName)
        self.printAllMetricTypeRecs(mt)

    def build_subtree(self):
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        mtList = [
            'a1.b.c.d1',  'a2.b.c.d2',  'a3.b.c.d3',  'a4.b.c.d4',
            'a.b1.c.d1',  'a.b2.c.d2',  'a.b3.c.d3',  'a.b4.c.d4',
            'a.b.c1.d1',  'a.b.c2.d2',  'a.b.c3.d3',  'a.b.c4.d4',
            'a.b.c.d1',   'a.b.c.d2',   'a.b.c.d3',   'a.b.c.d4',
            'a4.g.t1.h.i.j', 'a4.g.t2.h.i.j', 'a4.g.t3.h.i.j', 'a4.g.t4.h.i.j', 'a4.g.t5.h.i.j', 
            'a3.g.t1.h.i.j1', 'a3.g.t2.h.i.j2', 'a3.g.t3.h.i.j3', 'a3.g.t4.h.i.j4', 'a3.g.t5.h.i.j5', 
            'y.rabbcd.d33f.22a', 'y.rabbcd.d344.22a', 
            ]
        for tn in mtList:
            res = mt.createMetricTypeDoc(tn)
            parent = mt.db.metricType.find_one({ 'metrictypeid' : res['parent'] })
        tree = mt.db.metricType.find().sort("metricname", 1)
        print "TREE DUMP: START:"
        for rec in tree:
            print "TREE DUMP: Rec id=%s, name=%s, parent=%s, children: %s" % (rec['metrictypeid'], rec['metricname'], rec['parent'], rec['children'])
        print "TREE DUMP: END."
        return mt

    def test_createWithQuery(self):
        # testing: getByName(self, metricname, saveNew=True):
        self.clearTestDatabase()
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        for tn in [ 'a1.b.c.d1',  'a1.b.c.d2',  'a1.b2.c.d1', 'a2.b.c.d1',  'a2.b.c.d2',  'a2.b2.c.d1']:
            res = mt.getByName(tn)
            print "------"
            parent = mt.db.metricType.find_one({ 'metrictypeid' : res['parent'] })
            print "Created metric type: %s  parent: %s, children: %s, parent's children: %s" % (tn, res['parent'], res['children'], parent['children'])
        print "TREE DUMP: START:"
        tree = mt.db.metricType.find().sort("metricname", 1)
        for rec in tree:
            print "TREE DUMP: Rec id=%s, name=%s, parent=%s, children: %s" % (rec['metrictypeid'], rec['metricname'], rec['parent'], rec['children'])
        print "TREE DUMP: END."
        return mt

    def runTestOnFindNodes(self, instring, shouldBe):
        mt = self.build_subtree()
        ret = mt.find_nodes(instring)
        retSet = set()
        for r in ret:
            retSet.add((r[0]['metricname'], r[1]))
        shouldBeSet = set(shouldBe)
        assert retSet == shouldBeSet, "FAILED:  for regex: %s, should be: %s, but instead got %s." % (instring, shouldBeSet, retSet)
    
    def test_find_nodes_001(self): self.runTestOnFindNodes("*", set([('a', 'B'), ('a1', 'B'), ('a2', 'B'), ('a3', 'B'), ('a4', 'B'), ('y', 'B')]))
    def test_find_nodes_002(self): self.runTestOnFindNodes("a.*", set([('a.b1', 'B'), ('a.b2', 'B'), ('a.b3', 'B'), ('a.b4', 'B'), ('a.b',  'B')]))
    def test_find_nodes_003(self): self.runTestOnFindNodes("", set([]))
    def test_find_nodes_004(self): self.runTestOnFindNodes("a.b", set([('a.b',  'B')]))
    def test_find_nodes_005(self): self.runTestOnFindNodes("a.b.*", set([
        ('a.b.c1',  'B'), ('a.b.c2',  'B'), ('a.b.c3',  'B'), ('a.b.c4',  'B'), ('a.b.c',  'B'),  ('a.b.c',  'B'), ('a.b.c',  'B'),  ('a.b.c',  'B') ]))
    def test_find_nodes_006(self): self.runTestOnFindNodes("a.x.*", set([]))
    def test_find_nodes_007(self): self.runTestOnFindNodes("a.*.c", set([('a.b.c',  'B'), ('a.b1.c', 'B'),  ('a.b2.c', 'B'),  ('a.b3.c', 'B'), ('a.b4.c', 'B') ]))
    def test_find_nodes_008(self): self.runTestOnFindNodes("a.*1.c", set([('a.b1.c', 'B')]))
    def test_find_nodes_009(self): self.runTestOnFindNodes("a.*1.c.*", set([('a.b1.c.d1', 'L')]))

    def test_find_nodes_010(self): self.runTestOnFindNodes("a4.g.*.h.i.j", 
        set([('a4.g.t1.h.i.j', 'L'), ('a4.g.t2.h.i.j', 'L'), ('a4.g.t3.h.i.j', 'L'), ('a4.g.t4.h.i.j', 'L'), ('a4.g.t5.h.i.j', 'L')]))

    def test_find_nodes_011(self): self.runTestOnFindNodes("a3.g.*.h.i.*", 
        set([('a3.g.t1.h.i.j1', 'L'), ('a3.g.t2.h.i.j2', 'L'), ('a3.g.t3.h.i.j3', 'L'), ('a3.g.t4.h.i.j4', 'L'), ('a3.g.t5.h.i.j5', 'L')]))

    def test_find_nodes_012(self): self.runTestOnFindNodes("a.b*.c.*", 
        set([('a.b1.c.d1', 'L'), ('a.b2.c.d2', 'L'), ( 'a.b3.c.d3', 'L'), ('a.b4.c.d4', 'L'), (u'a.b.c.d1', 'L'), (u'a.b.c.d3', 'L'), (u'a.b.c.d2', 'L'), (u'a.b4.c.d4', 'L'), ('a.b.c.d4', 'L')]))

    def runSplitOnStars(self, instring, firstShouldBe, starShouldBe, lastShouldBe):
        mt = self.build_subtree()
        (first, star, last) = mt.splitOnStars(instring)
        assert firstShouldBe == first, "first should be %s, instead: got %s" % (firstShouldBe, first)
        assert starShouldBe  == star,  "star should be %s, isntead got %s" % (starShouldBe, star)
        assert lastShouldBe  == last,  "last should be %s, instead: got %s" % (lastShouldBe, last)

    def testSplitOnStars_01(self):  self.runSplitOnStars('a.*.b.*', 'a', '*', 'b.*')
    def testSplitOnStars_02(self):  self.runSplitOnStars('a.b.*', 'a.b', '*', '')
    def testSplitOnStars_03(self):  self.runSplitOnStars('*.a', '', '*', 'a')

    def testParentAndChildrenCorrect(self):
        self.clearTestDatabase()
        mt = self.build_subtree()

        allmts = mt.db.metricType.find()
        for thisMt in allmts:
            print "Mtid=%s name=%s par=%s children=%s" % (thisMt['metrictypeid'], thisMt['metricname'], thisMt['parent'], thisMt['children'])

        shouldBeChildren = {
            'a'     : [ 'a.b', 'a.b1', 'a.b2', 'a.b3', 'a.b4' ],
            'a.b'   : [ 'a.b.c', 'a.b.c1', 'a.b.c2', 'a.b.c3', 'a.b.c4' ],
            'a.b.c' : [ 'a.b.c.d1', 'a.b.c.d2', 'a.b.c.d3', 'a.b.c.d4' ],
            }
        shouldBeParent = {
            'a'     : None,
            'a.b'   : 'a',
            'a.b1'  : 'a',
            'a.b2'  : 'a',
            'a.b3'  : 'a',
            'a.b4'  : 'a',
            }
        for k, v in shouldBeChildren.items():
            mtobj = mt.getByName(k)
            resSet = set()
            for cmtid in mtobj.get('children', []):
                cmtObj = mt.getById(cmtid)
                if cmtObj:
                    resSet.add(cmtObj.get('metricname'))
            mongoObj  = list(mt.db.metricType.find({'metricname' : k}))
            cachedObj = mt._cache.get(k, None)
            print "Retrieved: %s\nCached   : %s" % (mongoObj, cachedObj)
            print "MONGO:  MT %s has children %s" % (k, resSet)
            sbSet  = set(v)
            assert resSet == sbSet, "Name: %s - Found children list: %s, should be: %s" % (k, resSet, sbSet)

    def test_find_mnames_001(self):
        mt = self.build_subtree()
        tdata = {
            'a.b'   : ['a.b'],
            'a.b.*' : [u'a.b.c', u'a.b.c1', u'a.b.c2', u'a.b.c3', u'a.b.c4'],
            'a.*.c' : [u'a.b.c', u'a.b1.c', u'a.b2.c', u'a.b3.c', u'a.b4.c'],
            'a.b.c.d*' : [u'a.b.c.d1', u'a.b.c.d2', u'a.b.c.d3', u'a.b.c.d4'],
            '*.b'   : [u'a1', u'a2', u'a3', u'a4', u'a', u'y'],
            'a.b*.c.*': ['a.b2.c.d2', 'a.b1.c.d1', 'a.b.c.d4', 'a.b3.c.d3', 'a.b.c.d1', 'a.b.c.d3', 'a.b.c.d2', 'a.b4.c.d4'],
            'y.*'   : [u'y.rabbcd'],
            'y.*.*.22a'   : [u'y.rabbcd.d33f.22a', u'y.rabbcd.d344.22a'],
            'y.rabbcd.d3??.22a' : [u'y.rabbcd.d33f.22a', u'y.rabbcd.d344.22a'],
            'y.rabbcd.d33?.22a' : [u'y.rabbcd.d33f.22a'],
            'y.rabbcd.*f.22a' : [u'y.rabbcd.d33f.22a'],
            }                
        for key, val in tdata.items():
            ret = mt.find_mnames(key)
            ret.sort()
            ret = [unicode(x) for x in ret]
            val.sort()
            val = [unicode(x) for x in val]
            print "key: %s, shouldbe: %s, ret: %s" % (key, val, ret)
            assert val == ret, "val != ret, val: %s, ret=%s" % (val, ret)


    def test_linkFieldPresent(self):
        mt = self.build_subtree()
        ret = mt.db.metricType.find()
        for rec in ret:
            assert rec.get('linktometricname', 'Uninit') != 'Uninit', "linktometricname key should exist, but got %s" % (rec)

    def test_simpleCreateLink(self):
        self.clearTestDatabase()
        mt = self.build_subtree()
        mt.createLink('a.b', 'x.y')
        ret = mt.db.metricType.find()
        fromdoc = None
        todoc   = None
        for rec in ret:
            if rec.get('metricname', '') == 'x.y':
                print "rec: %s" % (rec)
                fromdoc = rec
                continue
            if rec.get('metricname', '') == 'a.b':
                print "rec: %s" % (rec)
                todoc = rec
            assert rec['linktometricname'] is None, "should have no other links: rec=%s." % (rec)
        assert fromdoc['linktometricname'] == todoc['metricname'], "link should be from %s to %s" % (fromdoc, todoc)

    def test_findAlternatePathMT(self):
        self.clearTestDatabase()
        mt = self.build_subtree()
        mt.createLink('a.b', 'p.q')

        pqc1d1 = mt.getByName("p.q.c1.d1", saveNew=False)
        abc1d1 = mt.getByName("a.b.c1.d1", saveNew=False)
        assert abc1d1, "should have found abc1d1."
        assert pqc1d1, "should have found pqc1d1."
        assert pqc1d1['metrictypeid'] == abc1d1['metrictypeid'], "should have alternate same: %s" % (pqc1d1, abc1d1)

    def test_findNodesAlternate_expandTree(self):
        self.clearTestDatabase()
        mt = self.build_subtree()
        mt.createLink('a.b', 'p.q')
        
    def test_findNodesAlternate_explicitAfterLink(self):
        self.clearTestDatabase()
        mt = self.build_subtree()
        print "Finding 001"
        mt.createLink('a.b', 'p.q')
        # note that 'a.b.c1.d1' exists.  So, should be able to get nodes from to p.q.c1 of p.q.c1.d1.
        print "Finding 002"
        nodes = mt.find_nodes('a.b')        
        print "Finding 003"
        print "a.b.   :  find_nodes yields: %s" % (nodes)
        nodes = mt.find_nodes('p.q')        
        print "Finding 004"
        print "p.q.   :  find_nodes yields: %s" % (nodes)
        nodes = mt.find_nodes('a.b.*')        
        print "Finding 005"
        print "a.b.*  :  find_nodes yields: %s" % (nodes)
        nodes = mt.find_nodes('p.q.*')        
        print "Finding 006"
        print "p.q.*  :  find_nodes yields: %s" % (nodes)
        nodes = mt.find_nodes('p.q.c1')        
        print "Finding 007"
        print "p.q.c1 :  find_nodes yields: %s" % (nodes)

    def test_getPossibleSubnames(self):
        mt = MetricType(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname)
        ret = mt.getPossibleSubnames('a.b.c.d.e')
        assert ret == ['a.b.c.d.e', 'a.b.c.d', 'a.b.c', 'a.b', 'a'], "shoudl be array of some elems, instead: %s" % (ret)
        ret = mt.getPossibleSubnames('a')
        assert ret == ['a'], "should be array w/ only 'a', instead: %s" % (ret)
        ret = mt.getPossibleSubnames('')
        assert ret == [], "should be empty array, instead: %s" % (ret)

    def test_isLinkLeafNode(self):
        self.clearTestDatabase()
        mt = self.build_subtree()
        mt.createLink('a.b', 'p.q')
        pq = mt.getByName("p.q", saveNew=False)
        print "have pq: %s" % (pq)
        res = mt.isMtobjLeafNode(pq)
        assert not res, "p.q should not be a leaf node."
        pq = mt.getByName('a1.b.c.d1', saveNew=False)
        res = mt.isMtobjLeafNode(pq)
        assert res, "'a1.b.c.d1' should be a leaf node."
        
    def test_fixChildren(self):
        self.clearTestDatabase()
        mt = self.build_subtree()
        # now have: 'a.b.c1.d1',  'a.b.c2.d2',  'a.b.c3.d3',  'a.b.c4.d4', 'a.b.c'
        orig_abrec = mt.getByName("a.b", saveNew=False)  
        print "ORIG ABREC: %s" % (orig_abrec)
        childListB4 = orig_abrec.get('children', [])
        print "childListb4: %s" % (childListB4)
        retval = mt.db.metricType.update({ 'metricname' : 'a.b'}, { '$set' : { 'children' : [ 9999 ] }}, w=1)
        assert retval.get('n', 0) > 0, "update should have modified abrec, instead: %s" % (retval)
        mt.invalidateCacheForName('a.b')
        mod_abrec = mt.getByName("a.b", saveNew=False)
        mod_children = mod_abrec.get('children', [])
        assert mod_children == [ 9999 ], "children should be [9999], instead is: %s" % (pformat(mod_children))
        mt.fixChildren('a.b')
        fixed_abrec = mt.getByName("a.b", saveNew=False)
        fixed_children = fixed_abrec.get('children', [])
        fixed_child_set = set(fixed_children)
        orig_child_set  = set(childListB4)
        assert fixed_child_set == orig_child_set, "Orig child set (%s) should be equal to fixed: %s" % (orig_child_set, fixed_child_set)

    def test_qp_cache(self):
        self.clearTestDatabase()
        mt = self.build_subtree()
        q = 'a.b.*'
        mt.nowTime = lambda: 3
        res = mt.getQpFromCache(q)
        assert res == None
        shouldBe = ['a.b.1', 'a.b.c']
        mt.addQpToCache(q, shouldBe)
        mt.nowTime = lambda: 4  # not expired yet
        res = mt.getQpFromCache(q)
        assert shouldBe == res, "Should Be %s but is %s" % (shouldBe, res)
        mt.nowTime = lambda: 400000000  # Definitely Expired
        res = mt.getQpFromCache(q)
        assert res == None, "Should be expired, so should be None, but is %s" % (res)
        


###############################################################################

if __name__ == "__main__":   # pragma: no cover
    unittest.main()


###############################################################################
###############################################################################
###############################################################################
###############################################################################
