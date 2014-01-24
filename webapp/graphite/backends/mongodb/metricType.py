#!/usr/bin/env python2.6
###############################################################################

import sys
import os
import time
import traceback
import re
import pymongo
import fnmatch
from pprint import pformat

from graphite.settings import MONGO_SERVER, MONGO_PORT, MY_DATACENTER_NUMBER
from graphite.backends.mongodb.mockLogger import MockLogger

###############################################################################


class BadMetricNameException(Exception):
    pass

###############################################################################


class MetricType(object):
    """MetricType class looks up a record in Mongo.
    This is a utility class and does not represent one specific Metric object.
    """
    def __init__(self, 
            mongo_server=MONGO_SERVER, 
            mongo_port=MONGO_PORT,
            cache_max=100000,
            dbname="megamaid", 
            connectionObject=None, 
            logger=None):
                
        self.logger = logger or MockLogger()
        self._connection = None
        self._cache = {} # Do not access this directly, use add_cache()
        self._qpCache = {}
        self._qpCacheExpirySeconds = 60 * 60
        self.cache_max = cache_max # Cap # of elements in cache
        self.dbname = dbname
        self.mongo_server = mongo_server
        self.mongo_port = mongo_port
        self.badCharPattern = re.compile(r'[^a-zA-Z\-_0-9.:]')
        self.openConnection(
            mongo_server=self.mongo_server,
            mongo_port=self.mongo_port,
            dbname=self.dbname,
            connectionObject=connectionObject)

    def __del__(self):
        self.closeConnection()

    def add_cache(self, name, val):
        self._cache[name] = val
        if self.cache_max:
            while len(self._cache) > self.cache_max:
                self._cache.popitem()
                
    def closeConnection(self):
        if self._connection:
            #self.logger.debug("metricType.closeConnection(): trying to close conection...")
            try:
                self._connection.disconnect()
                self.db = None
                self.mtypeCollection = None
            except:
                ##self.logger.debug("metricType.closeConnection(): Exception, ignoring.")
                # disconnected now
                pass
        #self.logger.debug("metricType.closeConnection(): Closed.")
        
    def openConnection(self, mongo_server=MONGO_SERVER, mongo_port=MONGO_PORT,
                       dbname='megamaid', connectionObject=None):
        #self.logger.debug("metricType.openConnection(): server:%s port:%s dbname:%s." % (mongo_server, mongo_port, dbname))
        if connectionObject != None:
            #self.logger.debug("MetricType.openConnection(): have connection object, re-using it.")
            self._connection = connectionObject
            #self.logger.debug("MetricType object using passed-in connection object.")
        else:
            self._connection = pymongo.Connection(mongo_server, mongo_port)
            #self.logger.debug("Instantiated new connection for metricType.")
        self.db = self._connection[dbname]
        self.mtypeCollection = self.db.metricType
        #self.logger.debug("metricType.openConnection(): Connection established, have collection objects.")
        return

    def getArrayOfNames(self, nameList):
        queryList = []
        for name in nameList:
            mtdoc = self._cache.get(name, None)
            if not mtdoc:
                queryList.append(name)
        cur = self.db.metricType.find({ 'metricname' : { '$in' : queryList } })
        for rec in cur:
            mname = rec['metricname']
            if not mname:
                self.logger.warning("Found Metrictype record with no metricname: %s" % (rec))
                continue 
            if not rec: 
                self.logger.warning("Found Metrictype record with empty value: %s" % (rec))
                continue
            self.add_cache(mname, rec)
        return 

    def invalidateCacheForName(self, metricname):
        try:
            del self._cache[metricname]
        except:
            pass

    def getByName(self, metricname, saveNew=True):
        # Will occassionally suffer from race condition:
        # * 2+ concurrent processes trying to create parent, parent-of-parent, etc.
        # * solve this by just trying again;
        # * if a.b.c.d.e.f.g1 and a.b.c.d.e.f.g2 race, trying to create parents, alternate failures, will TB 3 times.
        numTries = 10  # Note, will do 1 more time than this
        while numTries > 0:
            try:
                return self._getByName(metricname, saveNew)
            except pymongo.errors.DuplicateKeyError:
                numTries -= 1
        # last time, if fails, will return traceback up the stack.
        return self._getByName(metricname, saveNew)

    def strMtDoc(self, doc):
        if not doc:
            return "No doc given."
        if not type(doc)  == dict:
            return "doc not a dict, doc: %s" % (pformat(doc))
        kids = doc.get('children') 
        if kids is None:
            outkids = "MISSING"
        elif len(kids) > 10:
            outkids = "%d children" % (len(kids))
        else:
            outkids = kids
        out = "<MetricType metricname: %s, mtid %s num kids: %s, parent: %s" % (
            doc.get('metricname',   "MISSING"), 
            doc.get('metrictypeid', "MISSING"), 
            outkids,
            doc.get('parent',   "MISSING"))
        return out 

    def _getByName(self, metricname, saveNew=True):
        
        if not metricname:
            return None
        doc = self._cache.get(metricname)
        if doc:
            # self.logger.debug("getByName: %s found name in cache, returning %s." % (metricname, self.strMtDoc(doc)))
            return doc
        # self.logger.debug("metricType.getByName(): Missed cache, querying, metricname=%s" % (metricname))
        doc = self.db.metricType.find_one({'metricname' : metricname})
        # self.logger.debug("metricType.getByName(): Query found doc: %s" % (self.strMtDoc(doc)))

        # might be a link intervening.  find sublists of a.b.c.d --> [a, a.b, a.b.c, a.b.c.d]
        possLinks = set()
        for c in range(0, metricname.count('.')+1): 
            possLinks.add('.'.join(metricname.split('.')[0:c+1]))
        possDocs = self.db.metricType.find({ 'linktometricname' : { '$ne' : None }, 'metricname' : { '$in' : list(possLinks) } } )
        possDocs = list(possDocs)

        if possDocs:
            possDocs = sorted(possDocs, lambda x: len(x['metricname']))
            possLinkDoc  = possDocs[-1]
            search_mname = metricname.replace(possLinkDoc['metricname'], possLinkDoc['linktometricname'])

            ret = self.getByName(search_mname, saveNew=saveNew)
            if ret:
                self.add_cache(metricname, ret)
            return ret
        
        if not doc and saveNew:
            st = time.time()
            doc = self.createMetricTypeDoc(metricname)
            self.logger.debug("Delay creating mtdoc is %s" % (time.time() - st))
        if doc:
            self.add_cache(metricname, doc)
        return doc

    def linkExists(self, realMetricName, linkName):
        mtdoc = self.getByName(realMetricName, saveNew=False)
        if not mtdoc:
            self.logger.error("No such metricName: %s" % (realMetricName))
            return False
        newLinkDoc  = self.getByName(linkName, saveNew=False)
        return bool(newLinkDoc)

    #   Just like calling linux ln -s command.
    #   if existing one is a.b, call as createMetrictTypeLink('a.b', 'x.y')
    def createLink(self, realMetricName, linkName):
        mtdoc = self.getByName(realMetricName, saveNew=False)
        if not mtdoc:
            self.logger.error("No such metricName: %s" % (realMetricName))
            return False
        newLinkDoc  = self.getByName(linkName, saveNew=True)
        newLinkMtid = newLinkDoc['metrictypeid']
        try:
            self._cache[linkName]['linktometricname'] = realMetricName
        except KeyError:
            pass
        retval = self.db.metricType.update({ 'metrictypeid' : newLinkMtid }, { '$set' : { 'linktometricname' : realMetricName } }, w=1)
        assert retval.get('n', 0), "update of metrictype to add linktometricname failed, metrictypeid: %s, realname=%s, linkname=%s" % (newLinkMtid, realMetricName, linkName)
        return newLinkDoc

    def getIdByName(self, metricname, saveNew=True):
        found = self.getByName(metricname, saveNew=saveNew)
        if found:
            return found.get('metrictypeid', None)
        else:
            return None

    def getAllMetricTypeRecords(self, start=None, end=999999999999, batchSize=2000):
        query = {}
        if start is not None:
            query = { 'metrictypeid' : { '$gte' : start, '$lte' : end} }
        recList = self.db.metricType.find(query, batch_size=batchSize).sort('metrictypeid', 1)
        for rec in recList:
            # #self.logger.debug("getAllMetricTypeRecords(): rec=%s" % (rec))
            mname = rec.get('metricname', None)
            if not mname:
                self.logger.warning("Found MetricType record with null metricname: %s" % (rec))
            else:
                self.add_cache(mname, rec)
            yield rec

    def getByRegex(self, metricNameRegex, limitNum=None):
        # NOTE:  Cannot use cache, might be incomplete.
        # { name : { $regex : 'acme.*corp', $options: 'i' } }
        # self.logger.info("metricType.getByRegex(): querying regex=%s" % (metricNameRegex))
        if not limitNum:
            docs = self.db.metricType.find({ 'metricname' : { '$regex': metricNameRegex, '$options': 'i'}})
        else:
            docs = self.db.metricType.find({ 'metricname' : { '$regex': metricNameRegex, '$options': 'i'}}).limit(limitNum)
        doclist = list(docs)
        # self.logger.info("metricType.getByRegex(): found doclist array w/ len = %s" % (len(doclistarray)))
        for doc in doclist:             
            metricname = doc['metricname']
            self.add_cache(metricname, doc)
        return doclist

    def isMetricNameCached(self, mname):
        # XXX Why is this a function?
        return self._cache.get(mname)

    def getById(self, metrictypeid):
        # XXX This is terrible for performance. 
        for k, v in self._cache.items():
            assert v, "Cached metric with no value found, key: %s, val: %s" % (k, v)
            if v.get('metrictypeid', None) == metrictypeid:
                ##self.logger.debug("metricType.getById(): found id=%s in cache: %s" % (metrictypeid, v))
                return v
        doc = self.db.metricType.find_one({'metrictypeid' : metrictypeid})
        if not doc:
            ##self.logger.debug("metricType.getById(): doc with mtid=%s not found." % (metrictypeid))
            return None
        #self.logger.debug("metricType.getById(): find_one of id=%s found: %s" % (metrictypeid, doc))
        metricname = doc['metricname']
        self.add_cache(metricname, doc)
        return doc

    def getRootDocs(self):
        fcursor = self.db.metricType.find({'parent': None})
        res = list(fcursor)
        for doc in res:
            metricname = doc['metricname']
            self.add_cache(metricname, doc)
        self.logger.warning("metricType.getRootDocs(): returning %s" % (res))
        return res

    def isMtobjLeafNode(self, mtobj):
        replPattern = mtobj.get('linktometricname', None)
        if replPattern:
            newMtobj = self.getByName(replPattern, saveNew=False)
            if not newMtobj:
                # if link has no dest, it's really nothing, but return leaf anyway. 
                #self.logger.debug("obj with pat %s not found, returning true." % replPattern)
                return True
            #self.logger.debug("finding if newMtobj is a leaf node: %s" % newMtobj)
            res = self.isMtobjLeafNode(newMtobj)
            #self.logger.debug("have res: %s" % res)
            return res
        if not mtobj['children']:
            return True
        return False

    def getNodeGivenMtobj(self, mtObj):
        if self.isMtobjLeafNode(mtObj):
            return ((mtObj, 'L'))
        return ((mtObj, 'B'))

    def regexOrGlobCharsInString(self, instr):
        for c in ' * [ ] ? '.split():
            if c in instr:
                return True
        return False

    def find_nodes_old(self, queryPattern):
        # return dict of { metricname: 'blah', nodetype: 'branch'|'leaf' }
        if not queryPattern:
            return []
        # 4 basic cases: 1: top level, 2: a.b.* navigating tree, 3: a.b.c exact, 4: everything else.
        if queryPattern == '*':
            rd = self.getRootDocs()
            ret = [(x, 'B') for x in rd]
            return ret
        if (queryPattern.count("*") == 1) and queryPattern.endswith(".*"):
            pat = queryPattern[0:-2]
            sn = self.getSubNodesSimple(pat)
            ret = []
            for n in sn:
                ret.append(self.getNodeGivenMtobj(n))
            #self.logger.debug("Returning: %s" % (ret))
            return ret
        if not self.regexOrGlobCharsInString(queryPattern):  
            # not regex or glob, simple getbyname.
            mtobj = self.getByName(queryPattern, saveNew=False)
            return [self.getNodeGivenMtobj(mtobj)]
        # everything else...        
        try:
            pat = fnmatch.translate(queryPattern)
            fcursor = self.db.metricType.find({'metricname': { '$regex' : pat } })
            ret = []
            for mtobj in fcursor:
                ret.append(self.getNodeGivenMtobj(mtobj))
            return ret
        except:
            tb = traceback.format_exc()
            self.logger.warning("Exception in parsing querypattern '%s' into regex '%s': %s" % (queryPattern, pat, tb))            
        return []

    def getNamesGivenGlob(self, qp):
        pat = fnmatch.translate(qp)
        fcursor = self.db.metricType.find({'metricname': { '$regex' : pat } })
        ret = []
        for mtobj in fcursor:
            name = mtobj.get('metricname', None)
            if not name: continue
            ret.append(name)
        return ret        

    def find_mnames(self, qp):
        ''' given string, return array of un-aliased strings'''
        if (not qp)   : return []
        cacheData = self.getQpFromCache(qp)
        if cacheData:
            # yes, but only kept for 1 minute.
            return cacheData
        first, star, last = self.splitOnStars(qp)
        self.logger.warning("metricType.find_mnames(): pattern: %s, first=%s, star=%s, last=%s" % (qp, first, star, last))
        if not first:
            # starts with a wildcard, get root docs.
            self.logger.info("metricType.find_mnames(): getting root docs.")
            rdocs = self.getRootDocs()
            return [x.get('metricname', None) for x in rdocs if x is not None]
        realMt = self.getByName(first, saveNew=False)
        if not realMt:
            return []
        real = realMt.get('metricname', None)
        # self.logger.debug("getbyname of %s returned '%s'" % (first, real))
        if not star:
            # is plain name, return it.
            # self.logger.debug("No star.")
            return [real]
        if (star == '*' and (not last)):
            # asking for a.b.*, typical tree expansion, special case.
            idlist = realMt['children'] 
            #self.logger.debug("metricType.getSubNodesSimple(): child id list: %s" % (idlist))
            fcursor = self.db.metricType.find({'metrictypeid' : { '$in' : idlist }})
            retArray = [x['metricname'] for x in fcursor]
            retArray.sort()
            self.addQpToCache(qp, retArray)
            if len(retArray) < 30:
                self.logger.debug("find_mnames(%s) returning: %s" % (qp, retArray))
            else:
                self.logger.debug("find_mnames(%s) returning: %d names" % (qp, len(retArray)))
            return retArray
            
        # expand one level down at a time, recursively.
        name = "%s.%s" % (real, star)
        narray = self.getNamesGivenGlob(name)
        numDots = name.count('.')
        narray = [x for x in narray if x.count('.') == numDots] 
        #self.logger.debug("getNamesGivenGlob(%s) returned: %s" % (name, narray))
        builtArray = []
        for n in narray:
            # add back on the end
            built = n
            if last:
                built += "." + last
            builtArray.append(built)
        retArray = []
        for b in builtArray:
            parsed = self.find_mnames(b)
            retArray.extend(parsed)
        retArray.sort()
        self.addQpToCache(qp, retArray)
        return retArray

    def nowTime(self):
        return time.time()

    def getQpFromCache(self, qp):
        rdict = self._qpCache.get(qp, None)
        if not rdict:
            return None
        expiry = rdict.get('expiry', None)
        now = self.nowTime()
        if (not expiry) or (expiry < now):
            del self._qpCache[qp]
            return None
        val = rdict.get('val', None)
        return val

    def addQpToCache(self, qp, result):
        now = self.nowTime() 
        expiry = now + self._qpCacheExpirySeconds
        # print "Nowtime: %s + %s seconds = %s expiry." % (now, self._qpCacheExpirySeconds, expiry)
        adict = { 'expiry' : expiry, 'val' : result }
        self._qpCache[qp] = adict

    def find_nodes(self, queryPattern):
        # return dict of { metricname: 'blah', nodetype: 'branch'|'leaf' }
        if not queryPattern:
            return []
        # 4 basic cases: 1: top level, 2: a.b.* navigating tree, 3: a.b.c exact, 4: everything else.
        mnames = self.find_mnames(queryPattern)
        ret = []
        for mn in mnames:
            mtobj = self.getByName(mn, saveNew=False)
            # self.logger.warning("Get by name.  Name: %s, obj : %s" % (mn, self.strMtDoc(mtobj)))
            if (not mtobj) or (not mtobj.has_key('children')):  # protect against malformed mtobjects.
                continue
            node = self.getNodeGivenMtobj(mtobj)
            if not node:
                continue
            ret.append(node)
        return ret        

    def findNodesPresumingLinks(self, qp):
        # not found by explicit find.  Go up and search for links.
        possibleNames = self.getPossibleSubnames(qp)


    def getPossibleSubnames(self, qp):
        qpArr = qp.split('.')
        if (not qp) or (not qpArr):
            return []
        ret = []
        for n in range(len(qpArr), 0, -1):
            name = '.'.join(qpArr[0:n])
            ret.append(name)
        return ret

    def getSubNodesSimple(self, qp):
        assert not '*' in qp, "getSubNodesSimple() cannot handle glob/regex patterns."
        #self.logger.debug("metricType.getSubNodesSimple(): qp = %s" % (qp))
        #rec = self.db.metricType.find_one({'metricname': qp })
        cur = self.db.metricType.find({'metricname': qp })
        recList = list(cur)
        self.logger.debug("reclist: %s" % recList)
        rec = recList and recList[0] or None
        if not rec:
            #self.logger.debug("metricType.getSubNodesSimple(): qp = %s" % (qp))
            return []
        idlist = rec['children'] 
        #self.logger.debug("metricType.getSubNodesSimple(): child id list: %s" % (idlist))
        fcursor = self.db.metricType.find({'metrictypeid' : { '$in' : idlist }})
        res = list(fcursor) # [x['metricname'] for x in fcursor]
        #printable = [x['metricname'] for x in res]
        #self.logger.debug("metricType.getSubNodesSimple(): Returning, result of query '%s', mname list: %s" % (qp, printable))
        return res

    def splitOnStars(self, queryPattern):
        qpSplit = queryPattern.split('.')
        starNum = None
        for (num, elem) in enumerate(qpSplit):
            if self.regexOrGlobCharsInString(elem):
                starNum = num
                break
        if starNum is None:
            return queryPattern, None, None
        first = '.'.join(qpSplit[0:starNum])
        star  = qpSplit[starNum]
        last  = '.'.join(qpSplit[starNum+1:])
        return first, star, last

    def getSubNodesNonRegex(self, queryPattern):
        self.logger.debug("getSubNodesNonRegex(): Getting subnodes with query pattern: %s" %queryPattern)
        first, star, last = self.splitOnStars(queryPattern)
        firstNodes = self.getSubNodesSimple(first)
        star = star.replace('*', ".*")
        star = star.replace('?', ".")
        reStar = re.compile(star)
        fnList = []
        for n in firstNodes:
            if reStar.match(n['metricname'], 1):
                fnList.append(n)
        retList = []
        specificMnames = []
        for n in fnList:
            qstring = n['metricname'] 
            if last:
                qstring += '.' + last
            if '*' in last:
                retList.extend(self.getSubNodesNonRegex(qstring))
            else:
                specificMnames.append(qstring)
        #self.logger.debug("getSubNodesNonRegex(): adding list of specific Names: %s" % (specificMnames))
        sCursor = self.db.metricType.find({'metricname': { '$in' : specificMnames }})
        if not sCursor:
            return retList
        specList = list(sCursor)
        retList.extend(specList)
        return retList
        
    def getNextMetricTypeId(self):
        #self.logger.debug("metricType.getNextMetricTypeId().")
        gotOkay = False
        for trynum in range(0, 10):
            try:
                ret = self.db.command("findandmodify", "metricCounters", query={ "name" : "nextmetrictypeid" }, update={ "$inc" : { "value" : 1 } } );
                errValue = ret.get("err", None)
                assert (not errValue), "had error with findandmodify: %s" % (pformat(ret))
                returnedRecord = ret["value"]   
                assert (returnedRecord and (returnedRecord.get("name", None) == "nextmetrictypeid")), "Could not get nextMetricTypeID, probably don't have collection in this db."
                gotOkay = True
                break
            except:
                self.logger.error("Error: could not findandmodify metricCounters.nextmetrictypeid. trynum %d, Err: %s" % (trynum, traceback.format_exc()))
        assert gotOkay, "Error:  Giving up after 10 tries, could not findandmodify metricCounters.nextmetrictypeid."

        mtid = returnedRecord["value"]
        assert mtid, "Must provide MTID, got none/zero."
         
        #################################################
        # IMPORTANT MTID Notes:  
        # a.  Mongo stores any number as a 64-bit float.
        #     That's enough for 4,000,000,000,000,000  (5 3-tuples of digits).  
        # b.  Mongo sharding uses shard key ranges: 0-3 for shard1, 4-6 for shard2, etc.
        # c.  We use MTID for a shard key.
        #
        # To make MTID  __SEEM__ random (and distribute recs across all shards), prepend last 3 digits.
        #
        # 1. Allow for 999 Million (1-Billion) metrics per datacenter (3 3-tuples).
        # 2. prepend last 3 digits to make it seem random for sharding purposes.
        # 3. prepend a digit for the MY_DATACENTER_NUMBER, 0 for ch3, 1 for ch4.
        #################################################

        retval = long(mtid + ((mtid % 1000)*1000*1000*1000) + (MY_DATACENTER_NUMBER * (10**12)))
        return retval

    def getParentMetricName(self, metricName):
        assert metricName, "must supply metricname"
        sp = metricName.split('.')
        if (len(sp) == 1):
            return None
        return '.'.join(sp[0:-1])

    def fixParent(self, metricName, verbose=False):
        pmn = self.getParentMetricName(metricName)
        self.logger.warning("Fixing parent for metricname: %s, parent is: %s" % (metricName, pmn))
        mnRec = self.getByName(metricName, saveNew=False)
        pRec  = self.getByName(pmn, saveNew=False)
        self.logger.warning("fixParent(): mnRec: %s, pRec: %s" % (mnRec, pRec))
        if not pmn:
            # base level (e.g., metricname='databases'), nothing to create, just make sure has field and it's set to None.
            self.updateParentField(mnRec['metrictypeid'], None, metricName)
            return
        if (not pRec):
            # no parent with correct name, must create.
            self.logger.warning("fixParent(): no prec, creating pmn=%s" % (pmn))
            pRec = self.createMetricTypeDoc(pmn, okay2createRoot=True)
            self.logger.warning("WARNING: Created MT record w/name/id '%s'/%s (metricname %s had no parent rec, had to create one)." % (pmn, pRec['metrictypeid'], metricName))
        mnParentmtid = mnRec.get('parent', None)
        self.logger.warning("mnParentmtid: %s" % (mnParentmtid))
        mnMtid       = mnRec['metrictypeid']
        pMtid        = pRec['metrictypeid']
        if (mnParentmtid != pMtid):
            self.logger.warning("mnParentmtid: %s, mnMtid: %s, pMtid=%s, different, updating." % (mnParentmtid, mnMtid, pMtid))
            self.updateParentField(mnMtid, pMtid, metricName)
            self.logger.warning("Updated.")
            if verbose:
                self.logger.info("fixParent(): mn (id=%s name=%s) had parentmtid=%s, fixed to be %s." % (mnMtid, metricName, mnParentmtid, pMtid))
            return True
        self.logger.warning("returning false.")
        return False

    def fixChildren(self, metricName, verbose=False):
        mtrec = self.getByName(metricName, saveNew=False)
        if not mtrec:
            self.logger.warning("WARNING: could not find MT rec for metric name=%s." % (metricName))
            return False
        try:
            mname   = mtrec['metricname']
            mtid    = mtrec['metrictypeid']
            curList = mtrec.get('children', [])
            curSet  = set(curList)
            docs    = self.getByRegex(mname + "\.[^.]*$")
            childNamesList = []
            calcChildSet   = set()
            for d in docs:
                childNamesList.append(d['metricname'])
                calcChildSet.add(d['metrictypeid'])
            if (curSet != calcChildSet):
                oldChildren = []
                for oldMtid in curSet:
                    rec = self.getById(oldMtid)
                    if not rec:
                        if verbose:
                            self.logger.warning("child does not exist, mtid: %15.15d" % (oldMtid))
                        continue
                    oldChildren.append(rec['metricname'])
                if verbose:
                    self.logger.warning("MtidKids fix: id=%15.15d %s, has children %s, updated set %s." % (mtid, mname, curSet, calcChildSet))
                    self.logger.info("Was list: %s, new list: %s" % (oldChildren, childNamesList))
                self.resetListOfChildren(mtid)
                self.invalidateCacheForName(mname)
                return True
        except:
            self.logger.warning("EXCEPTION: processing childlist for metrictype rec: %s, ERROR: %s" % (mtrec, traceback.format_exc()))
        return False

    def updateParentField(self, mtid, pmtid, metricName):
        assert mtid,       "updateParentField(): must provide mtid to updateParentField"
        # Note:  could be we're updating the pmtid to None, if it's a base level metricname (e.g., 'server'), so don't assert pmtid,
        assert metricName, "updateParentField(): Must provide metricname."
        retries = 10
        while retries > 0:
            try:
                retval = self.db.metricType.update(
                    { 'metricname' : metricName },
                    { '$set' : { 'parent' : pmtid } }, 
                    w=1 )
                assert (retval.get('n', 0) > 0), "MT.updateParentField(): retval %s, failure, retrying." % (retval)
                msg = None
                break
            except Exception, e:
                retries -= 1
                msg = e
        if msg:
            self.logger.warning(msg)
        self.invalidateCacheForName(metricName)
        return

    def resetListOfChildren(self, mtid):
        doc = self.db.metricType.find_one({'metrictypeid' : mtid })
        if not doc:
            self.logger.warning("resetListOfChildren(): mtid %s not found." % (mtid))
            return False
        mname = doc['metricname']
        mtRegex = mname + '\.[^.]*$'
        cursor = self.db.metricType.find({'metricname' : {'$regex' : mtRegex} })
        newList = []
        counter = 0
        for rec in cursor:
            try:
                cmtid = rec['metrictypeid']
                self.logger.debug("--> %d resetListOfChildren(); child id:%d (parent: %s) %s" % (counter, cmtid, rec['parent'], rec['metricname']))
                newList.append(cmtid)
                counter += 1
            except Exception, e:
                self.logger.error("resetListOfChildren: %s" % e)
        self.logger.debug("resetListOfChildren(); Updating mname %s children list to: %s" % (mname, newList))
        retval = self.db.metricType.update({ '_id' : doc['_id'] }, { '$set' : { 'children' : newList } }, multi=True )
        self.logger.debug("resetListOfChildren(); Update retval: %s" % (retval))
        return True

    def updateParentsChildren(self, pmtid, mtid):
        parentDoc = self.getById(pmtid)
        assert parentDoc, "Must have parentDoc, don't."
        doc = self.db.metricType.find_and_modify({'metricname' : parentDoc['metricname']}, { '$addToSet' : { u'children' : mtid } })
        assert doc, "Just updated metrictype %s (updateParentsChildren(), something is wrong, can't find it." % (pmtid)
        self.invalidateCacheForName(doc['metricname'])  # just changed it, make sure to fetch corrected doc next time
        return

    def isBadMetricName(self, metricname):
        if not metricname:
           return "Must provide metricname of nonzero length, got empty string."
        sp = metricname.split('.')
        for elem in sp:
            if not elem:
                return "must not have empty section in metricname, got '%s', split into: '%s'" % (metricname, sp)
        if not sp[0]:
            return "must not have leading dot in metricname, got '%s'" % (metricname)
        if len(sp) < 2:
            return "metricname must have at least two elements separated by a dot, got '%s'" % (metricname)
        if ' ' in metricname:
            return "metricname must not contain embedded spaces, got '%s'" % (metricname)
        bad_chars = self.badCharPattern.findall(metricname)
        if bad_chars:
            return "metricname contains invalid characters (%s), got '%s'" % (bad_chars, metricname)
        return None

    def createMetricTypeDoc(self, metricname, metrictypeid=None, okay2createRoot=False):
        #self.logger.debug("metricType.createMetricTypeDoc(): called with metricname='%s'" % (metricname))
        if not okay2createRoot:
            errMsg = self.isBadMetricName(metricname)
            if errMsg:
                raise BadMetricNameException(errMsg)
                
        found = self.getByName(metricname, saveNew=False)
        if found: # already exists, don't duplicate.
            return found
       
        parentMetricName = self.getParentMetricName(metricname)
        self.logger.debug("parent of name %s is %s" % (metricname, parentMetricName))
        if not parentMetricName:
            parentMtid = None
        else:
            retries = 10
            while retries > 0:
                try:
                    parentMetricTypeDoc = self.createMetricTypeDoc(parentMetricName, okay2createRoot=True)
                    assert parentMetricTypeDoc, "didn't create parent doc."
                    break
                except (pymongo.errors.DuplicateKeyError, pymongo.errors.OperationFailure, pymongo.errors.ConnectionFailure, pymongo.errors.AutoReconnect), e:
                    retries -= 1
                    msg = e
            assert retries > 0, "createMetricTypeDoc(): exception getting parentMetricTypeDoc, parent's name: %s, exception: %s" % (parentMetricName, msg)
            parentMtid = parentMetricTypeDoc['metrictypeid']
        self.logger.debug("metricType.createMetricTypeDoc(): Creating new MetricType doc w/ metricname=%s." % (metricname))
        useMetricTypeId = metrictypeid
        if not useMetricTypeId:
            useMetricTypeId = self.getNextMetricTypeId()

        if parentMtid:
            self.logger.debug("Updating parent mtid=%s name=%s to have childmtid %d" % (parentMtid, parentMetricName, useMetricTypeId))
            self.updateParentsChildren(parentMtid, useMetricTypeId)
        else:
            self.logger.error("no parent for %s" % (metricname))

        newDoc = {}
        newDoc['metricname'] = metricname
        newDoc['metrictypeid'] = useMetricTypeId
        newDoc['parent'] = parentMtid
        newDoc['children'] = []
        newDoc['linktometricname'] = None
        newDoc['expiry'] = None

        objid = self.db.metricType.insert(newDoc, w=1)
        #print "CreateMetricTypeDoc(): inserted doc=%s, retval: %s" % (newDoc, objid)
        assert objid, "could not insert new doc: %s" % (newDoc)
        self.add_cache(metricname, newDoc)
        return newDoc

    def getValuesByName(self, metricname):
        typedoc = self.getByName(metricname)
        if not typedoc:
            return None
        assert metricname == typedoc['metricname'], \
            "should have returned a rec with metricname = '%s', but got doc: %s" % (metricname, pformat(typedoc))
        typeid = typedoc.get('metrictypeid', None)
        assert typeid, "should have a valid metrictypeid, don't have one.  MetricType doc=%s" % (pformat(typedoc))
        cur = self.db.metricValue.find({ 'metrictypeid' : typeid })
        return list(cur)


###############################################################################
###############################################################################
###############################################################################
###############################################################################
