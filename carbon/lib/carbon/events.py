from twisted.python.failure import Failure


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
        log.err(None, "Exception in %s event handler: args=%s kwargs=%s" % (self.name, args, kwargs))


metricReceived = Event('metricReceived')
metricGenerated = Event('metricGenerated')
cacheFull = Event('cacheFull')
cacheSpaceAvailable = Event('cacheSpaceAvailable')
pauseReceivingMetrics = Event('pauseReceivingMetrics')
resumeReceivingMetrics = Event('resumeReceivingMetrics')

# Default handlers
metricReceived.addHandler(lambda metric, datapoint: state.instrumentation.increment('metricsReceived'))

cacheFull.addHandler(lambda: state.instrumentation.increment('cache.overflow'))
cacheFull.addHandler(lambda: setattr(state, 'cacheTooFull', True))
cacheSpaceAvailable.addHandler(lambda: setattr(state, 'cacheTooFull', False))

pauseReceivingMetrics.addHandler(lambda: setattr(state, 'metricReceiversPaused', True))
resumeReceivingMetrics.addHandler(lambda: setattr(state, 'metricReceiversPaused', False))


# Avoid import circularities
from carbon import log, state
