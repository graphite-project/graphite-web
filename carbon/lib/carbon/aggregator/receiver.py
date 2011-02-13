from carbon.instrumentation import increment
from carbon.aggregator.client import send_metric
from carbon.aggregator.rules import RuleManager
from carbon.aggregator.buffers import BufferManager


def process(metric, datapoint):
  increment('datapointsReceived')

  for rule in RuleManager.rules:
    aggregate_metric = rule.get_aggregate_metric(metric)

    if aggregate_metric is None:
      continue

    buffer = BufferManager.get_buffer(aggregate_metric)

    if not buffer.configured:
      buffer.configure_aggregation(rule.frequency, rule.aggregate_func)

    buffer.input(datapoint)

  send_metric(metric, datapoint)
