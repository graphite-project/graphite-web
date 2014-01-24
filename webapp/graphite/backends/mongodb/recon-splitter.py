#!/usr/bin/env python2.6
################################################################################

import io
import os
import time
import sys
import string
import logging
import unittest
import datetime
import random
import json
import socket
import traceback
import time
import struct
from cPickle import loads, dumps
from multiprocessing import Process
from optparse import OptionParser
from pprint import pprint, pformat
from socket import gethostname
from pymongo import Connection
import pymongo
from bson.code import Code
from itertools import izip_longest

from dcm.common.events import measurement, heartbeat
from dcm.mods.metricValue import MetricValue
from dcm.mods.metricType import MetricType
from dcm.mods.mockLogger import MockLogger
from dcm.dcmSettings import MONGO_PORT, MONGO_SERVER, HOSTNAME

DEFAULT_RECON_HOST = "reconteevip.prod.ch3.s.com"
DEFAULT_RECON_PORT = 8080

################################################################################


class AllDoneException(Exception):
    pass

################################################################################

class ReconSplitter(object):

    def __init__(self, mongo_server=MONGO_SERVER, mongo_port=MONGO_PORT, dbname='megamaid'):
        print "Initializing ReconSplitter."
        self.verbose            = True
        self.debug              = False
        self.mongo_server       = mongo_server
        self.mongo_port         = mongo_port
        self.dbname             = dbname
        print "At initialization, mongo_server=%s, mongo_port=%s, dbname=%s" % (self.mongo_server, self.mongo_port, self.dbname)
        self.logger = logging.getLogger()
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(logging.StreamHandler())
        self.minMtid            = 0
        self.maxMtid            = int(999999999999999)
        self.numProcesses       = 10
        self.batchSize          = 500
        self.runOnce            = False
        self.hostname           = HOSTNAME.replace('.', "_")
        self.stats_socket       = None
        self.numInSeqZero       = 400  

        ##############################
        # Notes:
        # Save-off's = 125, so must have 250 minimum.  
        # Calc:  1000 minutes = 16 hours in seq 0 record.
        # 1000 datapoints storage:  1000 * 1.5m metrics * (4kb per 150 datapoints) = 40 GB = 10 GB/box. Low.
        # Stats all started @ same time, so spikey.  Defeat spiky by making each rec seq0 max into random 1000 +- 10.
        ##############################


    def __del__(self):
        self.closeConnection()

    def getOptions(self):
        parser = OptionParser()
        parser.add_option("-d", "--debug",   action="store_true", dest="debug",   default=False, help="debug mode for this program, writes debug messages to logfile." )
        parser.add_option("-v", "--verbose", action="store_true", dest="verbose", default=False, help="verbose mode for this program, prints a lot to stdout." )
        parser.add_option("-o", "--once",    action="store_true", dest="once",    default=False, help="run each process once through and quit" )
        parser.add_option("-p", "--processes", action="store", type="int", dest="processes", default=10, help="number of processes to run.")
        parser.add_option("-b", "--batchsize", action="store", type="int", dest='batchsize', default=200, help="number of records to process in a batch")
    
        (options, args)             = parser.parse_args()
        self.verbose                = options.verbose
        self.debug                  = options.debug
        self.runOnce                = options.once
        self.numProcesses           = options.processes
        self.batchSize              = options.batchsize
        if (self.verbose):
            print "verbose=%s, debug=%s, once=%s, processes=%s, batchsize=%s" % (self.verbose, self.debug, self.runOnce, self.numProcesses, self.batchSize)
        return

    def openConnection(self):
        self.mvObj = MetricValue(mongo_server=self.mongo_server, mongo_port=self.mongo_port, dbname=self.dbname, logger=self.logger, simpleConn=True)
        self.db = self.mvObj.db
        self.logger.info("MetricValue connection established.")

    def closeConnection(self):
        if hasattr(self, 'mvObj'):
            self.mvObj.closeConnection()
        return
        
    def getWantedMtids(self, processNumber):
        start, end = self.splitPoints[processNumber]

        cur = self.db.metricValue.find(
            {  'numvals'       : { '$gt' : self.numInSeqZero }, 
               'metrictypeid'  : { '$gte' : start, '$lte' : end } 
            }, 
            {  '_id' : 0, 
               'metrictypeid' : 1 
            }, 
            batch_size=self.batchSize).limit(self.batchSize)
        batch = list(cur)
        if not batch:
            return []
        batch = batch[0:self.batchSize]
        # have a batch to act on.
        self.logger.debug("getWantedMtids(): process %d have %s of %s" % (processNumber, len(batch), self.batchSize))
        mtids = [x['metrictypeid'] for x in batch]
        self.logger.debug("getWantedMtids(): ProcessNum: %s, len(mtids): %d, mtids: %s" % (processNumber, len(mtids), [int(x) for x in mtids]))
        return mtids

    def fixSpecificMtids(self, mtids, stats):
        self.logger.debug("fixSpecificMtids(): have list of metrictypeids: %s" % (mtids))
        cur = self.db.metricValue.find({ 'metrictypeid' : { '$in' : mtids }, 'seqno': 0 })
        batch = list(cur)
        namesList = [ x['metricname'] for x in batch]
        self.mvObj.metricType.getArrayOfNames(namesList)
        self.logger.debug("fixSpecificMtids():  got array of %d names to populate mt cache." % (len(namesList)))
        self.logger.debug("fixSpecificMtids():  namesList: %s" % (namesList))
        numChanged = 0
        insertAccumulator = { 'recs' : [] }
        for rec in batch:
            currentRec = rec
            self.fixOversizedMetricValueRec(rec, insertAccumulator, stats)
        self.doBatchInsert(insertAccumulator, stats)  # insert leftover records
        self.logger.debug("fixSpecificMtids():  Fixed %d metricvalue records" % (numChanged))
        return        

    def printStats(self, stats, processNumber):
        now = time.time()
        lastPrinted = stats.get('lastprinted', 0)
        if (now - lastPrinted > 10):
            numMtids = stats.get('numMtids', 0)
            if numMtids != 0:
                stats['addsPerMtid'] = float(stats.get('addedObjectids', 0)) / stats.get('numMtids')
            else:
                stats['addsPerMtid'] = 0
            printStats = "Stats: "
            events = []
            for key,value in stats.items():
                try:
                    fval = float(value)
                except:
                    fval = -1
                context = dict(
                    namingScheme='app-instance', 
                    app='recon-splitter', 
                    instance=str(processNumber)
                    )
                event = measurement(key, fval, **context)
                events.append(event)
                self.logger.debug("created event: %s" % (pformat(event)))
                printStats += " %s:%0.2f" % (key, fval)

            data = dumps(events)
            try:
                hdr = struct.pack("!L", len(data))
                self.stats_socket.sendall(hdr+data)
                # self.logger.info("router.timer_task(): stats_socket send done of %d events, datasize: %d, example: %s" % (len(events), len(data), events[-1]))
            except Exception, e:
                self.logger.error("send %d bytes: %s" % (len(data), e))
                # Attempt quick reconnect
                try:
                    self.stats_socket = socket.socket()
                    self.stats_socket.settimeout(1)
                    self.stats_socket.connect((DEFAULT_RECON_HOST, DEFAULT_RECON_PORT))
                except Exception, e:
                    self.logger.error("connect(%s:%s): %s" % (DEFAULT_RECON_HOST, DEFAULT_RECON_PORT, e))            
            stats['lastprinted'] = int(now)
            self.zeroStats(stats)
            self.logger.error(printStats)

    def zeroStats(self, stats):
        for elem in ['addAttempts', 'addedObjectids', 'numUpdates', 'numMtids', 'exc', 'addsPerMtid']:
            stats[elem] = 0

    def findOversizedMetricValueRecs(self, processNumber):
        currentRec = None
        stats = {}
        self.zeroStats(stats)

        self.logger.info("findOversizedMetricValueRecs():  Process #%d starting to search for splitable MV records..." % (processNumber))
        while 1:
            wantedMtids = []
            try:
                wantedMtids = self.getWantedMtids(processNumber)
                stats['numMtids'] += len(wantedMtids)
                self.fixSpecificMtids(wantedMtids, stats)
                self.logger.debug("Done with outer loop, sleeping for 1 second.")
                self.printStats(stats, processNumber)
                time.sleep(10)  # if none found (agents off?), don't barrage db with queries.
            except:
                mtid = "None"
                if currentRec:
                    mtid = int(currentRec.get('metrictypeid', 0))
                stats['exc'] += 1
                self.logger.warning("findOversizedMetricValueRecs():  Rec mtid=%s, EXCEPTION: %s." % (mtid, traceback.format_exc()))
            if self.runOnce:
                raise AllDoneException
            if not wantedMtids:
                time.sleep(1)
                
            
    def fixOversizedMetricValueRec(self, rec, insertAccumulator, stats):
        self.logger.debug("fixOversizedMetricValueRec(): fixing rec w/ mtid=%d" % (rec['metrictypeid']))
        vals    = rec['vals'][:]  # make a copy
        vals.sort(key=lambda datapoint: datapoint[1])  # sort by timestamp, in case it isn't already sorted.
        numvals = rec['numvals']
        diffNum = numvals - len(vals)
        self.logger.debug("fixOversizedMetricValueRec():  numvals=%s, len(vals)=%s" % (numvals, len(vals)))
        if diffNum:
            self.logger.warning("fixOversizedMetricValueRec(): warning, incorrect numvals (%s) should be len(vals): %s" % (numvals, len(vals)))
            numvals = len(vals)
        num2move  = 125
        vals2remove = []
        recsAddedThisMtid = 0
        while 1:
            if len(vals) < 250:
                break
            recsAddedThisMtid += 1
            valsThisTime = vals[0:125]
            vals2remove.extend(valsThisTime)
            vals = vals[125:]
            # self.logger.warning("fixOversizedMetricValueRec(): doc=%s, num2move=%s, vals2move: %s" % (rec, num2move, vals2move))
            idoc = self.mvObj.createInsertableDoc(rec['metricname'], valsThisTime)
            insertAccumulator['recs'].append(idoc)

        self.logger.debug("fixOversizedMetricValueRec(): added %d recs for mtid %d." % (recsAddedThisMtid, rec['metrictypeid']))
        if len(insertAccumulator['recs']) >= 100:
            self.doBatchInsert(insertAccumulator, stats)

        newMinTuple = self.datapointMinTuple(vals)
        newMaxTuple = self.datapointMaxTuple(vals)
        newMinTime = newMinTuple and newMinTuple[1]  # val, ts
        newMaxTime = newMaxTuple and newMinTuple[1]  # val, ts
        numVals2remove = 0 - len(vals2remove) - diffNum  # number was incorrect when first read, also adjust by difference found.
        offsetFieldSize = self.numInSeqZero + 100  # have to add back the random factor.
        offsetData = [ [3,3] for x in range(0, offsetFieldSize) ]
        self.db.metricValue.update({ 'metrictypeid' : rec['metrictypeid'], 'seqno': 0}, 
            { 
                '$pullAll'  : { 'vals'          : vals2remove }, 
                '$inc'      : { 'numvals'       : numVals2remove }, 
                '$set'      : { 'startdatetime' : newMinTime, 'lastupdatetime' : newMaxTime, 'offsets' : offsetData } 
            })
        updatedRec = self.db.metricValue.find_one({ 'metrictypeid' : rec['metrictypeid'], 'seqno': 0})
        stats['numUpdates'] += 1
        # self.logger.warning("fixOversizedMetricValueRec(): after update, have mtid=%s, numvals: %s, len(vals): %s" % (updatedRec['metrictypeid'], updatedRec['numvals'], len(updatedRec['vals'])))
        return 

    def doBatchInsert(self, insertAccumulator, stats):
        if not len(insertAccumulator['recs']):
            return
        docidList = self.db.metricValue.insert(insertAccumulator['recs']) # returns objectid list
        stats['addAttempts'] += len(insertAccumulator['recs'])
        stats['addedObjectids'] += len(docidList)
        insertAccumulator['recs'] = []
        self.logger.debug("*" * 80)
        self.logger.debug("doBatchInsert():  Inserted of %d docs." % len(docidList ))
        self.logger.debug("doBatchInsert(): list of inserted docids: %s" % (docidList))
        return

    def fixNumVals(self, rec):
        pass

    def datapointMinTuple(self, inList):
        temp = self.datapointSort(inList)
        if not temp:
            return None
        return temp[0]

    def datapointMaxTuple(self, inList):
        temp = self.datapointSort(inList)
        if not temp:
            return None
        return temp[-1]

    def datapointSort(self, inList, reverse=False):
        outList = inList[:]
        outList.sort(key=lambda datapoint: datapoint[1], reverse=reverse)
        return outList

    def isListSorted(self, inList):
        origList        = inList[:]
        sortedList      = self.datapointSort(inList)
        for i in xrange(0, len(origList)):
            if origList[i] != sortedList[i]:
                return False
        return True

    def findSplitPoints(self):
        # Note:  max metrictypeid:  db.metricType.find({}, { '_id':0, 'metrictypeid': 1}).sort({'metrictypeid':-1}).limit(1), result: 999000364999, 12 digits.
        totalNum = 999999999999   # max is: 999000364999  which is 999,999,999,999
        numParts = self.numProcesses
        points = [i for i in range(0, totalNum, (totalNum / numParts))]
        points.append(totalNum)
        out = []
        for i in range(0, len(points)-1):
            start = points[i]
            end   = points[i+1] - 1
            print "start =%s, end=%s" % (start, end)
            out.append([start, end])
        self.splitPoints = out

    def main(self):
        print "Starting ReconSplitter!"
        self.getOptions()
        self.openConnection()
        self.findSplitPoints()
        plist = []
        try:
            for pnum in range(0, self.numProcesses):
                p = Process(target=self.findOversizedMetricValueRecs, args=(pnum, ))
                p.start()
                plist.append(p)
            while 1:
                isAliveList = [p.is_alive() for p in plist]
                if not True in isAliveList:
                    break
                time.sleep(10)
        except KeyboardInterrupt:
            self.logger.warning("Caught keyboard interrupt, exiting.")
        except AllDoneException:
            self.logger.warning("Caught AllDoneException, Exiting normally.")
        except:
            self.logger.warning("Caught Exception, exiting: %s" % (traceback.format_exc()))
        for p in plist:
            p.terminate()
        self.closeConnection()

    def printTimeStamps(self):
        print '---------------------------------------------------------------'
        print '-- TIMESTAMPS'
        res = self.db.metricValue.find().sort("lastupdatetime", 1)
        res = res.limit(res.count()-3)
        for rec in res:
            vd = rec['vals']
            print '-- ', [v[1] for v in vd]
        print '---------------------------------------------------------------'

###############################################################################

class TestReconSplitter(unittest.TestCase):

    dbname          = "unittest_ReconSplitter"
    mongo_server    = 'graphdb301p.dev.ch3.s.com'
    mongo_port      = 40000
    db              = None
    metricValue     = None

    def test_trivial(self):
        pass

    def test_initReconSplitterClass(self):
        rs = ReconSplitter()
    
    

###############################################################################

if __name__ == '__main__':
    
    rs = ReconSplitter()
    rs.main()

###############################################################################
###############################################################################
###############################################################################
###############################################################################
###############################################################################

