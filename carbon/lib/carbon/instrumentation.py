import time
import socket
from resource import getrusage, RUSAGE_SELF
from twisted.internet.task import LoopingCall
from carbon.cache import MetricCache
from carbon.relay import relay, RelayServers


stats = {}
HOSTNAME = socket.gethostname().replace('.','_')
recordTask = None
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


# Cache metrics
def startRecordingCacheMetrics():
  global recordTask
  assert not recordTask, "Already recording metrics"
  recordTask = LoopingCall(recordCacheMetrics)
  recordTask.start(60, now=False)


def recordCacheMetrics():
  global lastUsage
  myStats = stats.copy()
  stats.clear()

  metricsReceived = myStats.get('metricsReceived', 0)
  updateTimes = myStats.get('updateTimes', [])
  committedPoints = myStats.get('committedPoints', 0)
  creates = myStats.get('creates', 0)
  errors = myStats.get('errors', 0)
  cacheQueries = myStats.get('cacheQueries', 0)

  if updateTimes:
    avgUpdateTime = sum(updateTimes) / len(updateTimes)
    store('avgUpdateTime', avgUpdateTime)

  if committedPoints:
    pointsPerUpdate = len(updateTimes) / committedPoints
    store('pointsPerUpdate', pointsPerUpdate)

  store('metricsReceived', metricsReceived)
  store('updateOperations', len(updateTimes))
  store('committedPoints', committedPoints)
  store('creates', creates)
  store('errors', errors)

  store('cache.queries', cacheQueries)
  store('cache.queues', len(MetricCache))
  store('cache.size', MetricCache.size)

  store('cpuUsage', getCpuUsage())


def store(metric, value):
  fullMetric = 'carbon.agents.%s.%s' % (HOSTNAME, metric)
  datapoint = (time.time(), value)
  MetricCache.store(fullMetric, datapoint)


# Relay metrics
def startRecordingRelayMetrics():
  global recordTask
  assert not recordTask, "Already recording metrics"
  recordTask = LoopingCall(recordRelayMetrics)
  recordTask.start(60, now=False)


def recordRelayMetrics():
  myStats = stats.copy()
  stats.clear()

  # global metrics
  send('metricsReceived', myStats.get('metricsReceived', 0))
  send('cpuUsage', getCpuUsage())

  # per-destination metrics
  for server in RelayServers:
    prefix = 'destinations.%s.' % server.destinationName

    for metric in ('attemptedRelays', 'sent', 'queuedUntilReady', 'queuedUntilConnected', 'fullQueueDrops'):
      metric = prefix + metric
      send(metric, myStats.get(metric, 0))

    send(prefix + 'queueSize', len(server.queue))


def send(metric, value):
  fullMetric = 'carbon.relays.%s.%s' % (HOSTNAME, metric)
  datapoint = (time.time(), value)
  relay(fullMetric, datapoint)
