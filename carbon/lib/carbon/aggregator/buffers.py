import time
from twisted.internet.task import LoopingCall
from carbon import log


class BufferManager:
  def __init__(self):
    self.buffers = {}

  def __len__(self):
    return len(self.buffers)

  def get_buffer(self, metric_path):
    if metric_path not in self.buffers:
      log.aggregator("Allocating new metric buffer for %s" % metric_path)
      self.buffers[metric_path] = MetricBuffer(metric_path)

    return self.buffers[metric_path]

  def clear(self):
    for buffer in self.buffers.values():
      buffer.close()

    self.buffers.clear()


class MetricBuffer:
  def __init__(self, metric_path):
    self.metric_path = metric_path
    self.interval_buffers = {}
    self.compute_task = None
    self.configured = False
    self.aggregation_frequency = None
    self.aggregation_func = None

  def input(self, datapoint):
    (timestamp, value) = datapoint
    interval = timestamp - (timestamp % self.aggregation_frequency)
    if interval in self.interval_buffers:
      buffer = self.interval_buffers[interval]
    else:
      buffer = self.interval_buffers[interval] = IntervalBuffer(interval)

    buffer.input(datapoint)

  def configure_aggregation(self, frequency, func):
    self.aggregation_frequency = int(frequency)
    self.aggregation_func = func
    self.compute_task = LoopingCall(self.compute_value)
    self.compute_task.start(frequency, now=False)
    self.configured = True

  def compute_value(self):
    now = int( time.time() )
    current_interval = now - (now % self.aggregation_frequency)
    age_threshold = current_interval - (settings['MAX_AGGREGATION_INTERVALS'] * self.aggregation_frequency)

    for buffer in self.interval_buffers.values():
      if buffer.active:
        value = self.aggregation_func(buffer.values)
        datapoint = (buffer.interval, value)
        send_metric(self.metric_path, datapoint)
        increment('aggregateDatapointsSent')
        buffer.mark_inactive()

      if buffer.interval < age_threshold:
        del self.interval_values[buffer.interval]

  def close(self):
    if self.compute_task and self.compute_task.running:
      self.compute_task.stop()
    self.values = []

  @property
  def size(self):
    return len(self.values)


class IntervalBuffer:
  def __init__(self, interval):
    self.interval = interval
    self.values = []
    self.active = True

  def input(self, datapoint):
    self.values.append( datapoint[1] )
    self.active = True

  def mark_inactive(self):
    self.active = False


# Shared importable singleton
BufferManager = BufferManager()

# Avoid import circularity
from carbon.instrumentation import increment
from carbon.aggregator.client import send_metric
