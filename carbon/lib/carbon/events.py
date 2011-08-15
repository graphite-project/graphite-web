
class Event:
  def __init__(self, name):
    self.name = name
    self.handlers = []

  def addHandler(self, handler):
    if handler not in self.handlers:
      self.handlers.append(handler)

  def removeHandler(self, handler):
    if handler in self.handlers:
      self.handlers.remove(handler)

  def __call__(self, *args, **kwargs):
    for handler in self.handlers:
      try:
        handler(*args, **kwargs)
      except:
        log.err("Exception in %s event handler" % self.name)


metricReceived = Event('metricReceived')
metricGenerated = Event('metricGenerated')
cacheFull = Event('cacheFull')
cacheSpaceAvailable = Event('cacheSpaceAvailable')
pauseReceivingMetrics = Event('pauseReceivingMetrics')
resumeReceivingMetrics = Event('resumeReceivingMetrics')

# Default handlers
metricReceived.addHandler(lambda metric, datapoint: instrumentation.increment('metricsReceived'))

cacheFull.addHandler(lambda: instrumentation.increment('cache.overflow'))
cacheFull.addHandler(lambda: setattr(state, 'cacheTooFull', True))
cacheSpaceAvailable.addHandler(lambda: setattr(state, 'cacheTooFull', False))

pauseReceivingMetrics.addHandler(lambda: setattr(state, 'metricReceiversPaused', True))
resumeReceivingMetrics.addHandler(lambda: setattr(state, 'metricReceiversPaused', False))


# Avoid import circularities
from carbon import log, state, instrumentation
