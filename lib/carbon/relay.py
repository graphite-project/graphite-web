from collections import deque
from twisted.internet import reactor
from twisted.internet.protocol import ReconnectingClientFactory
from twisted.protocols.basic import Int32StringReceiver
from carbon.rules import getDestinations
from carbon.conf import settings
from carbon import log

try:
  import cPickle as pickle
except ImportError:
  import pickle


RelayServers = []


def relay(metric, data):
  for server in getServers(metric):
    server.send(data)


def getServers(metric):
  destinations = getDestinations(metric)

  for server in RelayServers:
    if server.host in destinations:
      yield server


class MetricPickleSender(Int32StringReceiver):
  def connectionMade(self):
    self.paused = False
    self.transport.registerProducer(self, streaming=True)
    self.flushQueue()

  def pauseProducing(self):
    self.paused = True

  def resumeProducing(self):
    self.paused = False
    self.flushQueue()

  def stopProducing(self):
    log.relay('%s.stopProducing()' % self)
    self.transport.loseConnection()

  def flushQueue(self):
    while (not self.paused) and self.queue:
      self.sendString( self.queue.popleft() )

  def send(self, data):
    if self.paused:
      self.queue.append(data)
    else:
      self.sendString(data)


class MetricSenderFactory(ReconnectingClientFactory):
  connectedProtocol = None
  maxDelay = 10

  def __init__(self, host, port):
    self.host = host
    self.port = port
    self.remoteAddr = "%s:%d" % (host, port)

  def startFactory(self):
    self.queue = deque()

  def startedConnecting(self, connector):
    log.relay('connecting to %s' % self.remoteAddr)

  def buildProtocol(self, addr):
    log.relay('connection to %s established' % self.remoteAddr)
    self.connectedProtocol = MetricPickleSender()
    self.connectedProtocol.factory = self
    self.connectedProtocol.queue = self.queue
    return protocol

  def send(self, data):
    if len(self.queue) >= settings.MAX_QUEUE_SIZE:
      log.relay('relay queue full for %s, dropping data' % self.remoteAddr)
    elif self.connectedProtocol:
      self.connectedProtocol.send(data)
    else:
      self.queue.append(data)

  def clientConnectionLost(self, connector, reason):
    self.connectedProtocol = None
    log.relay("connection to %s lost: %s" % (self.remoteAddr, reason.value))

  def clientConnectionFailed(self, connector, reason):
    log.relay("connection attempt to %s failed: %s" % (self.remoteAddr, reason.value))


def startRelaying(servers):
  assert not RelayServers, "Relaying already started"

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
