
import unittest
from graphite.backends.mongodb.dataNormalizer import DataNormalizer
from pprint import pformat

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

