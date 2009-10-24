from carbon import log


class EventHandler:
  def __init__(self, defaultHandler=None):
    self.handler = defaultHandler

  def installHandler(self, handler):
    self.handler = handler

  def __call__(self, *args, **kwargs):
    if self.handler is not None:
      try:
        self.handler(*args, **kwargs)
      except:
        log.err()


metricReceived = EventHandler()
