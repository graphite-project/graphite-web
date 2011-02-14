import time
from twisted.internet.task import LoopingCall
from carbon import log


class BufferManager:
  def __init__(self):
    self.buffers = {}

  def get_buffer(self, metric_path):
    if metric_path not in self.buffers:
      log.aggregator("Allocating new buffer for %s" % metric_path)
      self.buffers[metric_path] = AggregationBuffer(metric_path)

    return self.buffers[metric_path]

  def clear(self):
    for buffer in self.buffers.values():
      buffer.close()

    self.buffers.clear()


class AggregationBuffer:
  def __init__(self, metric_path):
    self.metric_path = metric_path
    self.values = []
    self.compute_task = None
    self.configured = False
    self.aggregation_frequency = None
    self.aggregation_func = None

  def input(self, datapoint):
    (timestamp, value) = datapoint
    self.values.append(value)

  def configure_aggregation(self, frequency, func):
    self.aggregation_frequency = int(frequency)
    self.aggregation_func = func
    self.compute_task = LoopingCall(self.compute_value)
    self.compute_task.start(frequency, now=False)
    self.configured = True

  def compute_value(self):
    value = self.aggregation_func(self.values)
    timestamp = time.time() - self.aggregation_frequency
    datapoint = (timestamp, value)
    self.values = []
    send_metric(self.metric_path, datapoint)
    increment('aggregateDatapointsSent')

  def close(self):
    if self.compute_task and self.compute_task.running:
      self.compute_task.stop()
    self.values = []

  @property
  def size(self):
    return len(self.values)


# Shared importable singleton
BufferManager = BufferManager()

# Avoid import circularity
from carbon.instrumentation import increment
from carbon.aggregator.client import send_metric
