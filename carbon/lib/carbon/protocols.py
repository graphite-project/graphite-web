from twisted.internet import reactor
from twisted.internet.protocol import Factory, DatagramProtocol
from twisted.internet.error import ConnectionDone
from twisted.protocols.basic import LineOnlyReceiver, Int32StringReceiver
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
    self.factory.protocolConnected(self)

  def connectionLost(self, reason):
    if reason.check(ConnectionDone):
      log.listener("%s connection with %s closed cleanly" % (self.__class__.__name__, self.peerAddr))
    else:
      log.listener("%s connection with %s lost: %s" % (self.__class__.__name__, self.peerAddr, reason.value))
    self.factory.protocolDisconnected(self)


class MetricLineReceiver(LoggingMixin, LineOnlyReceiver):
  delimiter = '\n'

  def lineReceived(self, line):
    try:
      metric, value, timestamp = line.strip().split()
      datapoint = ( float(timestamp), float(value) )
    except:
      log.listener('invalid line received from client %s, ignoring' % self.peerAddr)
      return

    increment('metricsReceived')
    metricReceived(metric, datapoint)


class MetricDatagramReceiver(LoggingMixin, DatagramProtocol):
  def datagramReceived(self, data, (host, port)):
    for line in data.splitlines():
      try:
        metric, value, timestamp = line.strip().split()
        datapoint = ( float(timestamp), float(value) )

        increment('metricsReceived')
        metricReceived(metric, datapoint)
      except:
        log.listener('invalid line received from client %s, ignoring' % host)


class MetricPickleReceiver(LoggingMixin, Int32StringReceiver):
  MAX_LENGTH = 2 ** 20

  def stringReceived(self, data):
    try:
      datapoints = pickle.loads(data)
    except:
      log.listener('invalid pickle received from client %s, ignoring' % self.peerAddr)
      return

    for (metric, datapoint) in datapoints:
      try:
        datapoint = ( float(datapoint[0]), float(datapoint[1]) ) #force proper types
      except:
        continue

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


class ConnectionTrackingFactory(Factory):
  def startFactory(self):
    self.connectedProtocols = []

  def buildProtocol(self, addr):
    p = self.protocol()
    p.factory = self
    return p

  def protocolConnected(self, p):
    self.connectedProtocols.append(p)
    if self.manager.clientsPaused:
      p.transport.pauseProducing()

  def protocolDisconnected(self, p):
    if p in self.connectedProtocols:
      self.connectedProtocols.remove(p)


class ProtocolManager:
  def __init__(self):
    self.factories = []
    self.clientsPaused = False

  def createFactory(self, protocol):
    factory = ConnectionTrackingFactory()
    factory.manager = self
    factory.protocol = protocol
    self.factories.append(factory)
    return factory

  @property
  def connectedProtocols(self):
    for factory in self.factories:
      for p in factory.connectedProtocols:
        yield p

  def pauseAll(self):
    log.listener("ProtocolManager.pauseAll")
    for p in self.connectedProtocols:
      p.transport.pauseProducing()
    self.clientsPaused = True

  def resumeAll(self):
    log.listener("ProtocolManager.resumeAll")
    for p in self.connectedProtocols:
      p.transport.resumeProducing()
    self.clientsPaused = False


protocolManager = ProtocolManager()


# Avoid import circularities
from carbon.cache import MetricCache
from carbon.relay import relay
from carbon.instrumentation import increment
