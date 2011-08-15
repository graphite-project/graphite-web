__doc__ = """
This module exists for the purpose of tracking global state used across
several modules.
"""

metricReceiversPaused = False
cacheTooFull = False
connectedMetricReceiverProtocols = set()
