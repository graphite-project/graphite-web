from twisted.internet import reactor
from twisted.internet.protocol import Factory
from twisted.internet.error import ConnectionDone
from twisted.protocols.basic import LineOnlyReceiver, Int32StringReceiver
from carbon.cache import MetricCache
from carbon.relay import relay
from carbon.instrumentation import increment
from carbon.events import metricReceived
from carbon import log

try:
  import cPickle as pickle
except ImportError:
  import pickle


class LoggingMixin:
  def connectionMade(self):
    self.peer = self.transport.getPeer()
    self.peerAddr = "%s:%d" % (self.peer.host, self.peer.port)
    log.listener("%s connection with %s established" % (self.__class__.__name__, self.peerAddr))

  def connectionLost(self, reason):
    if reason.check(ConnectionDone):
      log.listener("%s connection with %s closed cleanly" % (self.__class__.__name__, self.peerAddr))
    else:
      log.listener("%s connection with %s lost: %s" % (self.__class__.__name__, self.peerAddr, reason.value))


class MetricLineReceiver(LoggingMixin, LineOnlyReceiver):
  delimiter = '\n'

  def lineReceived(self, line):
    try:
      metric, value, timestamp = line.strip().split()
      datapoint = ( float(timestamp), float(value) )
    except:
      log.listener('invalid line received from client %s, disconnecting' % self.peerAddr)
      self.transport.loseConnection()
      return

    increment('metricsReceived')
    metricReceived(metric, datapoint)


class MetricPickleReceiver(LoggingMixin, Int32StringReceiver):
  def stringReceived(self, data):
    try:
      datapoints = pickle.loads(data)
    except:
      log.listener('invalid pickle received from client %s, disconnecting' % self.peerAddr)
      self.transport.loseConnection()
      return

    for (metric, datapoint) in datapoints:
      datapoint = ( float(datapoint[0]), float(datapoint[1]) ) #force proper types
      if datapoint[1] == datapoint[1]: # filter out NaN values
        metricReceived(metric, datapoint)

    increment('metricsReceived', len(datapoints))


class CacheQueryHandler(LoggingMixin, Int32StringReceiver):
  def stringReceived(self, metric):
    values = MetricCache.get(metric, [])
    log.query('cache query for %s returned %d values' % (metric, len(values)))
    response = pickle.dumps(values, protocol=-1)
    self.sendString(response)
    increment('cacheQueries')


def startListener(interface, port, protocol):
  factory = Factory()
  factory.protocol = protocol
  return reactor.listenTCP( int(port), factory, interface=interface )
