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
from graphite.readers.mongodbReader import MongodbReader
from graphite.backends.mongodb.metricValuePool import MetricValuePool
from django.conf import settings

CUSTOMLOGFILE="/opt/graphite/storage/log/webapp/customFinder.log"

###############################################################################
#TODO : add dbname, authuser, authpass to MVPool init call.


class MongodbFinder(object):

    mvPool          = MetricValuePool(settings.MONGO_SERVER, settings.MONGO_PORT, settings.MONGO_DBNAME, settings.MONGO_DBUSER, settings.MONGO_DBPASS)
    
    def __init__(self):
        self.mongoServer    = settings.MONGO_SERVER
        self.mongoPort      = settings.MONGO_PORT
        self.dbname         = settings.MONGO_DBNAME
        self.dbuser         = settings.MONGO_DBUSER
        self.dbpass         = settings.MONGO_DBPASS
        self.mvObj          = None

    def __del__(self):
        if self.mvPool and self.mvObj: 
            self.mvPool.releaseConnection(self.mvObj)

    def getLeafNode(self, mname, reader, avoidIntervals=False):
        ln = LeafNode(mname, reader, avoidIntervals=avoidIntervals)
        return ln

    def getBranchNode(self, mname):
        bn = BranchNode(mname)
        return bn

    def verifyHaveMvObj(self):
        if not self.mvObj:
            try:
                self.mvObj = self.mvPool.getConnection(self.mongoServer, self.mongoPort, self.dbname, self.dbuser, self.dbpass)
            except:
                log.info("Could not get mvObj, tb: %s" % (traceback.format_exc()))
                self.mvObj = None
        return self.mvObj

    def getMongoObjects(self, query):
        ''' query is an object of type FindQuery from storage.py '''
        try:
            if not self.verifyHaveMvObj():
                log.info("getMongoObjects(): ERROR: NO verified MV object.")
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
        if query.pattern.startswith('graphite.'):
            query.pattern = query.pattern[9:]
        log.info("finders.MongodbFinder.find_nodes() query: %s" % (query))
        #if not query.pattern.startswith('ch3.'):
        #    fqdnPattern = 'ch3.' + query.pattern
        #    query.pattern = fqdnPattern
        nodes = []
        mongoObjects = self.getMongoObjects(query)
        log.info("finders.MongodbFinder.find_nodes() query: %s, mongoDbObjects: %s" % (query, mongoObjects))
        try:
            for mname, nodeType in mongoObjects:
                if not mname.startswith('ch3.'):
                    mname = 'ch3.' + mname
                if nodeType == 'L':
                    reader  = MongodbReader(self.mvObj, mname)
                    nodes.append(self.getLeafNode(mname, reader, avoidIntervals=True))
                elif nodeType == 'B':
                    nodes.append(BranchNode(mname))
                else:
                    assert False, "ERROR: got wrong node type back from nodeType: %s" % (nodeType)
        except:
            tb = traceback.format_exc()
            log.info("finders.MemcacheFinder.find_nodes(%s) EXCEPTION: %s, mongoObjects: %s." % (query, tb, mongoObjects))
        return nodes
                                  
