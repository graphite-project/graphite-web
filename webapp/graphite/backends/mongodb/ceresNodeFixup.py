#!/usr/bin/env python2.6
################################################################################

import io
import os
import shutil
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
import signal
import select
import simplejson
import cPickle as pickle
import re
import shutil
import collections
from pymongo import Connection
from optparse import OptionParser
import ConfigParser
from pprint import pprint, pformat

from dcm.dcmSettings import METRIC_HOSTNAME, MONGO_PORT, MONGO_SERVER

################################################################################

class CeresNodeFixup(object):

    def __del__(self):
        import datetime
        self.writeLog("Ending at %s" % (str(datetime.datetime.today())))
        self.LOGFILE.flush()
        self.LOGFILE.close()

    def __init__(self):
        self.verbose            = False
        self.debug              = False
        self.LOGFILE            = open("ceresNodeFixup.log", "a")
        self.badFilesList       = set()
        self.filesChanged       = 0
        self.dirsExamined       = 0
        self.rmDirs             = 0
        self.rmCnfs             = 0
        self.rmNonslice         = 0
        self.lastStatusTime     = time.time()

    def getOptionParser(self):
        return OptionParser()

    def getOptions(self):
        parser = self.getOptionParser()
        parser.add_option("-d", "--debug",      action="store_true",                 dest="debug",   default=False, help="debug mode for this program, writes debug messages to logfile." )
        parser.add_option("-v", "--verbose",    action="store_true",                 dest="verbose", default=False, help="verbose mode for this program, prints a lot to stdout." )
        parser.add_option("-b", "--basedir",    action="store",      type="string",  dest="basedir", default=None,  help="base directory location to start converting." )
        parser.add_option("-r", '--rulesfile',  action="store",      type="string",  dest="rulesfile", default=None, help="path to storage-rules.conf file.")
        (options, args)     = parser.parse_args()
        self.debug          = options.debug
        self.verbose        = options.verbose
        self.basedir        = options.basedir
        self.rulesfile      = options.rulesfile
        assert self.basedir, "must provide base directory."

    def getRules(self):

        assert self.rulesfile, "must provide rules file."
        assert os.path.exists(self.rulesfile), "rules file %s does not exist." % (self.rulesfile)

        p = ConfigParser.ConfigParser()
        p.read(self.rulesfile)
        rulesArray = []
        for section in p.sections():
            print "have section: %s" % (section)
            outdict = { 'name' : section }
            for (name, value) in p.items(section):
                print "Name=%s, val=%s" % (pformat(name), pformat(value))
                if (name == 'pattern'):
                    outdict['pattern'] = value
                if (name == 'retentions'):
                    retArray = value.split(":")
                    outdict['retentions'] = retArray
            if not outdict.get('pattern', None):
                # ignore if not required field pattern.
                continue
            rulesArray.append(outdict)

        for rule in rulesArray:
            print "Rule: %s" % (rule)

        self.rules = rulesArray
        return

    def getMyHostname(self):
        self.hostname = socket.gethostname()

    def createRegexObjects(self):
        self.writeLog( "Creating Regex Objects.")
        for ind in range(0, len(self.rules)):
            elem = self.rules[ind]
            if self.debug:
                self.writeLog( "fio Rule: %s" % (pformat(elem)))
            name        = elem.get('name',    "NO_NAME")
            pattern     = elem.get('pattern', "NO_PATTERN")
            if not pattern:
                # dont' want an object if don't have required field of pattern.
                continue
            pattern2    = pattern.replace(r'\\\\', r'\\')
            #if self.debug:
            #    self.writeLog( "Object:  name=%s, pattern=%s." % (name, pattern))
            reObj = re.compile(pattern)
            self.rules[ind]["reObj"] = reObj
            
        if self.debug:
            self.writeLog( "fil rules: %s" % (pformat(self.rules)))

    def getNowTime(self):
        return time.time()

    def printStatus(self, force=False):
        self.dirsExamined += 1
        now = self.getNowTime()
        if (force or ((now - self.lastStatusTime) > 10)):
            self.lastStatusTime = now
            self.writeLog("[%s] Updated %s files, examined %d dirs, emptyFiles=%s, rmDirs=%s, rmCnf=%s, rmNonslice=%s, okayfiles=%d, reasons=%s" % (
                time.strftime("%F %X"), self.filesChanged, self.dirsExamined, self.emptyFiles, self.rmDirs, 
                self.rmCnfs, self.rmNonslice, self.okayFiles, self.updateStatsDict))

    def haveIntermidateWithSlices(self, dirpath):
        self.writeLog("WARNING: INTERMEDIATE DIR WITH SLICE FILES: %s" % (dirpath))

    def removeFile(self, filename):
        try:
            os.remove(filename)
            self.writeLogFileOnly("removed ceres-node file in otherwise empty directory: %s" % (filename))
            assert not os.path.exists(filename), "file %s should no longer exist, yet it does." % (filename)
            self.rmCnfs += 1
        except:
            msg = "Could not remove ceres node file: %s, msg: %s" % (filename, traceback.format_exc())
            self.writeLog(msg)

    def deleteDir(self, dirpath):
        try:
            os.rmdir(dirpath)
            self.rmDirs += 1
            self.writeLogFileOnly("NOTE: Removed empty directory: %s" % (dirpath))
        except:
            msg = "WARNING: Could not remove supposedly empty directory: %s" % (dirpath)
            self.writeLog(msg)

    def fixCeresNodeFile(self, inpath, metadataFile):

        if not os.path.exists(metadataFile):
            msg = "ERROR:  should have metadataFile=%s here, file missing." % (metadataFile)
            self.writeLog(msg)
            return

        pathString = inpath
        metricPath = pathString.replace("/home/krice4/datastore/", "")
        metricPath = metricPath.replace("/opt/datastore/ceres/",   "")
        metricPath = metricPath.replace("/", ".")

        found = False
        for elem in self.rules:
            name        = elem['name'       ]
            reg         = elem['reObj'      ]
            pattern     = elem['pattern'    ]
            # print "attempting to match metricPath=%s to reg '%s'" % (metricPath, pattern)
            mo = reg.match(metricPath)
            if not mo:
                continue
            found = True
            relem =  elem['retentions' ]
            relem_ts  = int(relem[0])
            relem_len = int(relem[1])
            retentions  = [[ relem_ts, relem_len ]]
            timeStep    = retentions[0][0]
            if self.debug:
                self.writeLog("HURRAY:  Using rule: %s" % (name))
            break

        if (not found):
            if self.debug:
                self.writeLog("WARNING: Using default rule, path not found: %s" % (inpath))
            # default case.
            name = "DEFAULT"
            retentions = [[ 60, 172800 ]]
            timeStep   = 60

        badFile = False
        with open(metadataFile, "r") as mdf:
            try:
                ceresData = json.load(mdf)
            except:
                ceresData = {}
                badFile = True
                self.emptyFiles += 0

        cdTimeStep      = ceresData.get('timeStep'              , None)
        cdRetentions    = ceresData.get('retentions'            , None)
        cdXFilesFactor  = ceresData.get('xFilesFactor'          , None)
        cdAggregation   = ceresData.get('aggregationMethod'     , None)

        updateReasons = ""
        if (cdTimeStep      != timeStep     ):  updateReasons += 't'
        if (cdRetentions    != retentions   ):  updateReasons += 'r'
        if (cdXFilesFactor  != 0.5          ):  updateReasons += 'x'
        if (cdAggregation   != 'average'    ):  updateReasons += 'a'

        if not self.updateStatsDict.get(updateReasons, None):
            self.updateStatsDict[updateReasons] = 0
        self.updateStatsDict[updateReasons] += 1

        if (not updateReasons):
            self.okayFiles += 1
            # self.writeLog( "Ceres Node has all keys stored correctly.")
            # EVERYTHING IS OKAY WITH THIS FILE, CONTINUE !
            return
            
        ceresData['timeStep'            ] = timeStep
        ceresData['retentions'          ] = retentions
        ceresData['xFilesFactor'        ] = 0.5
        ceresData['aggregationMethod'   ] = 'average'
        if ceresData.has_key("aggregation"):
            # should be 'aggregationMethod' not 'aggregation'
            del ceresData['aggregation' ]  

        try:
            with open(metadataFile, 'w') as mdf:
                json.dump(ceresData, mdf)
                self.filesChanged += 1
                if self.debug:
                    self.writeLog( "CHANGED FILE %s to %s" % (metadataFile, ceresData))
        except:
            msg = "ERROR: COULD NOT WRITE UPDATED CERES-NODE FILE: %s" % (traceback.format_exc())
            self.writeLog(msg)
        return

    def removeJunkFiles(self, inpath, infiles):
        for f in infiles:
            fullpath = "%s/%s" % (inpath, f)
            if (f == '.ceres-node'):
                # these are okay
                continue
            if (f.count('tree') != 0):
                # root of datastore might contain a file named ceres-tree
                continue
            if (f.count('slice') == 0):
                try:
                    os.remove(fullpath)
                    self.writeLogFileOnly("WARNING:  removed non-slice file: %s" % (fullpath))
                    if self.debug:
                        print "removing file: %s" % (fullpath)
                    assert not os.path.exists(fullpath), "file %s should no longer exist, yet it does." % (fullpath)
                    self.rmNonslice += 1
                except:
                    msg = "Could not remove non-slice file: %s, msg: %s" % (filename, traceback.format_exc())
                    self.writeLog(msg)
        return

    def fixupFiles(self):

        # convert .ceres-node from a dir to a file for metadata
        startTime               = self.getNowTime()
        self.lastStatusTime     = startTime
        self.updateStatsDict    = {}
        self.okayFiles          = 0
        self.emptyFiles         = 0

        for (thisPath, theseDirs, theseFiles) in os.walk(self.basedir, topdown=False):
            self.printStatus()
            metadataFile = "%s/.ceres-node" % (thisPath)

            if self.debug:
                self.writeLog("Path: %s, theseFiles=%s, thesedirs=%s" % (thisPath, theseFiles, theseDirs))

            if (thisPath.count('.ceres-tree') > 0):
                self.writeLog("FOUND CERES TREE DIRECTORY, SKIPPING, Path: %s, theseFiles=%s, thesedirs=%s" % (thisPath, theseFiles, theseDirs))
                continue

            deleteDir = False
            haveSlices      = [x for x in theseFiles if x != '.ceres-node']
            haveCeresNode   = [x for x in theseFiles if x == '.ceres-node']
            haveSubdirs     = (len(theseDirs) > 0)

            self.removeJunkFiles(thisPath, theseFiles)

            if (haveSubdirs and haveSlices):
                # don't do anything, manual fixup, issue warning.
                self.haveIntermidateWithSlices(thisPath)
                continue

            if (haveSubdirs and not haveSlices and not haveCeresNode):
                # normal situation, intermediate dir, contininue.
                continue
            
            if (haveSubdirs and haveCeresNode and not haveSlices):
                # delete ceresnode file, extraneous and prevents Ceres from reading rest of the tree.
                self.removeFile(metadataFile)
                continue
            
            if (not haveSubdirs and not haveSlices and haveCeresNode):
                # regardless if there's a .ceres-node file, if no subdirs and no slices, we want to delete the dir.
                self.removeFile(metadataFile)
                self.deleteDir(thisPath)
                continue

            if (not haveSubdirs and not haveSlices and not haveCeresNode):
                # regardless if there's a .ceres-node file, if no subdirs and no slices, we want to delete the dir.
                self.deleteDir(thisPath)
                continue

            if (haveSlices and not haveCeresNode):
                # missing ceres node file, create empty one, will be corrected later.
                with open(metadataFile, 'w') as mdf:
                    json.dump({}, mdf)

            self.fixCeresNodeFile(thisPath, metadataFile)
          
            if self.debug:
                msg = "*" * 80
                self.writeLog(msg + "\nexiting, in debug mode.")
                break

        endTime = time.time()
        self.printStatus(force=True)
        self.writeLog( "now = %s, started at %s, elapsed time = %s seconds." % (startTime, endTime, endTime - startTime))
        self.writeLog( "Done.")


    def writeLog(self, instring):
        if 1: #self.verbose:
            print instring
        print >> self.LOGFILE, instring
        self.LOGFILE.flush()

    def writeLogFileOnly(self, instring):
        print >> self.LOGFILE, instring
        self.LOGFILE.flush()


    def main(self):
        self.getOptions()
        self.getRules()
        self.createRegexObjects()
        self.fixupFiles()

###############################################################################

class MockOptionParser(object):

    def __init__(self):
        class Dumb(object):
            def __init__(self):
                self.debug      = None
                self.verbose    = None
                self.basedir    = "a"
                self.rulesfile  = 'a'
            pass
        self.options = Dumb()

    def add_option(self, *args, **kwargs):
        pass

    def parse_args(self):
        return self.options, None


###############################################################################

class TestCeresNodeFixup(unittest.TestCase):

    '''
    Test Cases:

    | Ceres Node File:   |           |           |
    | present/OK         | Slice     |           | test
    | absent             | Files     | subdirs   | case
    | incorrect          | Present   | present   | name
    ------------------------------------------------------
    | OK                 | YES       |  YES      | CNFok_slice_subdirs
    | OK                 | YES       |  NO       | CNFok_slice_nosubdirs
    | OK                 | NO        |  YES      | CNFok_noslice_subdirs
    | OK                 | NO        |  NO       | CNFok_noslice_nosubdirs
    | Absent             | YES       |  YES      | CNFmissing_slice_subdirs
    | Absent             | YES       |  NO       | CNFmissing_slice_nosubdirs
    | Absent             | NO        |  YES      | CNFmissing_noslice_subdirs
    | Absent             | NO        |  NO       | CNFmissing_noslice_nosubdirs
    | Incorrect          | YES       |  YES      | CNFbad_slice_subdirs
    | Incorrect          | YES       |  NO       | CNFbad_slice_nosubdirs
    | Incorrect          | NO        |  YES      | CNFbad_noslice_subdirs
    | Incorrect          | NO        |  NO       | CNFbad_noslice_nosubdirs

    '''

    @classmethod
    def tearDownClass(cls):
        import glob
        dirname = "/tmp/delete.me.testing.*"
        res = glob.glob(dirname)
        print "res: %s" % (res)
        for r in res:
            try:
                print "dirname to delete: %s" % (r)
                res = shutil.rmtree(r, ignore_errors=True)
                print "result of rm: %s" % (res)
            except:
                print "Cannot remove directory : %s" % (r) 

    def doNothing(self, *args, **kwargs):
        pass

    def was_myroutine_called(self):
        return self.myroutinecalled
    
    def myroutine(self, *inargs):
        self.myroutinecalled = True        

    def test_trivial(self):
        return True

    def test_getOptionParser(self):
        cnf = CeresNodeFixup()
        cnf.getOptionParser()

    def test_getNowTime(self):
        cnf = CeresNodeFixup()
        cnf.getNowTime()

    def returnMockOptionParser(self):
        return MockOptionParser()

    def test_getOptions(self):
        cnf = CeresNodeFixup()
        cnf.getOptionParser = self.returnMockOptionParser
        cnf.getOptions()

    def test_instantiate(self):
        cnf = CeresNodeFixup()

    def CNFok_slice_subdirs(self):
        pass

    def doAssertsOnCnf(self):
        metadataFile = self.testDir + '/.ceres-node'
        assert os.path.exists(metadataFile)
        with open(metadataFile, 'r') as mdf:
            gotBack = json.load(mdf)
        assert gotBack.get('timeStep'           , None), "should have gotten back timeStep     , did not. got back: %s" % (pformat(gotBack))
        assert gotBack.get('retentions'         , None), "should have gotten back retentions   , did not. got back: %s" % (pformat(gotBack))
        assert gotBack.get('xFilesFactor'       , None), "should have gotten back xFilesFactor , did not. got back: %s" % (pformat(gotBack))
        assert gotBack.get('aggregationMethod'  , None), "should have gotten back aggregation  , did not. got back: %s" % (pformat(gotBack))

    def assertCnfFileRemoved(self):
        metadataFile = self.testDir + '/.ceres-node'
        assert not os.path.exists(metadataFile), "ceres-node file should not exist, but it still does: %s" % (metadataFile)

    def assertCnfFileExistsAndIsGood(self):
        metadataFile = self.testDir + '/.ceres-node'
        assert os.path.exists(metadataFile), "ceres-node file should exist, but missing: %s" % (metadataFile)
        
        with open(metadataFile, "r") as mdf:
            ceresData = json.load(mdf)

        assert ceresData.get('timeStep'              , None), "ERROR:  .ceres-node file should have value for key=%s" % ('timeStep'          )
        assert ceresData.get('retentions'            , None), "ERROR:  .ceres-node file should have value for key=%s" % ('retentions'        )
        assert ceresData.get('xFilesFactor'          , None), "ERROR:  .ceres-node file should have value for key=%s" % ('xFilesFactor'      )
        assert ceresData.get('aggregationMethod'     , None), "ERROR:  .ceres-node file should have value for key=%s" % ('aggregationMethod' )

    def assertDirRemoved(self):
        assert not os.path.exists(self.testDir), "test directory should have been removed, but it still does: %s" % (self.testDir)


    def test_removeNonsliceFiles(self):
        self.prepareScenario(cnfStatus='okay', slices=True, subdirs=False)
        newFilename1 = self.testDir + "/blahFilename_should_be_gone"
        open(newFilename1, 'a').close() # touch the test file 1.
        newFilename2 = self.testDir + "/1000000@60.slice"
        open(newFilename2, 'a').close() # touch the test file 2.
        assert os.path.exists(newFilename1), "test file 1 should exist."
        assert os.path.exists(newFilename2), "test file 2 should exist."
        self.cnf.fixupFiles()
        assert not os.path.exists(newFilename1), "test file 1 should have been removed."
        assert os.path.exists(newFilename2),     "test file 2 should NOT have been removed."

    ####

    def test_CNFok_slice_subdirs(self):
        # /a/b/111.slice, /a/b/.ceres-node, PLUS subdirs.  Print error message!
        self.prepareScenario(cnfStatus='okay', slices=True, subdirs=False)
        # should leave everything alone.
        self.cnf.fixupFiles()
        assert os.path.exists(self.testDir)
        self.doAssertsOnCnf()

    def test_CNFok_slice_nosubdirs(self):
        self.prepareScenario(cnfStatus='okay', slices=True, subdirs=False)
        # should leave everything alone.
        self.cnf.fixupFiles()
        assert os.path.exists(self.testDir)
        self.doAssertsOnCnf()

    def test_CNFok_noslice_subdirs(self):
        self.prepareScenario(cnfStatus='okay', slices=False, subdirs=True)
        # should leave it alone; no slice files but do have subdirs, so don't delete dir.
        self.cnf.fixupFiles()
        self.assertCnfFileRemoved()
        assert os.path.exists(self.testDir), "directory should still exist, there were subdirs: %s" % (self.testDir)

    def test_CNFok_noslice_nosubdirs(self):
        self.prepareScenario(cnfStatus='okay', slices=False, subdirs=False)
        # should eliminate empty directory.
        self.cnf.fixupFiles()
        self.assertCnfFileRemoved()
        self.assertDirRemoved()

    ##------------

    def test_CNFmissing_slice_subdirs(self):
        self.prepareScenario(cnfStatus='missing', slices=True, subdirs=True)
        self.myroutinecalled = False
        self.cnf.haveIntermidateWithSlices = self.myroutine
        self.cnf.fixupFiles()
        # effed-up directory: have slices, but no ceres-node file, warn about this, but do nothing.
        assert self.was_myroutine_called, "warning routine 'haveIntermediateWithSlices() was NOT called, should have been."
        self.assertCnfFileRemoved()  # make sure we didn't add a .ceres-node file.
        
    def test_CNFmissing_slice_nosubdirs(self):
        self.prepareScenario(cnfStatus='missing', slices=True, subdirs=False)
        self.cnf.fixupFiles()
        self.assertCnfFileExistsAndIsGood()

    def test_CNFmissing_noslice_subdirs(self):
        # intermediate dir, no slice and no cnf, but since has subdirs, is normal intermediate
        self.prepareScenario(cnfStatus='missing', slices=False, subdirs=True)
        self.cnf.fixupFiles()
        self.assertCnfFileRemoved()  # make sure we didn't add a .ceres-node file.
        assert os.path.exists(self.testDir), "test directory should still exist."

    def test_CNFmissing_noslice_nosubdirs(self):
        # leaf node, no .ceres-node, no slice files, no subdirs: delete this path.
        self.prepareScenario(cnfStatus='missing', slices=False, subdirs=False)
        self.cnf.fixupFiles()  
        self.assertDirRemoved()

    ##------------

    def test_CNFbad_slice_subdirs(self):
        # effed-up directory: have slices, but no ceres-node file, warn about this, but do nothing.
        self.prepareScenario(cnfStatus='bad', slices=True, subdirs=True)
        self.cnf.fixupFiles()
        self.myroutinecalled = False
        self.cnf.haveIntermidateWithSlices = self.myroutine
        assert self.was_myroutine_called, "warning routine 'haveIntermediateWithSlices() was NOT called, should have been."
        
    def test_CNFbad_slice_nosubdirs(self):
        # normal leaf node, just fix the cnf file.
        self.prepareScenario(cnfStatus='bad', slices=True, subdirs=False)
        self.cnf.fixupFiles()
        self.assertCnfFileExistsAndIsGood()

    def test_CNFbad_noslice_subdirs(self):
        # intermediate dir, have extra cnf file we need to remove.
        self.prepareScenario(cnfStatus='bad', slices=False, subdirs=True)
        self.cnf.fixupFiles()
        self.assertCnfFileRemoved()  # make sure we didn't add a .ceres-node file.

    def test_CNFbad_noslice_nosubdirs(self):
        # should remove slice file and directory both.
        self.prepareScenario(cnfStatus='bad', slices=False, subdirs=False)
        self.cnf.fixupFiles()
        self.assertDirRemoved()
        self.assertCnfFileRemoved()  # make sure we didn't add a .ceres-node file.

    def prepareScenario(self, cnfStatus=None, slices=None, subdirs=None):
        assert cnfStatus    != None
        assert slices       != None
        assert subdirs      != None

        self.cnf = CeresNodeFixup()
        self.cnf.getOptions          = self.doNothing
        self.cnf.getNowTime          = self.getNowTime
        self.cnf.defineRules         = self.doNothing
        self.cnf.assignCorrectRules  = self.doNothing
        self.cnf.rules               = [ { "name": "testDirOne_Rulename_One", "pattern": r"^a123\.b234\..*\.ddd", "retentions": "5:241920" }, ]
        self.cnf.verbose             = True

        self.cnf.createRegexObjects()
        newDir = "/tmp/delete.me.testing.%d" % (int(random.random() * 1000 * 1000 * 1000))
        os.mkdir(newDir)
        assert os.path.exists(newDir)
        newDirFull = newDir+"/a123/b234/xxx/ddd"
        if os.path.exists(newDirFull):
            shutil.rmtree(newDirFull)
        os.makedirs(newDirFull)

        assert cnfStatus in ['missing', 'okay', 'bad' ], "cnf bad value: %s" % (cnf)
        if (cnfStatus == 'missing'):
            cnfContents = None
        if (cnfStatus == 'okay'):
            cnfContents = { 'timeStep' : 60, 'retentions': [[60, 43200]], 'xFilesFactor' : 0.5, 'aggregationMethod': 'average' }
        if (cnfStatus == 'bad'):
            cnfContents = { 'timeStep' : 60 }

        if cnfContents:
            cnfFilename = newDirFull + '/.ceres-node'
            with open(cnfFilename, 'w') as mdf:
                json.dump(cnfContents, mdf)
            assert os.path.exists(cnfFilename)

        if slices:
            sliceFilename = newDirFull + '/100000@60.slice'
            with open(sliceFilename, "w") as sfd:
                sfd.write("a" * 80)
            assert os.path.exists(sliceFilename)

        if subdirs:
            newDirName = newDirFull + "/subdirname"
            os.mkdir(newDirName)
            # make a file in this dir so the dir won't go away.
            fileInNewDir = newDirName + "/fileGoesHere"
            with open(fileInNewDir, "w") as ndf:
                ndf.write("b" * 80)

        self.cnf.basedir = newDir
        self.testDir = newDirFull
        return

    def getNowTime(self):
        if not getattr(self, "timeIndex", None):
            self.timeIndex = 0
        timeArray = [ x*20 for x in range(0, 200)]
        retVal = timeArray[self.timeIndex]
        self.timeIndex += 1
        return retVal


###############################################################################

if __name__ == '__main__':

    cnf = CeresNodeFixup()
    cnf.main()

###############################################################################
###############################################################################
###############################################################################
###############################################################################



