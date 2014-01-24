#!/usr/bin/env python2.6
################################################################################

import traceback

class MockLogger(object):
    
    def __init__(self, loglevel=0):
        self.level = loglevel
        if (self.level == 'debug'):  self.level = 0
        if (self.level == 'info' ):  self.level = 1
        if (self.level == 'warn' ):  self.level = 2
        if (self.level == 'error'):  self.level = 3
        if (self.level == 'crit' ):  self.level = 4
        if (self.level == 'silent'): self.level = 5
        #if self.level == 0:
        #    print "MockLogger.__init__(): loglevel set at 0."
        
    def exception(self, instring):
        # same as crit, but with traceback.
        if (self.level >= 5): return
        tb = traceback.format_exc()
        print "MockLogger.EXCEPTION:%s %s" % (instring, tb)
        
    def critical(self, instring):
        if (self.level >= 5): return
        print "MockLogger.CRITICAL: %s" % (instring )
        
    def error(self, instring):   
        if (self.level >= 4): return
        print "MockLogger.ERROR   : %s" % (instring )
        
    def warn(self, instring):
        if (self.level >= 3): return
        print "MockLogger.WARNING : %s" % (instring )
        
    def warning(self, instring):
        if (self.level >= 3): return
        print "MockLogger.WARNING : %s" % (instring )
        
    def info(self, instring):
        if (self.level >= 2): return
        print "MockLogger.INFO    : %s" % (instring )
        
    def debug(self, instring):
        if (self.level >= 1): return
        print "MockLogger.DEBUG   : %s" % (instring )
        
        

################################################################################
################################################################################
################################################################################
