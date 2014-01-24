#!/usr/bin/env python2.6

import sys
import os
import time
import traceback
import pymongo
from optparse import OptionParser
from pprint import pprint, pformat

from graphite.backends.mongodb.mockLogger import MockLogger
from graphite.backends.mongodb.metricType import MetricType
from graphite.settings import MONGO_SAFE_MODE, MONGO_SERVER, MONGO_PORT, MONGO_DBNAME, MONGOS_CONN_LIST, MONGO_DBUSER, MONGO_DBPASS

################################################################################

class BadMetricValueException(Exception):
    pass

################################################################################

class BadMetricTimestampException(Exception):
    pass

################################################################################

class MetricValue(object):
    def __init__(self, 
            mongo_server=MONGO_SERVER, 
            mongo_port=MONGO_PORT,
            dbname=MONGO_DBNAME,
            dbuser=MONGO_DBUSER,
            dbpass=MONGO_DBPASS,
            logger=None, 
            simpleConn=False):
                
        self.logger = logger or MockLogger()
        self.connection = None

        # NOTES ON MEASUREMENTS PER DOC:
        # Tried 5000 points / doc, got VERY high locking rates, bad performance.
        # http://www.mongodb.org/display/DOCS/Tweaking+performance+by+document+bundling+during+schema+design
        # Says that optimum object size is less than op system's VMM page size, almost always 4 KB).  
        # Had lots of experience with 100 datapoints (via 10Gen's MMS) ==> 3.4Kb, good performance.
        # Tested, found optimal is about 125 datapoints.
        
        self._measurementsPerDoc = 125 
        self.safeMode = MONGO_SAFE_MODE
        self.dbname = dbname
        self.mongo_server = mongo_server
        self.mongo_port = mongo_port
        self.checkUpdateRetvalEvery = 1000
        self.lastCheckUpdateRetval = 0
        self.openConnection(
            mongo_server=self.mongo_server, 
            mongo_port=self.mongo_port,
            dbname=self.dbname, 
            simpleConn=simpleConn)
        self.metricType = MetricType(
            mongo_server=self.mongo_server,
            mongo_port=self.mongo_port,
            dbname=self.dbname,
            connectionObject=self.connection,
            logger=self.logger)
        assert self.metricType, "MetricType instantiation failed."
        self.mvDocExistsCache = {}  # by mtid

    def __del__(self):
        self.closeConnection()

    def closeConnection(self):
        try:
            if (getattr(self, 'connection', None)):
                #self.logger.debug("Closing connection in MetricValue...")
                self.connection.close()
            #self.logger.debug("Connection in MetricValue closed.")
        except:
            # don't care if close connection fails, we just want to exit.
            self.logger.error("close connection failed.")
        return
                              
    def openConnection(self, mongo_server=MONGO_SERVER, mongo_port=MONGO_PORT, dbname="megamaid", simpleConn=False):

        #self.logger.debug("MetricValue(): Connecting to server %s on port %s to dbname=%s." % (mongo_server, mongo_port, dbname))

        wc = 0 
        if MONGO_SAFE_MODE:
            wc = 1

        if not simpleConn:
            # simpleConn used by Graphite.  Don't need high-availability connection, need quick connection.
            try:
                t0 = time.time()
                rpsp = pymongo.read_preferences.ReadPreference.SECONDARY_PREFERRED
                # Note: write_concern==> w param.  w == num of (primary/rep) servers to verify before returning.

                self.connection = pymongo.MongoClient(
                    MONGOS_CONN_LIST, 
                    w=wc,
                    read_preference=rpsp,
                    socketTimeoutMS=60000,
                    connectTimeoutMS=60000,
                    auto_start_request=True)
                    
                t1 = time.time()
                self.logger.debug("Connected, MongoClient took %.04f seconds" % ((t1 - t0)))
            except Exception, e:
                self.connection = None
                self.logger.error("Could not invoke MongoClient: err: %s" % e)

        if not self.connection:            
            t0 = time.time()
            self.connection = pymongo.Connection(mongo_server, mongo_port)
            t1  = time.time()
            #self.logger.debug("Connected pymongo.Connection, took %.04f seconds  " % ((t1 - t0)))
        # Perhaps this should use a ReplicaSetConnection as per:
        #    http://emptysquare.net/blog/save-the-monkey-reliably-writing-to-mongodb/
        
        self.db = self.connection[dbname]
        self.mvalueCollection = self.db.metricValue
        self.logger.debug("MetricValue(): Connection established, have collection objects.")
        return

    def getServerStatus(self):
        ret = self.db.serverStatus()
        #self.logger.debug("Mongo server status: %s" % (pformat(ret)))
        return ret

    def getMtidByName(self, metricName, saveNew=False):
        return self.metricType.getIdByName(metricName, saveNew)

    def getByName(self, metricName):
        mtid = self.metricType.getIdByName(metricName)
        #self.logger.debug("getByName(): mname=%s, found mtid=%s" % (metricName, mtid))
        retval = self.getByMetricTypeId(mtid)
        return retval

    def getIntervalsForMetricTypeId(self, mtid):
        #self.logger.debug("metricValue.getIntervalsForMetricTypeId(): id=%d." % (mtid))
        docs = self.mvalueCollection.find({"metrictypeid" : mtid},
                            {'startdatetime' : 1, 'lastupdatetime' : 1}).sort('lastupdatetime', -1)
        retList = list(docs)
        return retList

    def getDocsOrderedByMtid(self, startMtid, endMtid, batchSize=100):
        cur = self.mvalueCollection.find({"metrictypeid" : { "$gte" : startMtid, "$lte" : endMtid} }, batchSize=10).sort([("metrictypeid", 1), ("seqno", 1)])
        return cur
                
    def getByMetricTypeId(self, mtid, startTime=None, endTime=None):
        self.logger.debug("metricValue.getByMetricTypeId(): id=%d." % (mtid))
        if (startTime is None and endTime is None):
            docs = self.mvalueCollection.find({"metrictypeid" : mtid}).sort("startdatetime", 1)
        elif (startTime is None and endTime is not None):
            docs = self.mvalueCollection.find(
                { "metrictypeid"   : mtid,
                  "startdatetime"  : { "$lte": endTime} })
        elif (startTime is not None and endTime is None):
            docs = self.mvalueCollection.find(
                { "metrictypeid"   : mtid,
                  "lastupdatetime" : { "$gte": startTime} })
        else:  # have both start and end times.
            docs = self.mvalueCollection.find(
                { "metrictypeid"   : mtid,
                  "startdatetime"  : { "$lte": endTime},
                  "lastupdatetime" : { "$gte": startTime} })
            
        retval = list(docs)
        #self.logger.debug("metricValue.getByMetricTypeId(): have %d docs with metrictypeid=%s" % (len(retval), mtid))
        return retval

    def getDataForRange(self, mtid, startTime, endTime):
        '''return a sorted list of (timestamp, value) covering the requested time interval.
        startTime and endTime are unix times'''
        data = []
        #  This non-obvious query is what's needed to get overlapping intervals right!
        docs = self.mvalueCollection.find(
            { "metrictypeid"   : mtid,
              "startdatetime"  : { "$lte": endTime},
              "lastupdatetime" : { "$gte": startTime} })
                                           
        for doc in docs:
            vals = doc.get('vals')
            if vals:
                # Deal with the fact that vals is value/timestamp 
                data.extend(( (v[1],v[0]) for v in vals ))
        data.sort()
        # Trim excess at start and end
        start = 0
        n = len(data)
        while start < n and data[start][0] < startTime:
            start += 1
        end = n-1
        while end > 0 and data[end][0] > endTime:
            end -= 1
        return data[start:end+1]

    def getLatestDocByMetricName(self, metricName):
        docs = self.getByName(metricName)
        retval = docs and docs[0] or None
        return retval 

    def getLatestDocByMetricTypeId(self, mtid):
        #self.logger.debug("metricValue.getLatestDocByMetricTypeId(): metrictypeid=%s." % (mtid))
        dlist = self.getByMetricTypeId(mtid)
        retval = dlist and dlist[0] or None
        #if retval:
            #self.logger.debug("metricValue.getLatestDocByMetricTypeId(): Existing Document found with mtid '%s': %s" % (mtid, retval))
        #else:
            #self.logger.debug("metricValue.getLatestDocByMetricTypeId(): Existing Document not found for mtid '%s'" % (mtid))
        return retval

    def getMeasurementsPerDoc(self):
        return self._measurementsPerDoc 
    
    def updateMetric(self, metricName, updateValue, timeStamp=0, overrideTimestampLimits=False, retries=100):
        self.logger.warning("updateMetric deprecated, please use addMeasurement instead.")
        return self.addMeasurement(metricName, updateValue, timeStamp, overrideTimestampLimits, retries)

    def addMeasurement(self, metricName, updateValue, timeStamp=0, overrideTimestampLimits=False, retries=100):
        now = time.time()

        #self.logger.debug("metricValue.addMeasurement(): starting to update metricName '%s' value '%s', timestamp '%s'.." % (metricName, updateValue, timeStamp))
        
        mtid = None
        while retries >= 0:
            try:
                mtid  = self.metricType.getIdByName(metricName)
                break
            except pymongo.errors.AutoReconnect, e:
                self.logger.warning("mongo db reconnect %s, retrying %d" % (e, retries))
                sys.stdout.flush()
                retries -= 1
        if (retries == 0):
            return False
            
        try:
            updateValue = float(updateValue)
        except:
            raise BadMetricValueException
        try:
            timeStamp = float(timeStamp)
        except:
            raise BadMetricTimestampException
        if not overrideTimestampLimits:
            msg = "Timestamp too old (4 day limit), name=%s, val=%s, ts=%s, now=%s" % (
                metricName, updateValue, timeStamp, now)
            assert (abs(now - timeStamp) < 345600), msg

        while retries >= 0:
            try:
                if not self.mvDocExistsCache.get(mtid, False):
                    # if we don't know if MetricValue doc exists, have to check and possibly create one.
                    mvdoc = self.db.metricValue.find_one({ 'metrictypeid' : mtid, 'seqno': 0 })
                    if not mvdoc:
                        mtid = self.insertNewDoc(metricName, vals=[[updateValue, timeStamp]], seqno=0)
                    self.mvDocExistsCache[mtid] = True
                    return
                break
            except pymongo.errors.AutoReconnect, e:
                self.logger.warning("mongo db reconnect %s, retrying %d" % (e, retries))
                sys.stdout.flush()
                retries -= 1
        if (retries == 0):
            return False

        self.lastCheckUpdateRetval  += 1
        writeConcern = 0
        if self.lastCheckUpdateRetval > self.checkUpdateRetvalEvery:
            self.lastCheckUpdateRetval = 0
            writeConcern = 1
            
        retval = None  
        while retries >= 0:
            #self.logger.debug("Storing data, retries counting down from 100: %s" % (retries))
            try:
                retval = self.mvalueCollection.update(
                    {'metrictypeid':mtid, 'seqno':0 },
                    {
                        '$push' : {'vals' : (updateValue, timeStamp)},
                        '$pop'  : {'offsets' : 1},
                        '$set'  : {'lastupdatetime': max(timeStamp, now)},
                        '$inc'  : {'numvals' : 1},
                    },
                    upsert = False,
                    multi = False,  
                    w = writeConcern,   
                    )
                
                #self.logger.debug("retval from fam(): %s" % (retval))
                break
            except pymongo.errors.AutoReconnect, e:
                self.logger.warning("mongo db reconnect %s, retrying %d" % (e, retries))
                sys.stdout.flush()
                retries -= 1
                retval = None
        if retries == 0:
            return False
        if writeConcern and retval:
            if not retval.get('n'):
                self.logger.warning("Measurement not saved, mname=%s." % (metricName))
        #self.logger.debug("metricValue.addMeasurement(): updated metricName '%s' w/ mtid=%s, value '%s', timestamp '%s'.." % (metricName, mtid, updateValue, timeStamp))
        return True

    def printNewDocument(self, doc):
        outStr = "<MetricValue Doc mtid:%s start:%s last:%s, seqno:%s, numvals:%s, vals:%s, len(offsets): %s, name: %s" % (
            doc.get('metrictypeid'), 
            doc.get('startdatetime'), 
            doc.get('lastupdatetime'), 
            doc.get('seqno'), 
            doc.get('numvals'), 
            doc.get('vals'), 
            len(doc.get('offsets')),
            doc.get('metricname'))
        return outStr

    def insertNewDoc(self, metricName, vals=None, seqno=None):
        newdoc = self.createInsertableDoc(metricName, vals=vals, seqno=seqno)
        self.logger.info("created new document: %s" % (self.printNewDocument(newdoc)))
        docid = self.mvalueCollection.save(newdoc) # returns objectid
        self.logger.info("Save returned docid: %s" % (docid))
        return newdoc.get('metrictypeid')

    def createInsertableDoc(self, metricName, vals=None, seqno=None):
        assert metricName, "Must supply metric name"
        assert vals, "Must supply values"
        for updateValue, timeStamp in vals:
            assert updateValue is not None, "Must supply a non-None update value."
            assert timeStamp, "Must supply a timestamp."
        sorted_vals = vals[:]  # make a copy
        sorted_vals.sort(key=lambda x: x[1])
        if seqno is None:
            seqno = int(time.time())
        mtid = self.metricType.getIdByName(metricName)
        numvals = len(vals)
        numOffsets = max(self.getMeasurementsPerDoc() - numvals, 0)
        offsets = [[0.0, 0.0]] * numOffsets

        firstTime = sorted_vals[0][1]
        lastTime  = sorted_vals[-1][1]
        newdoc = {
            'metrictypeid'      : mtid,
            'seqno'             : seqno,
            'metricname'        : metricName,
            'startdatetime'     : firstTime,
            'lastupdatetime'    : lastTime,
            'numvals'           : numvals,
            'vals'              : sorted_vals, 
            'offsets'           : offsets,
            }
        return newdoc

