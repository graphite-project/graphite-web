'''
The plan is to make this the "one true carbon client library"
which is to be used by any carbon daemon that sends datapoints
to another carbon daemon. It will eventually obsolete carbon-relay.
'''
try:
  import cPickle as pickle
except ImportError:
  import pickle

from twisted.internet import reactor
from twisted.internet.defer import Deferred, DeferredList, succeed
from twisted.internet.protocol import ReconnectingClientFactory
from twisted.protocols.basic import Int32StringReceiver
from carbon import log, hashing


class CarbonClientProtocol(Int32StringReceiver):
  def connectionMade(self):
    log.clients("%s::connectionMade" % self)
    self.paused = False
    self.transport.registerProducer(self, streaming=True)
    self.sendQueued()

  def connectionLost(self, reason):
    log.clients("%s::connectionLost %s" % (self, reason.getErrorMessage()))

  def pauseProducing(self):
    self.paused = True

  def resumeProducing(self):
    self.paused = False
    self.sendQueued()

  def stopProducing(self):
    self.transport.loseConnection()

  def sendDatapoint(self, metric, datapoint):
    if self.paused:
      self.factory.enqueue(metric, datapoint)
      #increment(self.queuedUntilReady)

    elif self.factory.hasQueuedDatapoints():
      self.factory.enqueue(metric, datapoint)
      self.sendQueued()

    else:
      datapoints = [ (metric, datapoint) ]
      self.sendString( pickle.dumps(datapoints, protocol=-1) )
      #increment(self.sent)

  def sendQueued(self):
    while (not self.paused) and self.factory.hasQueuedDatapoints():
      datapoints = self.factory.takeSomeFromQueue()
      self.sendString( pickle.dumps(datapoints, protocol=-1) )
      self.factory.checkQueue()
      #increment(self.sent, len(datapoints))

  def __str__(self):
    return 'CarbonClientProtocol(%s:%d)' % (self.factory.addr)
  __repr__ = __str__


class CarbonClientFactory(ReconnectingClientFactory):
  maxDelay = 5
  maxQueueSize = 10000
  maxDatapointsPerMessage = 500

  def __init__(self, host, port):
    self.host = host
    self.port = port
    self.addr = (host, port)
    # This factory maintains protocol state across reconnects
    self.queue = [] # including datapoints that still need to be sent
    self.connectedProtocol = None
    self.queueEmpty = Deferred()
    self.connectionLost = Deferred()
    self.connectFailed = Deferred()

  def buildProtocol(self, addr):
    self.connectedProtocol = CarbonClientProtocol()
    self.connectedProtocol.factory = self
    return self.connectedProtocol

  def stopFactory(self):
    self.stopTrying()
    if self.connectedProtocol:
      return self.connectedProtocol.transport.loseConnection()

  def configure(self, **options):
    for option in ('maxQueueSize', 'maxDatapointsPerMessage'):
      if option in options:
        value = options[option]
        setattr(self, option, value)

  def hasQueuedDatapoints(self):
    return bool(self.queue)

  def takeSomeFromQueue(self):
    datapoints = self.queue[:self.maxDatapointsPerMessage]
    self.queue = self.queue[self.maxDatapointsPerMessage:]
    return datapoints

  def checkQueue(self):
    if not self.queue:
      self.queueEmpty.callback(0)
      self.queueEmpty = Deferred()

  def enqueue(self, metric, datapoint):
    self.queue.append( (metric, datapoint) )

  def sendDatapoint(self, metric, datapoint):
    #increment(self.attemptedRelays)

    if len(self.queue) >= self.maxQueueSize:
      log.clients('%s::sendDatapoint send queue full, dropping datapoint')
      #increment(self.fullQueueDrops)

    elif self.connectedProtocol:
      self.connectedProtocol.sendDatapoint(metric, datapoint)

    else:
      self.enqueue(metric, datapoint)
      #increment(self.queuedUntilConnected)

  def startedConnecting(self, connector):
    log.clients("%s::startedConnecting (%s:%d)" % (self, connector.host, connector.port))

  def clientConnectionLost(self, connector, reason):
    ReconnectingClientFactory.clientConnectionLost(self, connector, reason)
    log.clients("%s::clientConnectionLost (%s:%d) %s" % (self, connector.host, connector.port, reason.getErrorMessage()))
    self.connectedProtocol = None
    self.connectionLost.callback(0)
    self.connectionLost = Deferred()

  def clientConnectionFailed(self, connector, reason):
    ReconnectingClientFactory.clientConnectionFailed(self, connector, reason)
    log.clients("%s::clientConnectionFailed (%s:%d) %s" % (self, connector.host, connector.port, reason.getErrorMessage()))
    self.connectFailed.addErrback(lambda failure: None) # twisted, chill the hell out
    self.connectFailed.errback(reason)
    self.connectFailed = Deferred()

  def gracefulStop(self):
    self.queueEmpty.addCallback(lambda result: self.stopFactory())
    readyToStop = DeferredList(
      [self.connectionLost, self.connectFailed],
      fireOnOneCallback=True,
      fireOnOneErrback=True)
    return readyToStop

  def __str__(self):
    return 'CarbonClientFactory(%s:%d)' % self.addr
  __repr__ = __str__


class CarbonClientManager:
  def __init__(self):
    self.client_factories = {}
    self.client_connectors = {}

  def startClient(self, dest_addr):
    if dest_addr in self.client_factories:
      return

    host, port = dest_addr
    factory = CarbonClientFactory(host, port)
    self.client_factories[dest_addr] = factory
    self.client_connectors[dest_addr] = reactor.connectTCP(host, port, factory)

  def stopClient(self, dest_addr, graceful=False):
    factory = self.client_factories.get(dest_addr)
    if factory is None:
      return
    connector = self.client_connectors[dest_addr]

    if graceful and factory.hasQueuedDatapoints():
      log.clients("Gracefully disconnecting connection to %s:%d with queued datapoints" % dest_addr)
      readyToStop = factory.gracefulStop()
      readyToStop.addCallback(lambda result: self.__disconnectClient(dest_addr))
      return readyToStop
    else:
      factory.stopFactory()
      self.__disconnectClient(dest_addr)
      return succeed(0)

  def __disconnectClient(self, dest_addr):
    log.clients("disconnecting connection to %s:%d" % dest_addr)
    factory = self.client_factories.pop(dest_addr)
    connector = self.client_connectors.pop(dest_addr)
    if connector.state == 'connecting' and not factory.hasQueuedDatapoints():
      connector.stopConnecting()

  def stopAllClients(self, graceful=False):
    deferreds = []
    for dest_addr in list(self.client_factories):
      deferreds.append( self.stopClient(dest_addr, graceful) )
    return DeferredList(deferreds)

  def getKey(self, metric):
    return metric

  def setKeyFunction(self, func):
    self.getKey = func

  def sendDatapoint(self, metric, datapoint):
    key = self.getKey(metric)
    for addr in hashing.getDestinations(key):
      self.client_factories[addr].sendDatapoint(metric, datapoint)
