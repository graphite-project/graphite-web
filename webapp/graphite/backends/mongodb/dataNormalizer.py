
###############################################################################

import unittest
import traceback
import time
from mockLogger import MockLogger
from pprint import pformat
import math

###############################################################################

class DataNormalizer(object):
    
    def __init__(self, inputData, useInterval=None):
        self.inputData = inputData
        self.logger = MockLogger()
        self.verbose = False
        self.useInterval = useInterval
        self.doStepRound = False

    def median(self, alist):
        if len(alist) <= 1:
            return 60       
        retval = 60
        try:
            alist = [y for y in alist if ((y is not None) and (not math.isnan(y)))]            
            srtd = sorted(alist) # returns a sorted copy
            mid = len(alist)/2   # remember that integer division truncates
            if len(alist) % 2 == 0:  # take the avg of middle two
                return (srtd[mid-1] + srtd[mid]) / 2.0
            retval = srtd[mid]
        except:
            tb = "".join(traceback.format_exc().splitlines())
            self.logger.warning("dataNormalizer.median(): TB %s, indata: %s" % (tb, alist))
            retval = None                                                      
        self.logger.warning("dataNormalizer.median(): returning %s" % (retval))
        return retval

    def mean(self, inlist):
        if not inlist:
            return None
        inlist = [y for y in inlist if ((y is not None) and (not math.isnan(y)))]            
        return float(sum(inlist))/len(inlist)        

    def stepRound(self, x, base=5):
        if x is None:
            return None
        return int(base * round(float(x)/base))

    def findMedianGap(self, inlist):
        self.logger.info("DataNormalizer.findMedianGap() called with %s points of input data." % (len(self.inputData)))
        self.logger.debug("DataNormalizer.findMedianGap() input data: %s." % (self.inputData))
        if not len(inlist):
            return 0
        #if self.useInterval:
        #    return self.useInterval        
        # gaps imply timestamps.  Timestamps should be made to be integers.
        lastPoint = None
        gaplist = []
        for raw in inlist:
            p = int(raw)
            if not lastPoint:
                lastPoint = p
                continue
            gap = p - lastPoint
            if gap == 0:
                continue
            gaplist.append(gap)
            lastPoint = p
        self.logger.info("DataNormalizer.findMedianGap() gaplist: %s." % (gaplist))
        med = self.median(gaplist)
        b4med = med
        if med is None:
            return None
        if self.doStepRound:
            try:
                med = self.stepRound(med)
            except:
                tb = traceback.format_exc()
                self.logger.info("tried to get stepRound(%s). tb: %s" % (pformat(med), tb))
        if med == 0:
            med = 1
        self.logger.info("DataNormalizer.findMedianGap() median gap was %s, returning rounded: %s." % (b4med, med))
        return med

    def consolidateData(self, buckets):
        outData = []
        #print "consolidateData(): buckets %s" % (buckets)
        sortedBucketKeys = sorted(buckets.keys())
        for k in sortedBucketKeys:
            itemsArray = buckets[k]
            #print "buckets[%s] : %s" % (k, itemsArray)
            if   (len(itemsArray) == 0):
                outData.append((k, None))
            elif (len(itemsArray) == 1):
                outData.append((k, itemsArray[0][1]))
            else:
                # consolidate values:  use average for now.
                valsList = [x[1] for x in itemsArray]
                avg = self.mean(valsList)
                outData.append((k, avg))
        #print "outdata: %s" % (outData)
        return outData

    def checkIn(self, start, instr):
        if self.verbose:
            elapsed = time.time() - start
            self.logger.info("Elapsed: %06.06f at: %s" % (elapsed, instr))

    def normalize(self, start=None, end=None):
        ''' data presumed to be (ts, val) array. '''
        noDataTuple = ((0, 0, None), [])
        if not self.inputData:
            return noDataTuple 
        
        clockStart = time.time()
        stReadable = str(time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start)))
        etReadable = str(time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end)))
        # self.logger.info("DataNormalizer.normalize() called w/ st=%s, et=%s, st.r=%s, et.r=%s" % (start, end, stReadable, etReadable))
        
        # remove extraneous inputData before messing with it.
        if start and end:
            self.inputData = [x for x in self.inputData if (x[0] >= start) and (x[0] <= end)]
        elif start:
            self.inputData = [x for x in self.inputData if (x[0] >= start)]
        elif end:
            self.inputData = [x for x in self.inputData if (x[0] <= end)]
            
        # sort data by time: [ (ts1, val1), (ts2, val2), ...]
        self.inputData.sort()  # default python sort uses first elem of tuple.
        self.checkIn(clockStart, 1)
        med         = self.findMedianGap([x[0] for x in self.inputData if x[0] is not None])
        if not med:
            return noDataTuple 
        self.checkIn(clockStart, 2)
        buckets     = self.putInBuckets(self.inputData, med)
        self.checkIn(clockStart, 3)
        self.addEmptyBucketsForRange(buckets, start, end, med)
        self.checkIn(clockStart, 4)
        if not buckets:
            self.logger.info("DataNormalizer.normalize():  No buckets, returning empty.")
            return noDataTuple 
        outData = self.consolidateData(buckets)
        self.checkIn(clockStart, 5)
        sortedBucketKeys = sorted(buckets.keys())
        self.checkIn(clockStart, 6)
        startTime   = sortedBucketKeys[0]
        endTime     = sortedBucketKeys[-1]
        time_info = (startTime, endTime+med, med)
        numElems1 = ((endTime - startTime) / med)
        outVals = [x[1] for x in outData]  # data is [(ts,val), (ts,val), ...]
        numElems2 = len(outVals)
        elapsed = time.time() - clockStart
        #self.logger.info("DataNormalizer.normalize(): Returning (%06.06f secs), #elems: %s, outVals len: %s" % (elapsed, numElems1, numElems2))
        #self.logger.info("DataNormalizer.normalize(): Output values: %s" % (outVals))
        stReadable = str(time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(startTime)))
        etReadable = str(time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(endTime)))
        #self.logger.info("DataNormalizer.normalize() returning w/ st=%s, et=%s, st.r=%s, et.r=%s" % (startTime, endTime, stReadable, etReadable))
        return (time_info, outVals)        

    def addEmptyBucketsForRange(self, buckets, startTime, endTime, med):

        # print "adding empty buckets, st=%s, et=%s, med=%s" % (startTime, endTime, med)
        sortedBucketKeys = sorted(buckets.keys())
        if not len(sortedBucketKeys):
            # nothing to do 
            return

        if startTime is not None:
            firstReal   = sortedBucketKeys[0]
            difftime    = firstReal - startTime
            # print "firstreal=%s, difftime = %s" % (firstReal, difftime)
            if difftime > 0:
                num2add = int(difftime) / int(med)
                # print "num2add: %s" % (num2add)
                for n in range(1, num2add+1):
                    newTime = firstReal - (n * med)
                    #print "Adding newtime: %s" % (newTime)
                    buckets[newTime] = []             

        if endTime is not None:
            lastReal    = sortedBucketKeys[-1]
            difftime    = endTime - lastReal
            # print "lastreal=%s, difftime = %s" % (lastReal, difftime)
            if difftime > 0:
                num2add = int(difftime) / int(med)
                # print "num2add: %s" % (num2add)
                for n in range(1, num2add+1):
                    newTime = lastReal + (n * med)
                    # print "Adding newtime: %s" % (newTime)
                    buckets[newTime] = []
        
        # goal was to add to buckets, we're done.
        #print "added emptyBucketsForRange, now: buckets=%s, st=%s, et=%s, med=%s" % (buckets, startTime, endTime, med)
        return
        
    def putInBuckets(self, indata, med):
        # indata: array of metricvalue vals, e.g., [ (value, timestamp), (value, timestamp), ... ] 
        if not indata:
            #print "DataNormalizer.putInBuckets(): warning: inputData empty."
            return {}
        # self.logger.info("DataNormalize.PutInBuckets() called len=%s, med=%s" % (len(indata), med))
        med = int(med)
        if med <= 0:
            med = 1
        firstTs = indata[0][0]  
        aStartval = int(firstTs - (med / 2))  # start array half a median before the first time.
        lastTs  = indata[-1][0]
        btimes  = range(int(firstTs - (med / 2)), int(lastTs + med -1), int(med))
        timeArray = [[] for x in range(0, len(btimes))]
        # print "Time array, unfilled: %s" % (timeArray)
        for elem in indata:
            ts = elem[0]
            offset = int((ts - aStartval) / med)
            # print "inserting elem %s at offset %s" % (elem, offset)
            timeArray[offset].append(elem) 
        buckets = {}
        counter = 0
        # print "Time array,   filled: %s" % (timeArray)
        for i in range(aStartval, aStartval + (med * len(timeArray)), med):  
            buckets[i] = timeArray[counter]
            counter += 1
        if 0:  # print it out for digestion in debug mode only.
            for k, v in buckets.items():
                print "DataNormalizer.putInBuckets(): buckets[%s] : %s" % (k, v)
        # return value should be dict object, key=TS, val=[ (ts,val), (ts,val), ...]
        return buckets
            
###############################################################################

class TestDataNormalizer(unittest.TestCase):
    
    ''' DATA IS PRESUMED TO BE  [  (TIMESTAMP, VALUE),  (TIMESTAMP, VALUE), ... ] '''

    def doNothing(self, **kwargs):
        pass

    def test_trivial(self):
        return True  
        
    def test_instantiate_empty(self):
        indata = []
        dn = DataNormalizer(indata)
        assert dn
        
    def test_medianGap_simple(self):
        print "starting instantiate minimal"
        indata = [(x, x) for x in range(10) ]
        dn = DataNormalizer(indata)
        mg = dn.findMedianGap([x[0] for x in indata])
        assert (mg == 1.0), "median gap should be 1, got %s instead." % (mg)

    def test_medianGap_majority2(self):
        ''' if there are 10 gaps of size n, and 30 gaps of size 2n, median should be 2n. '''
        indata = [(x, x) for x in range(10) ]
        indata.extend([(x*2, x) for x in range(10, 30) ])
        indata.sort() 
        print "test_medianGap_majority2(self): indata: %s" % (indata)
        dn = DataNormalizer(indata)
        mg = dn.findMedianGap([x[0] for x in indata])
        assert (mg == 2.0), "median gap should be 2, got %s instead." % (mg)
        
    def test_normalize_simple(self):
        times = [1, 3, 5, 11, 16, 18, 21, 22, 23, 27, 29, 30]
        indata = [(x, int(10*x)) for x in times]
        print "test_normalize_simple(): indata created: %s" % (indata)
        indata.sort()  # in timestamp order. 
        print "test_normalize_simple: data is: %s" % (indata)
        dn = DataNormalizer(indata)
        out = dn.normalize()
        print "have output: %s" % (pformat(out))
        assert out[0] == (0, 32, 2)
        assert out[1] == [ 10, 30, 50, None, None, 110, None, None, 160, 180, 210, 225, None, 270, 290, 300]
        
    def test_normalize_outOfOrder(self):
        times = [1, 3, 5, 24, 16, 18, 21, 22, 23, 27, 29, 30]
        indata = [(x, int(10*x)) for x in times]  # do not sort, let it figure it out.
        print "test_normalize_outOfOrder: data is: %s" % (indata)
        dn = DataNormalizer(indata)
        med   = dn.findMedianGap([x[0] for x in indata])
        assert med == 2.0, "median should b3 2, got %s instead." % (med)
        bucks = dn.putInBuckets(indata, med)
        print "have bucks : %s" % (pformat(bucks))
        assert bucks[16], "should have an element in bucket for 16, have that timestamp."
        #assert 

    def test_normalize_realisticTimes(self):
        times = [10001, 10003, 10005, 10024, 10016, 10018, 10021, 10022, 10023, 10027, 10029, 10030]
        indata = [(x, int(10*x)) for x in times]
        #indata = sorted(indata, key=lambda x: x[1])
        print "test_normalize_realisticTimes: data is: %s" % (indata)
        dn = DataNormalizer(indata)
        med   = dn.findMedianGap([x[0] for x in indata])
        assert med == 2.0, "median should b3 2, got %s instead." % (med)
        bucks = dn.putInBuckets(indata, med)
        print "have bucks : %s" % (pformat(bucks))
        assert bucks[10018.0] == [(10018, 100180)], "should have correct data, instead have: %s" % (bucks)
        assert bucks[10020.0] == [(10021, 100210)], "should have correct data, instead have: %s" % (bucks)
        assert bucks[10022.0] == [(10022, 100220), (10023, 100230)], "should have correct data, instead have: %s" % (bucks)
        assert bucks[10024.0] == [(10024, 100240)], "should have correct data, instead have: %s" % (bucks)
      
    def test_addEmptyBuckets_001(self):
        times = [100, 110, 120, 130, 140, 150, 160]
        indata = [(x, int(10*x)) for x in times]
        print "test_normalize_addEmptyBuckets001: data is: %s" % (indata)
        dn = DataNormalizer(indata)
        med = 10
        bucks = dn.putInBuckets(indata, med)
        print "ORIG   bucks : %s" % (pformat(bucks))
        dn.addEmptyBucketsForRange(bucks, 61, 181, 10)
        print "FILLED bucks : %s" % (pformat(bucks))
        assert set(bucks.keys()) == set([65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165, 175]), "should have right set of keys, instead got: %s" % (bucks.keys())
        assert bucks.get( 65) == [],     "should have gotten [],     instead got %s" % (bucks.get( 65))
        assert bucks.get( 75) == [],     "should have gotten [],     instead got %s" % (bucks.get( 75))
        assert bucks.get( 85) == [],     "should have gotten [],     instead got %s" % (bucks.get( 85))
        assert bucks.get( 95) == [(100, 1000)],     "should have gotten [],     instead got %s" % (bucks.get( 95))
        assert bucks.get(105) == [(110, 1100)], "should have gotten [(100, 1000)], instead got %s" % (bucks.get(105))
        assert bucks.get(115) == [(120, 1200)], "should have gotten [(110, 1100)], instead got %s" % (bucks.get(115))
        assert bucks.get(125) == [(130, 1300)], "should have gotten [(120, 1200)], instead got %s" % (bucks.get(125))
        assert bucks.get(135) == [(140, 1400)], "should have gotten [(130, 1300)], instead got %s" % (bucks.get(135))
        assert bucks.get(145) == [(150, 1500)], "should have gotten [(140, 1400)], instead got %s" % (bucks.get(145))
        assert bucks.get(155) == [(160, 1600)], "should have gotten [(150, 1500)], instead got %s" % (bucks.get(155))
        assert bucks.get(165) == [], "should have gotten [(160, 1600)], instead got %s" % (bucks.get(165))
        assert bucks.get(175) == [],     "should have gotten [],     instead got %s" % (bucks.get( 175))

    def test_addEmptyBuckets_002(self):
        times = [100, 110, 120, 130, 140, 150, 160]
        indata = [(x, int(10*x)) for x in times]
        print "test_normalize_addEmptyBuckets002: data is: %s" % (indata)
        dn = DataNormalizer(indata)
        med = 10
        bucks = dn.putInBuckets(indata, med)
        print "ORIG   bucks : %s" % (pformat(bucks))
        dn.addEmptyBucketsForRange(bucks, 161, 111, 10)
        print "FILLED bucks : %s" % (pformat(bucks))
        rightSet = set([95, 105, 115, 125, 135, 145, 155, 165])
        assert set(bucks.keys()) == rightSet, "should have right set of keys: %s, instead got: %s" % (sorted(rightSet), sorted(bucks.keys()))
        assert bucks.get( 95) == [(100, 1000)],     "should have gotten [],     instead got %s" % (bucks.get( 95))
        assert bucks.get(105) == [(110, 1100)], "should have gotten [(100, 1000)], instead got %s" % (bucks.get(105))
        assert bucks.get(115) == [(120, 1200)], "should have gotten [(110, 1100)], instead got %s" % (bucks.get(115))
        assert bucks.get(125) == [(130, 1300)], "should have gotten [(120, 1200)], instead got %s" % (bucks.get(125))
        assert bucks.get(135) == [(140, 1400)], "should have gotten [(130, 1300)], instead got %s" % (bucks.get(135))
        assert bucks.get(145) == [(150, 1500)], "should have gotten [(140, 1400)], instead got %s" % (bucks.get(145))
        assert bucks.get(155) == [(160, 1600)], "should have gotten [(150, 1500)], instead got %s" % (bucks.get(155))
                



###############################################################################

if __name__ == '__main__':
    unittest.main()
    