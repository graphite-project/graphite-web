import sys
import os
import time
import traceback
import unittest
import urllib2
import json
from pprint import pformat

from graphite.backends.mongodb.metricValue import MetricValue
from graphite.backends.mongodb.dataNormalizer import DataNormalizer
from graphite.node import LeafNode, BranchNode
from graphite.intervals import Interval, IntervalSet
from graphite.carbonlink import CarbonLink
from graphite.logger import log
from django.conf import settings

###############################################################################


class MongodbReader(object):

    supported = True

    def __init__(self, mvObj=None, mname=None):
        log.info("MemcacheMongoReader.__init__() called.")
        try:
            self.mvObj          = mvObj
            try:
                self.mtObj      = mvObj.metricType
            except:
                self.mtObj      = None
            self.metricName     = mname
        except:
            log.info("error in MemcacheMongoReader.__init__(): %s" % (traceback.format_exc()))
        self.mvTsVals = []
        self.mcTsVals = []
        self.ceresTsVals = []
        self.saveMv2McDelay = -1
        self.normalizedMcTsData = None
        self.useInterval = None
        # log.info("MemcacheMongoReader.__init__() ending.")

    def dataSufficient(self, inData, startTime, endTime):
        # return False
        reason = ""
        if not inData:
            reason = "nodata"
            return False
        valsPerHour = {}
        latestTs = 0
        for ts, val in inData:
            th = mc_hour_start(ts)
            if not valsPerHour.get(th):
                valsPerHour[th] = 0
            valsPerHour[th] += 1
            if ts > latestTs:
                latestTs = ts
        haveLastMinutes = False
        if latestTs > (endTime - 300):
            haveLastMinutes = True
        if not haveLastMinutes:
            reason = "nolastmin, vals: %s" % (len([x for x in inData if x is not None]))
            gotAll = False
        else:
            allHours = {}
            for h in self.mcDataStore.getHourStarts(startTime, endTime):
                allHours[h] = 1
            gotAll = True
            endHour = mc_hour_start(endTime)
            for key in allHours.keys():
                vph = valsPerHour.get(key, 0)
                if key == endHour:
                    if not vph:
                        reason = "novph"
                        gotAll = False
                        break
                else:
                    if vph < 40:  # want at least 2/3 of the data in any hour, prevents big gaps.
                        reason = "vph40"
                        gotAll = False
                        break
        if 0 and not gotAll:
            log.info("gotall reason: %s" % (reason))
        # log.info("hours: %s, allHours: %s, retval: %s" % (hours, allHours, gotAll))
        # hours   : {1381950000: 1, 1381953600: 1, 1381957200: 1}, 
        # allHours: {1381950000: 1, 1381953600: 1, 1381957200: 1}
        return gotAll
        
    def get_intervals(self, startTime=None, endTime=None):
        return IntervalSet([Interval(float("-inf"), float("inf"))])

    def deduplicateData(self, inData):
        ded = {}
        for ts, val in inData:
            ts = int(ts)
            ded[ts] = val
        out = []
        for k, v in ded.items():
            out.append((k, v))
        return out

    def getData(self, startTime, endTime):
        clockitStart = time.time()
        retIntervals = []
        accumulatedData = []
        timings = [time.time()]   #0
        haveSufficient = False

        try:
            if 1:
                #self.retrieveDataFromMemcacheWithUrllib(startTime, endTime)
                self.retrieveDataFromMemcache(startTime, endTime)
                timings.append(time.time())  #1
                accumulatedData.extend(self.mcTsVals)
                haveSufficient = self.dataSufficient(accumulatedData, startTime, endTime)
        except:
            haveSufficient = False
            log.info("TB: retrieveDataFromMemcache(st=%s, et=%s): err: %s" % (
                startTime, endTime, traceback.format_exc()))

        #log.info("got from memcache, haveSufficient=%s" % haveSufficient)
        timings.append(time.time())        #2
        try:
            if 1 and not haveSufficient:
                self.retrieveDataFromCeres(startTime, endTime)
                timings.append(time.time())  #3
                accumulatedData.extend(self.ceresTsVals)
                haveSufficient = self.dataSufficient(accumulatedData, startTime, endTime)
        except:
            log.info("TB: retrieveDataFromCeres(st=%s, et=%s): err: %s" % (startTime, endTime, traceback.format_exc()))
        
        timings.append(time.time())  #4
        try:
            if 0 and not haveSufficient:
                self.retrieveDataFromMongo(startTime, endTime)
                accumulatedData.extend(self.mvTsVals)
                haveSufficient = self.dataSufficient(accumulatedData, startTime, endTime)
        except:
            log.info("TB: retrieveDataFromMongo(st=%s, et=%s): err: %s" % (
                startTime, endTime, traceback.format_exc()))

        timings.append(time.time())  #5
        ddArray = []
        minTs = float("inf")
        maxTs = 0
        for ts, val in accumulatedData:
            if ts > endTime:    continue
            if ts < startTime:  continue
            if ts > maxTs:  maxTs = ts
            if ts < minTs:  minTs = ts
            ddArray.append((ts, val))
        self.allData = ddArray
        if not self.allData:
            return IntervalSet([])
        minTs = int(minTs)
        maxTs = int(maxTs)
        if 1:
            outstr = "MemcacheMongoReader.get_intervals() ending, gmd %5s took %.08f seconds (mc %d, c %d, mv %d, sd: %.09f mcd: %.04f) path %s." % (
                haveSufficient, time.time() - clockitStart, 
                len(self.mcTsVals), len(self.ceresTsVals), len(self.mvTsVals), 
                self.saveMv2McDelay, timings[1] - timings[0],
                self.metricName)
            log.info(outstr)
        #timings.append(time.time())    #6
        self.saveMv2McDelay = 0
        # log.info("getData(): timings:  %s" % (timings))
        return IntervalSet([Interval(minTs, maxTs)])

    def retrieveDataFromCeres(self, startTime=None, endTime=None):
        #graphite.prod.ch3.s.com/render?from=-2weeks&target=applications.graphite.graphite0*p_prod_ch4_s_com.*&format=json
        url2use = "http://graphite.prod.ch3.s.com/render?%s&%s&target=%s&format=json"
        fromTime    = startTime and 'from=%s' % (startTime ) or ""
        toTime      = endTime   and 'to=%s'   % (endTime   ) or ""
        mname = self.metricName
        mname = mname.lstrip('ch3.').lstrip('ch4.')
        url2use = url2use % (fromTime, toTime, mname)
        response = urllib2.urlopen(url2use)
        data = json.load(response)
        # log.info("Retrieved Ceres, path: %s, data: %s" % (url2use, data))
        # example: [{"target": "applications.graphite.graphite01p_prod_ch4_s_com.avgResponseTime", "datapoints": [[1380144180000, 0.077055056962025373],
        if not data:
            return
        # only want first array elem, data[0]
        d = data[0]
        if type(d) != dict:
            return
        dpList = d.get('datapoints', [])
        ceresTsVals = []
        for ts, val in dpList:
            tsStr = ts and str(int(ts))
            tsStr = tsStr and tsStr[0:10]
            ts = int(tsStr) 
            self.ceresTsVals.append((ts, val))
        saveStart = time.time()
        self.saveRetrievedDataToMemcache(self.ceresTsVals)
        self.saveMv2McDelay = time.time() - saveStart
        return

    def retrieveDataFromMemcacheWithUrllib(self, startTime=None, endTime=None):
        #graphite.prod.ch3.s.com/render?from=-2weeks&target=applications.graphite.graphite0*p_prod_ch4_s_com.*&format=json
        url2use = "http://graphwww301p.prod.ch3.s.com:42334?name=%s%s%s&format=json"
        fromTime    = startTime and '&starttime=%s' % (startTime ) or ""
        toTime      = endTime   and '&endtime=%s'   % (endTime   ) or ""
        mname = self.metricName
        #mname = mname.lstrip('ch3.').lstrip('ch4.')
        url2use = url2use % (mname, fromTime, toTime)
        log.info("url constructed: %s" % (url2use))
        t0 = time.time()
        response = urllib2.urlopen(url2use)
        t1 = time.time()
        data = json.load(response)
        log.info("McUrlTime: %04.04f, dpoints %s" % (t1 - t0, len(data)))
        #log.info("Retrieved Ceres, path: %s, data: %s" % (url2use, data))
        # example: [{"target": "applications.graphite.graphite01p_prod_ch4_s_com.avgResponseTime", "datapoints": [[1380144180000, 0.077055056962025373],
        if not data:
            return
        # only want first array elem, data[0]
        d = data[0]
        if type(d) != dict:
            return
        dpList = d.get('datapoints', [])
        mcTsVals = []
        for ts, val in dpList:
            tsStr = ts and str(int(ts))
            tsStr = tsStr and tsStr[0:10]
            ts = int(tsStr) 
            self.mcTsVals.append((ts, val))
        return

    def saveRetrievedDataToMemcache(self, tsVals):
        if 0:
            # DEBUGGING!
            return
        if not tsVals:
            return
        errs    = 0
        badTs   = 0
        t0 = time.time()
        existing = {}
        for ts, val in self.mcTsVals:
            existing[ts] = 1
        data2save = []
        for ts, val in tsVals:
            if (ts is None) or (val is None):
                continue
            try:
                if not (1285865567 < ts < 1601484767):  # years 2010 to 2020.
                    badTs += 1
                    continue
                if existing.get(ts):
                    continue
                data2save.append((ts, val))
            except:
                log.info("Error saving MV data to MC. %s" % (traceback.format_exc()))
                errs += 1
        # have data
        t1 = time.time()
        try:
            cdicts = []
            cdicts = self.mcDataStore.accumulateMetricData(self.metricName, data2save, cdicts)
            self.mcDataStore.flushAccumulatedMetricData(cdicts=cdicts)
        except:
            log.info("gmd Error saving MV data to MC. %s" % (traceback.format_exc()))
            errs += 1
        e0 = time.time() - t0
        e1 = t1 - t0
        # log.info("saveRetrievedDataToMemcache(): gmd Saved %d vals into Memcache w/ %d bad ts, %d errors, path: %s, e0:%s, e1: %s" % (len(data2save), badTs, errs, self.metricName, e0, e1))
        return

    def retrieveDataFromMongo(self, startTime=None, endTime=None):
        clockitStart = time.time()
        # log.info("MemcacheMongoReader.get_intervals() called for name %s at %s" % (self.metricName, clockitStart))
        try:
            mtid = self.mvObj.getMtidByName(self.metricName)
            if not mtid:
                log.info("---->  No MTID for name: %s" % (self.metricName))
                return
            allMvDocs = self.mvObj.getByMetricTypeId(mtid, startTime=startTime, endTime=endTime)
            allVals = []
            for doc in allMvDocs:
                allVals.extend(doc['vals'])
            # put only right data, reorder to  (TS, Val)-ordered tuples.
            if startTime and endTime:
                self.mvTsVals = [(x[1], x[0]) for x in allVals if (x[1] >= startTime) and (x[1] <= endTime)]  
            elif startTime:
                self.mvTsVals = [(x[1], x[0]) for x in allVals if (x[1] >= startTime)]  
            elif endTime:
                self.mvTsVals = [(x[1], x[0]) for x in allVals if (x[1] <= endTime)]    
            else:
                self.mvTsVals = [(x[1], x[0]) for x in allVals if (x[1] >= startTime) and (x[1] <= endTime)]
            self.mvTsVals.sort()
            counter = errs = 0
            saveStart = time.time()
            self.saveRetrievedDataToMemcache(self.mvTsVals)
            self.saveMv2McDelay = time.time() - saveStart
            if self.mvTsVals:
                # log.info("Saved %d vals from Mongo into Memcache w/ %d errors, path: %s" % (counter, errs, self.metricName))
                pass
            # log.info("RETRIEVED: %d vals of MetricValue data." % (len(self.mvTsVals)))
        except:
            msg = traceback.format_exc()
            log.info("getDataFromMongo(): ERROR, tb=%s" % (msg))
        return

    def getHoursListFromTimeRange(self, startTime, endTime):
        hoursList = []
        endHour = mc_hour_encode(t=endTime)
        thisTime = startTime
        while True: 
            thisHour = mc_hour_encode(thisTime)
            hoursList.append(thisHour)
            if thisHour >= endHour:
                break            
            thisTime += 3600  # one hour
        return hoursList
        
    def retrieveDataFromMemcache(self, startTime=None, endTime=None):
        t0 = time.time()
        st = startTime or time.time() - (60 * 60 * 2)
        et = endTime   or time.time()
        try:
            allVals = self.mcDataStore.getMetricsForTimeRange(self.metricName, st, et)
        except:
            tb = traceback.format_exc()
            log.info("retrieveDataFromMemcache(): Exception: %s st:%s et:%s, used st:%s et:%s tb:%s" % (
                self.metricName, startTime, endTime, st, et, tb))
            self.mcTsVals = []
            return
        # log.info("RETRIEVED: %d vals of MEMCACHE data: %s took %s seconds" % (len(allVals), self.metricName, time.time() - t0))
        self.mcTsVals = allVals
        
        return 

    def fetch(self, startTime, endTime):
        #log.info("MemcacheMongoReader.fetch() called w/ start=%s, end=%s, metricName=%s" % (startTime, endTime, self.metricName))
        #self.get_intervals(startTime, endTime)  # retrieves all data.
        self.getData(startTime, endTime)
        try:
            wantDatapoints = self.allData  
            # log.info("MemcacheMongoReader.fetch(): first bunch of WantedData: %s" % (wantDatapoints[0:10]))
            if 1:
                # log.info("MemcacheMongoReader.fetch(): calling data normalizer with %d datapoints." % (len(wantDatapoints)))
                dn = DataNormalizer(wantDatapoints)
                dn.useInterval = 60
                (ts, data) = dn.normalize(start=startTime, end=endTime)
                # log.info("MemcacheMongoReader.fetch(): Data normalizer returned w/ %d datapoints, ts: %s." % (len(data), str(ts)))
                numActualElems  = len(data)
                # ts returned is: (startTime, endTime, med)
                if not ts[2]:
                    # going to be division by zero; no endTime.
                    #log.info("MemcacheMongoReader.fetch(): No End time returned from normalizer, st=%s, et=%s, mname=%s" % (startTime, endTime, self.metricName))
                    return None
                numShould       = (endTime - startTime)/ ts[2]
                numShould2      = (ts[1] - ts[0])/ ts[2]
                #log.info("MemcacheMongoReader.fetch(): st=%s, et=%s, numElems=%s, numshould=%s, numShould2=%s, returning ts=%s" % (startTime, endTime, numActualElems, numShould, numShould2, ts))
                assert (numActualElems == numShould2), "Should have %d elements in data array, but instead have: %s" % (numShould2, numActualElems)
                #log.info("MemcacheMongoReader.fetch(): data=%s" % (data))
                return (ts, data)

            if 0: #else:
                # testing only:
                time_info = (startTime, endTime, 60)
                numElems = (endTime - startTime) / 60
                outVals = range(0, numElems)
                #outVals = [ 3, 4, 5, 6, 7, 8, 9, 10, 3, 4, 5, 6, 7, 8, 9, 10, 3, 4, 5, 6, 7, 8, 9, 10, 3, 4, 5, 6, 7, 8, 9, 10 ]
                log.info("MemcacheMongoReader.fetch(): len(outvals) = %s, numElems = %s" % (len(outVals), numElems))
                return (time_info, outVals)
        except:
            log.info("MemcacheMongoReader.fetch(): Exception.")
            msg = traceback.format_exc()
            log.info("EXCEPTION: MemcacheMongoReader.fetch(): Called w/ start=%s, end=%s.  TB: %s" % (startTime, endTime, msg))
        
    
###############################################################################
###############################################################################
###############################################################################
###############################################################################
