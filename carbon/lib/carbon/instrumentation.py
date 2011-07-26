import os
import time
import socket
from resource import getrusage, RUSAGE_SELF

from twisted.application.service import Service
from twisted.internet.task import LoopingCall
from carbon.conf import settings


stats = {}
HOSTNAME = socket.gethostname().replace('.','_')
PAGESIZE = os.sysconf('SC_PAGESIZE')
rusage = getrusage(RUSAGE_SELF)
lastUsage = rusage.ru_utime + rusage.ru_stime
lastUsageTime = time.time()


def increment(stat, increase=1):
  try:
    stats[stat] += increase
  except KeyError:
    stats[stat] = increase


def append(stat, value):
  try:
    stats[stat].append(value)
  except KeyError:
    stats[stat] = [value]


def getCpuUsage():
  global lastUsage, lastUsageTime

  rusage = getrusage(RUSAGE_SELF)
  currentUsage = rusage.ru_utime + rusage.ru_stime
  currentTime = time.time()

  usageDiff = currentUsage - lastUsage
  timeDiff = currentTime - lastUsageTime

  if timeDiff == 0: #shouldn't be possible
    timeDiff = 0.000001

  cpuUsagePercent = (usageDiff / timeDiff) * 100.0

  lastUsage = currentUsage
  lastUsageTime = currentTime

  return cpuUsagePercent


def getMemUsage():
  rss_pages = int( open('/proc/self/statm').read().split()[1] )
  return rss_pages * PAGESIZE


def startRecording():
  global recordTask


def recordMetrics():
  global lastUsage
  myStats = stats.copy()
  stats.clear()

  # cache metrics
  if settings.program == 'carbon-cache':
    record = cache_record
    updateTimes = myStats.get('updateTimes', [])
    committedPoints = myStats.get('committedPoints', 0)
    creates = myStats.get('creates', 0)
    errors = myStats.get('errors', 0)
    cacheQueries = myStats.get('cacheQueries', 0)
    cacheOverflow = myStats.get('cache.overflow', 0)

    if updateTimes:
      avgUpdateTime = sum(updateTimes) / len(updateTimes)
      record('avgUpdateTime', avgUpdateTime)

    if committedPoints:
      pointsPerUpdate = len(updateTimes) / committedPoints
      record('pointsPerUpdate', pointsPerUpdate)

    record('updateOperations', len(updateTimes))
    record('committedPoints', committedPoints)
    record('creates', creates)
    record('errors', errors)
    record('cache.queries', cacheQueries)
    record('cache.queues', len(MetricCache))
    record('cache.size', MetricCache.size)
    record('cache.overflow', cacheOverflow)

  # relay metrics
  elif settings.program == 'carbon-relay':
    record = relay_record
    for connection in clientConnections:
      prefix = 'destinations.%s.' % connection.destinationName

      for metric in ('attemptedRelays', 'sent', 'queuedUntilReady',
                     'queuedUntilConnected', 'fullQueueDrops'):
        metric = prefix + metric
        record(metric, myStats.get(metric, 0))

      record(prefix + 'queueSize', len(connection.queue))

  # aggregator metrics
  elif settings.program == 'carbon-aggregator':
    record = aggregator_record
    record('allocatedBuffers', len(BufferManager))
    record('bufferedDatapoints',
           sum([b.size for b in BufferManager.buffers.values()]))
    record('datapointsReceived', myStats.get('datapointsReceived', 0))
    record('aggregateDatapointsSent', myStats.get('aggregateDatapointsSent', 0))

  # common metrics
  record('metricsReceived', myStats.get('metricsReceived', 0))
  record('cpuUsage', getCpuUsage())
  try: # This only works on Linux
    record('memUsage', getMemUsage())
  except:
    pass


def cache_record(metric, value):
  if settings.instance is None:
    fullMetric = 'carbon.agents.%s.%s' % (HOSTNAME, metric)
  else:
    fullMetric = 'carbon.agents.%s-%s.%s' % (
        HOSTNAME, settings.instance, metric)
  datapoint = (time.time(), value)
  MetricCache.store(fullMetric, datapoint)

def relay_record(metric, value):
  fullMetric = 'carbon.relays.%s.%s' % (HOSTNAME, metric)
  datapoint = (time.time(), value)
  relay(fullMetric, datapoint)

def aggregator_record(metric, value):
  fullMetric = 'carbon.aggregator.%s.%s' % (HOSTNAME, metric)
  datapoint = (time.time(), value)
  send_metric(fullMetric, datapoint)


class InstrumentationService(Service):

    def __init__(self):
        self.record_task = LoopingCall(recordMetrics)

    def startService(self):
        self.record_task.start(60, False)
        Service.startService(self)

    def stopService(self):
        self.record_task.stop()
        Service.stopService(self)


# Avoid import circularity
from carbon.aggregator.buffers import BufferManager
from carbon.aggregator.client import send_metric
from carbon.relay import relay, clientConnections
from carbon.cache import MetricCache
