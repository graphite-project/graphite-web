import sys
import os
import time
import traceback
import unittest
import urllib2
import json
from pprint import pformat

print "Name is: %s" % (__name__)

webappDir = '/opt/graphite/webapp'
sys.path.insert(0, webappDir)
DCM_ROOT = '/opt/recon/dcm'
sys.path.insert(0, DCM_ROOT)

from mods.metricValue import MetricValue
from mods.dataNormalizer import DataNormalizer
from mods.metricValuePool import MetricValuePool
from mods.memcachePool import MemcachePool
from dcm.common.util import mc_hour_encode, mc_hour_decode, mc_b64_encode, mc_b64_decode, mc_hour_start

###############################################################################
# below if main logic allows nosetests.

if False:  #__name__ in [ "__main__", "graphite.readers"]:
    from mods.mockLogger import MockLogger
    log = MockLogger()
    class MockReader(object): pass
    class MemcacheMongoReader(object): 
        def __init__(self, mvobj, mtobj, query):
            pass
            
    class MockBranchNode(object):
        def __init__(self, name):
            self.name = name
            self.is_leaf = False
    BranchNode = MockBranchNode

    class MockLeafNode(object):
        def __init__(self, name, reader, avoidIntervals=False):
            self.path = name
            self.reader = reader
            self.avoidIntervals = avoidIntervals
            self.is_leaf = True
        def __repr__(self):
            return "MockLeafNode Instance w/ Path: %s" % (self.path)
    LeafNode = MockLeafNode

    class MockQuery(object):  
        def __init__(self, qstring=""):
            self.pattern = qstring

    class MockMongoFinder(object):
        def find_nodes(self, query):
            mn1 = MockBranchNode('abc')
            mn1.path = 'abc'
            mn1.is_leaf = False
            return [mn1]
else:
    # if __name__ != "__main__": 
    from graphite.node import LeafNode, BranchNode
    from graphite.intervals import Interval, IntervalSet
    from graphite.carbonlink import CarbonLink
    from graphite.logger import log
    from django.conf import settings

class MockReader(object): 
    pass

try:
  import whisper
except ImportError:
  whisper = False

try:
  import rrdtool
except ImportError:
  rrdtool = False

try:
  import gzip
except ImportError:
  gzip = False


###############################################################################


class MemcacheMongoReader(object):
    supported = True
    
    mcPool = MemcachePool(logger=log)
    
    def __init__(self, mvObj=None, mcDataStore=None, mname=None):
        # log.info("MemcacheMongoReader.__init__() called.")
        try:
            #assert query, "need to provide query."
            self.mvObj          = mvObj
            try:
                self.mtObj      = mvObj.metricType
            except:
                self.mtObj      = None
            #self.query          = query
            self.metricName     = mname
            self.mcDataStore    = self.mcPool.getConnection(logger=log)
            # self.mcDataStore    = mcDataStore
            # log.info("MemcacheMongoReader.init(): mname=%s." % (self.metricName))
        except:
            log.info("error in MemcacheMongoReader.__init__(): %s" % (traceback.format_exc()))
        self.mvTsVals = []
        self.mcTsVals = []
        self.ceresTsVals = []
        self.saveMv2McDelay = -1
        self.normalizedMcTsData = None
        self.useInterval = None
        # log.info("MemcacheMongoReader.__init__() ending.")

    def __del__(self):
        self.mcPool.releaseConnection(self.mcDataStore)

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
        
    

class TestMemcacheMongoReader(unittest.TestCase):
    
    def test_trivial(self):
        return True
    
    def test_instantiate(self):
        mmr = MemcacheMongoReader(query=MockQuery("a.b.c"))  
   
    def test_getHourslistFromTimeRange(self):
        mmr = MemcacheMongoReader(query=MockQuery("a.b.c"))  
        stime = time.strptime("130802053001", "%y%m%d%H%M%S")
        st_epoc = time.mktime(stime)
        print "stime: %s" % (time.asctime(stime))
        etime = time.strptime("130803063001", "%y%m%d%H%M%S")
        et_epoc = time.mktime(etime)
        print "etime: %s" % (time.asctime(etime))
        print "st=%d, et=%d." % (st_epoc, et_epoc)
        res = mmr.getHoursListFromTimeRange(st_epoc, et_epoc)
        print "res: %s" % (res)
        
    def test_getHoursListFromTimeRange(self):
        mmr = MemcacheMongoReader(query=MockQuery("a.b.c"))  
        stime = time.mktime(time.strptime("130910053001", "%y%m%d%H%M%S"))
        etime = time.mktime(time.strptime("130911053001", "%y%m%d%H%M%S"))
        print "st=%d, et=%d." % (stime, etime)
        mmr.metricName = 'ch3.servers.graphts301p_prod_ch3_s_com.vmstats.cpuUsageKernel'
        from mods.memcacheDataStore import MemcacheDataStore
        mmr.mcDataStore = MemcacheDataStore()
        mmr.retrieveDataFromMemcache(stime, etime)
        


class FetchInProgress(object):
  def __init__(self, wait_callback):
    self.wait_callback = wait_callback

  def waitForResults(self):
    return self.wait_callback()


class MultiReader(object):
  __slots__ = ('nodes',)

  def __init__(self, nodes):
    self.nodes = nodes

  def get_intervals(self, startTime=None, endTime=None):
    interval_sets = []
    for node in self.nodes:
      interval_sets.extend( node.intervals.intervals )
    return IntervalSet( sorted(interval_sets) )

  def fetch(self, startTime, endTime):
    # Start the fetch on each node
    results = [ n.fetch(startTime, endTime) for n in self.nodes ]

    # Wait for any asynchronous operations to complete
    for i, result in enumerate(results):
      if isinstance(result, FetchInProgress):
        try:
          results[i] = result.waitForResults()
        except:
          log.exception("Failed to complete subfetch")
          results[i] = None

    results = [r for r in results if r is not None]
    if not results:
      raise Exception("All sub-fetches failed")

    return reduce(self.merge, results)

  def merge(self, results1, results2):
    # Ensure results1 is finer than results2
    if results1[0][2] > results2[0][2]:
      results1, results2 = results2, results1

    time_info1, values1 = results1
    time_info2, values2 = results2
    start1, end1, step1 = time_info1
    start2, end2, step2 = time_info2

    step   = step1                # finest step
    start  = min(start1, start2)  # earliest start
    end    = max(end1, end2)      # latest end
    time_info = (start, end, step)
    values = []

    t = start
    while t < end:
      # Look for the finer precision value first if available
      i1 = (t - start1) / step1

      if len(values1) > i1:
        v1 = values1[i1]
      else:
        v1 = None

      if v1 is None:
        i2 = (t - start2) / step2

        if len(values2) > i2:
          v2 = values2[i2]
        else:
          v2 = None

        values.append(v2)
      else:
        values.append(v1)

      t += step

    return (time_info, values)


class CeresReader(object):
  __slots__ = ('ceres_node', 'real_metric_path')
  supported = True

  def __init__(self, ceres_node, real_metric_path):
    self.ceres_node = ceres_node
    self.real_metric_path = real_metric_path

  def get_intervals(self, startTime=None, endTime=None):
    intervals = []
    for info in self.ceres_node.slice_info:
      (start, end, step) = info
      intervals.append( Interval(start, end) )

    return IntervalSet(intervals)

  def fetch(self, startTime, endTime):
    data = self.ceres_node.read(startTime, endTime)
    time_info = (data.startTime, data.endTime, data.timeStep)
    values = list(data.values)

    # Merge in data from carbon's cache
    try:
      cached_datapoints = CarbonLink.query(self.real_metric_path)
    except:
      log.exception("Failed CarbonLink query '%s'" % self.real_metric_path)
      cached_datapoints = []

    for (timestamp, value) in cached_datapoints:
      interval = timestamp - (timestamp % data.timeStep)

      try:
        i = int(interval - data.startTime) / data.timeStep
        values[i] = value
      except:
        pass

    return (time_info, values)


class WhisperReader(object):
  __slots__ = ('fs_path', 'real_metric_path')
  supported = bool(whisper)

  def __init__(self, fs_path, real_metric_path):
    self.fs_path = fs_path
    self.real_metric_path = real_metric_path

  def get_intervals(self, startTime=None, endTime=None):
    start = time.time() - whisper.info(self.fs_path)['maxRetention']
    end = max( os.stat(self.fs_path).st_mtime, start )
    return IntervalSet( [Interval(start, end)] )

  def fetch(self, startTime, endTime):
    data = whisper.fetch(self.fs_path, startTime, endTime)
    if not data:
      return None

    time_info, values = data
    (start,end,step) = time_info

    # Merge in data from carbon's cache
    try:
      cached_datapoints = CarbonLink.query(self.real_metric_path)
    except:
      log.exception("Failed CarbonLink query '%s'" % self.real_metric_path)
      cached_datapoints = []

    for (timestamp, value) in cached_datapoints:
      interval = timestamp - (timestamp % step)

      try:
        i = int(interval - start) / step
        values[i] = value
      except:
        pass

    return (time_info, values)


class GzippedWhisperReader(WhisperReader):
  supported = bool(whisper and gzip)

  def get_intervals(self, startTime=None, endTime=None):
    fh = gzip.GzipFile(self.fs_path, 'rb')
    try:
      info = whisper.__readHeader(fh) # evil, but necessary.
    finally:
      fh.close()

    start = time.time() - info['maxRetention']
    end = max( os.stat(self.fs_path).st_mtime, start )
    return IntervalSet( [Interval(start, end)] )

  def fetch(self, startTime, endTime):
    fh = gzip.GzipFile(self.fs_path, 'rb')
    try:
      return whisper.file_fetch(fh, startTime, endTime)
    finally:
      fh.close()


class RRDReader:
  supported = bool(rrdtool)

  def __init__(self, fs_path, datasource_name):
    self.fs_path = fs_path
    self.datasource_name = datasource_name

  def get_intervals(self, startTime=None, endTime=None):
    start = time.time() - self.get_retention(self.fs_path)
    end = max( os.stat(self.fs_path).st_mtime, start )
    return IntervalSet( [Interval(start, end)] )

  def fetch(self, startTime, endTime):
    startString = time.strftime("%H:%M_%Y%m%d+%Ss", time.localtime(startTime))
    endString = time.strftime("%H:%M_%Y%m%d+%Ss", time.localtime(endTime))

    if settings.FLUSHRRDCACHED:
      rrdtool.flushcached(self.fs_path, '--daemon', settings.FLUSHRRDCACHED)

    (timeInfo, columns, rows) = rrdtool.fetch(self.fs_path,'AVERAGE','-s' + startString,'-e' + endString)
    colIndex = list(columns).index(self.datasource_name)
    rows.pop() #chop off the latest value because RRD returns crazy last values sometimes
    values = (row[colIndex] for row in rows)

    return (timeInfo, values)

  @staticmethod
  def get_datasources(fs_path):
    info = rrdtool.info(fs_path)

    if 'ds' in info:
      return [datasource_name for datasource_name in info['ds']]
    else:
      ds_keys = [ key for key in info if key.startswith('ds[') ]
      datasources = set( key[3:].split(']')[0] for key in ds_keys )
      return list(datasources)

  @staticmethod
  def get_retention(fs_path):
    info = rrdtool.info(fs_path)
    if 'rra' in info:
      rras = info['rra']
    else:
      # Ugh, I like the old python-rrdtool api better..
      rra_count = max([ int(key[4]) for key in info if key.startswith('rra[') ]) + 1
      rras = [{}] * rra_count
      for i in range(rra_count):
        rras[i]['pdp_per_row'] = info['rra[%d].pdp_per_row' % i]
        rras[i]['rows'] = info['rra[%d].rows' % i]

    retention_points = 0
    for rra in rras:
      points = rra['pdp_per_row'] * rra['rows']
      if points > retention_points:
        retention_points = points

    return  retention_points * info['step']


###############################################################################


if __name__ == "__main__": 
    unittest.main()


###############################################################################
###############################################################################
###############################################################################
###############################################################################
