#!/usr/bin/env python2.6
###############################################################################

import sys
import time
import os
from os.path import join, exists
import traceback

from pymongo.errors import AutoReconnect, OperationFailure, DuplicateKeyError

from dcm.dcmSettings import *
from dcm.mods.metricValue import MetricValue, BadMetricTimestampException, BadMetricValueException
from dcm.mods.metricType import BadMetricNameException
from dcm.mods.mockLogger import MockLogger
from dcm.mods.genericWriter import GenericWriter
from dcm.mods.stats import Stats

###############################################################################


class MongoMetricWriter(GenericWriter):
    '''Reads from a queue (supplied by sender) and writes metrics to mongodb'''
    
    def initializeVars(self):
        self.stats = Stats(
            'readFromQueue', 'written', 'writeErrors', 'metricsDropped',
            'badMetrics', 'queueSize', 'storedOfflineBytes', 'timeSpentWriting',
            'storingOfflineRecords', 'retrievedOfflineRecords', 'queueEmpty',
            'events',
            'badParse', 'requeued', 'queueFull')
        for x in 'queueSize', 'storedOfflineBytes':
            self.stats.set_rate(x, False) # Do not convert these to rates
        self.writerMaxQueueItems        = MONGO_WRITER_MAX_QUEUE_ITEMS
        self.writerMaxQueueHysteresis   = MONGO_WRITER_MAX_QUEUE_HYSTERESIS

    def getStorageFilePrefix(self):
        return 'mongoMetric.queue'

    def parseEvent(self, event):
        fail = (None, None, None, None)
        if not event:
            return fail
        if not type(event) == type(dict()):
            return fail
        path        = event.get('parsedMetricPath'      , None)
        value       = event.get('parsedMetricValue'     , None)
        timestamp   = event.get('parsedMetricTimestamp' , None)
        msg = "Event must have path, timestamp, non-None value, does not: %s" % (event)
        assert path and timestamp and (value is not None), msg
        return (path, value, timestamp)
    
    def nowTime(self):
        # factored out for unit tests.
        return time.time()

    def getAndWriteLoop(self):
        MV = MetricValue(mongo_server=self.mongo_server, mongo_port=self.mongo_port, logger=self.logger)
        try:        
            while not self.done:
                self.doTasksAtInterval()
                event = None
                try:
                    event = self.queue.get(True, 10) # block for max of 10 seconds.
                except: # Queue empty
                    self.stats.queueEmpty += 1
                    continue
                self.stats.readFromQueue += 1
                name = "Uninitialized"
                requeue  = False
                try:
                    name, value, timestamp = self.parseEvent(event)
                except:
                    self.stats.badParse += 1
                    tb = traceback.format_exc()
                    self.logger.warning("Bad parse, event: %s, tb: %s" % (event, tb))
                    # problem parsing means bad data and don't try this event again.
                    continue
                if (not name) or (value is None) or (not timestamp):
                    self.logger.warning("Have event without name/val/timestamp: n %s / v %s / ts %s" % (name, value, timestamp))
                    self.stats.readFromQueue -= 1
                    self.stats.badMetrics += 1
                    continue
                try:
                    t0 = time.time()
                    MV.addMeasurement(name, value, timestamp)
                    self.stats.timeSpentWriting += (time.time() - t0)
                    self.stats.written += 1
                    requeue  = False
                except AutoReconnect:
                    requeue = True
                    self.logger.warning("mongoMetricWriter.getAndWriteLoop(): AutoReconnect")
                    self.stats.writeErrors += 1
                except (BadMetricNameException, BadMetricTimestampException, BadMetricValueException), e:
                    requeue = False
                    self.logger.warning("mongoMetricWriter.getAndWriteLoop(), bmne/bmts/bmve: %s %s" % (e, event))
                    self.stats.badMetrics += 1
                except DuplicateKeyError, e:
                    requeue = True
                    self.logger.error("mongoMetricWriter.getAndWriteLoop(), dupekey: %s %s" % (e, name))
                    self.stats.writeErrors += 1
                except OperationFailure, e:
                    requeue = True
                    self.logger.warning(str(e))
                    self.stats.writeErrors += 1
                except Exception, e:                    
                    self.logger.error("mongoMetricWriter.getAndWriteLoop() Failed save of metric: %s data: %s" % (e, event))
                    requeue = False
                if requeue:
                    self.stats.requeued += 1
                    self.stats.readFromQueue -= 1
                    self.queue.put(event) 
        except:
            self.logger.error(traceback.format_exc())

    def stop(self):
        self.done = True
    
