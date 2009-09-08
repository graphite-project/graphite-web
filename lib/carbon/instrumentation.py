import time
from twisted.internet.task import LoopingCall
from carbon.cache import MetricCache


stats = {}

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
  timestamp = time.time()

  updateTimes = myStats.get('updateTimes', [])
  committedPoints = myStats.get('committedPoints', 0)
  creates = myStats.get('creates', 0)
  errors = myStats.get('errors', 0)
  cacheQueries = myStats.get('cacheQueries', 0)

  if updateTimes:
    avgUpdateTime = sum(updateTimes) / len(updateTimes)
    MetricCache.store('avgUpdateTime', (timestamp, avgUpdateTime))

  if committedPoints:
    pointsPerUpdate = len(updateTimes) / committedPoints
    MetricCache.store('pointsPerUpdate', (timestamp, pointsPerUpdate))
  
  MetricCache.store('updateOperations', (timestamp, len(updateTimes)))
  MetricCache.store('committedPoints', (timestamp, committedPoints))
  MetricCache.store('creates', (timestamp, creates))
  MetricCache.store('errors', (timestamp, errors))

  MetricCache.store('cache.queries', (timestamp, cacheQueries))
  MetricCache.store('cache.queues', (timestamp, len(MetricCache)))
  MetricCache.store('cache.size', (timestamp, MetricCache.size))


recorder = LoopingCall(record)
