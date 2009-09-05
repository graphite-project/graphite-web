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


from os.path import exists
from time import sleep
from threading import Thread
from twisted.python.log import log
from twisted.internet import reactor
from carbon.cache import MetricCache
from carbon.storage import getFilesystemPath, loadStorageSchemas
from carbon.conf import settings


def optimalWriteOrder():
  "Generates metrics with the most cached values first and applies a soft rate limit on new metrics"
  metrics = [ (metric, len(datapoints)) for metric,datapoints in MetricCache.items() ]
  metrics.sort(key=lambda item: item[1], reverse=True) # by queue size, descending

  cacheSize = len(metrics)
  newCount = 0
  newLimit = int( cacheSize * settings.METRIC_CREATION_RATE )

  if newLimit < 10: # ensure we always do at least some creates
    newLimit = 10

  for metric, queueSize in metrics:
    dbFilePath = getFilesystemPath(metric)
    dbFileExists = exists(dbFilePath)

    if not dbFileExists:
      newCount += 1
      if newCount >= newLimit:
        continue

    try: # metrics can momentarily disappear from the MetricCache due to the implementation of MetricCache.store()
      datapoints = MetricCache.popMetric(metric)
    except KeyError:
      continue # we simply move on to the next metric when this race condition occurs

    yield (dbFilePath, datapoints, dbFileExists)


def writeCachedDataPoints():
  "Write datapoints until the MetricCache is completely empty"
  while MetricCache:
    for (dbFilePath, datapoints, dbFileExists) in optimalWriteOrder():

      if not dbFileExists:
        for schema in schemas:
          if schema.matches(metric):
            log.msg('new metric %s matched schema %s' % (metric, schema.name))
            archiveConfig = [archive.getTuple() for archive in schema.archives]
            break

        whisper.create(dbFilepath, archiveConfig)

      whisper.update_many(dbFilePath, datapoints)


def writeForever():
  while reactor.running:
    try:
      writeCachedDataPoints()
    except:
      log.err()

    sleep(1) # The writer thread only sleeps when the cache is empty or an error occurs


def reloadStorageSchemas():
  global schemas
  try:
    schemas = loadStorageSchemas()
  except:
    log.err("Failed to reload storage schemas")


writerThread = Thread(target=writeForever)
schemaReloadTask = LoopingCall(reloadStorageSchemas)


def startWriter():
  schemaReloadTask.start(60)
  reactor.callWhenRunning(writerThread.start)
