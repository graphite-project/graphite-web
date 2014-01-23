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

