import os
import time
import sys
import re
import urllib
import urllib2 
import json

from sys import stderr   
import traceback
import threading
import fnmatch
from os.path import islink, isdir, isfile, realpath, join, dirname, basename
from glob import glob
from pprint import pformat
import unittest
        
from graphite.logger import log
from graphite.node import BranchNode, LeafNode
from graphite.util import find_escaped_pattern_fields
from graphite.readers import MockReader
from graphite.readers import MemcacheMongoReader  
from django.conf import settings
from graphite.readers.metricValuePool import MetricValuePool

CUSTOMLOGFILE="/opt/graphite/storage/log/webapp/customFinder.log"

###############################################################################
#TODO : add dbname, authuser, authpass to MVPool init call.


class MongoFinder(object):

    mvPool          = MetricValuePool(settings.MONGO_SERVER, settings.MONGO_PORT)
    
    def __init__(self):
        self.dbname         = settings.MONGO_DBNAME
        self.mongoServer    = settings.MONGO_SERVER
        self.mongoPort      = settings.MONGO_PORT
        self.mvObj          = None

    def __del__(self):
        if self.mcDataStore: 
            self.mvPool.releaseConnection(self.mvDataStore)

    def getMongoFinder(self):
        return MongoFinder(self.dbname, self.mongoServer, self.mongoPort)

    def getLeafNode(self, mname, reader, avoidIntervals=False):
        ln = LeafNode(mname, reader, avoidIntervals=avoidIntervals)
        return ln

    def getBranchNode(self, mname):
        bn = BranchNode(mname)
        return bn

    def verifyHaveMvObj(self):
        return
        if not self.mvObj:
            try:
                self.mvObj = self.mvPool.getConnection(self.mongoServer, self.mongoPort)
            except:
                log.info("Could not get mvObj, tb: %s" % (traceback.format_exc()))
                self.mvObj = None
        return self.mvObj

    def getMongoObjects(self, query):
        ''' query is an object of type FindQuery from storage.py '''
        try:
            if not self.verifyHaveMvObj():
                return []
            mtObjects = self.mvObj.metricType.find_nodes(query.pattern)
            if 0:
                if len(mtObjects) < 10:
                    mnames = [x[0]['metricname'] for x in mtObjects]
                    log.info("findNodes returned: %s" % (mnames))
                else:
                    log.info("findNodes returned %d nodes." % (len(mtObjects)))
            tupes = []
            for mt, lbChar in mtObjects:
                tupes.append((mt['metricname'], lbChar))
            # log.info("finders.MongoFinder.find_nodes(%s) yielded %d tuples" % (query, len(tupes)))
        except:
            tupes = []
            print "EXCEPTION--" * 10
            log.info("EXCEPTION: MongoFinder.find_nodes(%s): %s" % (query, traceback.format_exc()) )
        return tupes

    def find_nodes(self, query):
        origPattern = query.pattern
        fqdnPattern = query.pattern
        if not query.pattern.startswith('ch3.'):
            fqdnPattern = 'ch3.' + query.pattern
            query.pattern = fqdnPattern
        result = self.mcDataStore.getGlobData(query.pattern)
        tupes     = []
        storeTime = None
        if result:
            tupes       = result['nodelist']
            storeTime   = result['timestamp']
        if not tupes:
            return []
        log.info("finders.MemcacheFinder.find_nodes(%s) yielded %d tuples." % (query, len(tupes)))
        nodes = []
        try:
            for mname, nodeType in tupes:
                if not mname.startswith('ch3.'):
                    mname = 'ch3.' + mname
                if nodeType == 'L':
                    reader  = MemcacheMongoReader(self.mvObj, None, mname)
                    nodes.append(self.getLeafNode(mname, reader, avoidIntervals=True))
                elif nodeType == 'B':
                    nodes.append(BranchNode(mname))
                else:
                    assert False, "ERROR: got wrong node type back from nodeType: %s" % (nodeType)
        except:
            tb = traceback.format_exc()
            log.info("finders.MemcacheFinder.find_nodes(%s) EXCEPTION: %s, tupes: %s." % (query, tb, tupes))
        if 0 or hadCacheMiss:
            log.info("finders.MemcacheFinder.find_nodes(%s) saving data! %d nodes." % (query.pattern, len(nodes)))
            if 0:
                log.info("finders.MemcacheFinder.find_nodes(%s) nodes to save: %s" % (query.pattern, nodes))  
            self.storeMongoInMemcache(query.pattern, nodes)
        return nodes
                                  
