from twisted.internet import reactor
from twisted.internet.protocol import ReconnectingClientFactory
from twisted.protocols.basic import Int32StringReceiver
from carbon.rules import getDestinations, loadRules
from carbon.conf import settings
from carbon import log

try:
  import cPickle as pickle
except ImportError:
  import pickle


MAX_DATAPOINTS_PER_MESSAGE = 500
RelayServers = []


def relay(metric, datapoint):
  for server in getServers(metric):
    server.send(metric, datapoint)


def getServers(metric):
  destinations = getDestinations(metric)

  for server in RelayServers:
    if server.host in destinations:
      yield server


class MetricPickleSender(Int32StringReceiver):
  def connectionMade(self):
    self.paused = False
    self.transport.registerProducer(self, streaming=True)
    # Define internal metric names
    self.queuedUntilReady = 'destinations.%s.queuedUntilReady' % self.factory.destinationName
    self.sent = 'destinations.%s.sent' % self.factory.destinationName

    self.flushQueue()

  def pauseProducing(self):
    self.paused = True

  def resumeProducing(self):
    self.paused = False
    self.flushQueue()

  def stopProducing(self):
    self.transport.loseConnection()

  def flushQueue(self):
    while (not self.paused) and self.queue:
      datapoints = self.queue[:MAX_DATAPOINTS_PER_MESSAGE]
      self.queue = self.queue[MAX_DATAPOINTS_PER_MESSAGE:]
      self.sendString( pickle.dumps(datapoints) )
      increment(self.sent, len(datapoints))

  def send(self, metric, datapoint):
    if self.paused:
      self.queue.append( (metric, datapoint) )
      increment(self.queuedUntilReady)

    elif self.queue:
      self.queue.append( (metric, datapoint) )
      self.flushQueue()

    else:
      datapoints = [ (metric, datapoint) ]
      self.sendString( pickle.dumps(datapoints) )
      increment(self.sent)


class MetricSenderFactory(ReconnectingClientFactory):
  connectedProtocol = None
  maxDelay = 10

  def __init__(self, host, port):
    self.host = host
    self.port = port
    self.remoteAddr = "%s:%d" % (host, port)
    self.queue = []
    # Define internal metric names
    self.destinationName = host.replace('.','_')
    self.attemptedRelays = 'destinations.%s.attemptedRelays' % self.destinationName
    self.fullQueueDrops = 'destinations.%s.fullQueueDrops' % self.destinationName
    self.queuedUntilConnected = 'destinations.%s.queuedUntilConnected' % self.destinationName

  def startedConnecting(self, connector):
    log.relay('connecting to %s' % self.remoteAddr)

  def buildProtocol(self, addr):
    log.relay('connection to %s established' % self.remoteAddr)
    self.connectedProtocol = MetricPickleSender()
    self.connectedProtocol.factory = self
    self.connectedProtocol.queue = self.queue
    return self.connectedProtocol

  def send(self, metric, datapoint):
    increment(self.attemptedRelays)

    if len(self.queue) >= settings.MAX_QUEUE_SIZE:
      log.relay('relay queue full for %s, dropping data' % self.remoteAddr)
      increment(self.fullQueueDrops)

    elif self.connectedProtocol:
      self.connectedProtocol.send(metric, datapoint)

    else:
      self.queue.append( (metric, datapoint) )
      increment(self.queuedUntilConnected)

  def clientConnectionLost(self, connector, reason):
    ReconnectingClientFactory.clientConnectionLost(self, connector, reason)
    self.connectedProtocol = None
    log.relay("connection to %s lost: %s" % (self.remoteAddr, reason.value))

  def clientConnectionFailed(self, connector, reason):
    ReconnectingClientFactory.clientConnectionFailed(self, connector, reason)
    log.relay("connection attempt to %s failed: %s" % (self.remoteAddr, reason.value))


def startRelaying(servers, rulesFile):
  assert not RelayServers, "Relaying already started"
  loadRules(rulesFile)

  for server in servers:
    if ':' in server:
      host, port = server.split(':', 1)
      port = int(port)
    else:
      host, port = server, 2004 # default cache pickle listener port

    factory = MetricSenderFactory(host, port)
    RelayServers.append(factory) # each factory represents a cache server

    reactor.connectTCP(host, port, factory)

  RelayServers.sort(key=lambda f: f.remoteAddr) # normalize the order


# Avoid import circularities
from carbon.instrumentation import increment
