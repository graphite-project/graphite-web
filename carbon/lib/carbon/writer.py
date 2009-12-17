"""Copyright 2009 Chris Davis

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""


import os
import time
from os.path import join, exists, dirname, basename
from threading import Thread
from twisted.internet import reactor
from twisted.internet.task import LoopingCall
import whisper
from carbon.cache import MetricCache
from carbon.storage import getFilesystemPath, loadStorageSchemas
from carbon.conf import settings
from carbon.instrumentation import increment, append
from carbon import log
try:
  import cPickle as pickle
except ImportError:
  import pickle


lastCreateInterval = 0
createCount = 0

def optimalWriteOrder():
  "Generates metrics with the most cached values first and applies a soft rate limit on new metrics"
  global lastCreateInterval
  global createCount
  metrics = [ (metric, len(datapoints)) for metric,datapoints in MetricCache.items() ]

  t = time.time()
  metrics.sort(key=lambda item: item[1], reverse=True) # by queue size, descending
  log.msg("Sorted %d cache queues in %.6f seconds" % (len(metrics), time.time() - t))

  for metric, queueSize in metrics:
    dbFilePath = getFilesystemPath(metric)
    dbFileExists = exists(dbFilePath)

    if not dbFileExists:
      createCount += 1
      now = time.time()

      if now - lastCreateInterval >= 60:
        lastCreateInterval = now
        createCount = 1

      elif createCount >= settings.MAX_CREATES_PER_MINUTE:
        continue

    try: # metrics can momentarily disappear from the MetricCache due to the implementation of MetricCache.store()
      datapoints = MetricCache.pop(metric)
    except KeyError:
      log.msg("MetricCache contention, skipping %s update for now" % metric)
      continue # we simply move on to the next metric when this race condition occurs

    yield (metric, datapoints, dbFilePath, dbFileExists)


def writeCachedDataPoints():
  "Write datapoints until the MetricCache is completely empty"
  updates = 0
  lastSecond = 0

  while MetricCache:
    dataWritten = False

    for (metric, datapoints, dbFilePath, dbFileExists) in optimalWriteOrder():
      dataWritten = True

      if not dbFileExists:
        for schema in schemas:
          if schema.matches(metric):
            log.creates('new metric %s matched schema %s' % (metric, schema.name))
            archiveConfig = [archive.getTuple() for archive in schema.archives]
            break

        dbDir = dirname(dbFilePath)
        os.system("mkdir -p '%s'" % dbDir)

        log.creates("creating database file %s" % dbFilePath)
        whisper.create(dbFilePath, archiveConfig)
        increment('creates')

        # Create metadata file
        dbFileName = basename(dbFilePath)
        metaFilePath = join(dbDir, dbFileName[ :-len('.wsp') ] + '.context.pickle')
        createMetaFile(metric, schema, metaFilePath)

      try:
        t1 = time.time()
        whisper.update_many(dbFilePath, datapoints)
        t2 = time.time()
        updateTime = t2 - t1
      except:
        log.err()
        increment('errors')
      else:
        pointCount = len(datapoints)
        log.updates("wrote %d datapoints for %s in %.5f seconds" % (pointCount, metric, updateTime))
        increment('committedPoints', pointCount)
        append('updateTimes', updateTime)

        # Rate limit update operations
        thisSecond = int(t2)

        if thisSecond != lastSecond:
          lastSecond = thisSecond
          updates = 0
        else:
          updates += 1
          if updates >= settings.MAX_UPDATES_PER_SECOND:
            time.sleep( int(t2 + 1) - t2 )

    # Avoid churning CPU when only new metrics are in the cache
    if not dataWritten:
      time.sleep(0.1)


def createMetaFile(metric, schema, path):
  metadata = {
    'interval' : min( [a.secondsPerPoint for a in schema.archives] ),
  }

  fh = open(path, 'wb')
  pickle.dump(metadata, fh, protocol=-1)
  fh.close()


def writeForever():
  while reactor.running:
    try:
      writeCachedDataPoints()
    except:
      log.err()

    time.sleep(1) # The writer thread only sleeps when the cache is empty or an error occurs


def reloadStorageSchemas():
  global schemas
  try:
    schemas = loadStorageSchemas()
  except:
    log.msg("Failed to reload storage schemas")
    log.err()


schemaReloadTask = LoopingCall(reloadStorageSchemas)


def startWriter():
  schemaReloadTask.start(60)
  reactor.callInThread(writeForever)
