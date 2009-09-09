import time, socket
from twisted.internet.task import LoopingCall
from carbon.cache import MetricCache


stats = {}
HOSTNAME = socket.gethostname().replace('.','_')


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


def record():
  myStats = stats.copy()
  stats.clear()

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
  
  store('updateOperations', len(updateTimes))
  store('committedPoints', committedPoints)
  store('creates', creates)
  store('errors', errors)

  store('cache.queries', cacheQueries)
  store('cache.queues', len(MetricCache))
  store('cache.size', MetricCache.size)


def store(metric, value):
  fullMetric = 'carbon.agents.%s.%s' % (HOSTNAME, metric)
  datapoint = (time.time(), value)
  MetricCache.store(fullMetric, datapoint)


recorder = LoopingCall(record)
