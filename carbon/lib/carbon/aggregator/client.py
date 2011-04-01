from twisted.internet import reactor
from twisted.internet.protocol import ReconnectingClientFactory
from twisted.protocols.basic import Int32StringReceiver
from carbon.conf import settings
from carbon import log

try:
  import cPickle as pickle
except ImportError:
  import pickle


MAX_DATAPOINTS_PER_MESSAGE = settings.MAX_DATAPOINTS_PER_MESSAGE


def connect(host, port):
  global connectionFactory
  connectionFactory = MetricSenderFactory(host, port)
  reactor.connectTCP(host, port, connectionFactory)


def send_metric(metric, datapoint):
  connectionFactory.send(metric, datapoint)


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
    self.transport.loseConnection()

  def flushQueue(self):
    while (not self.paused) and self.queue:
      datapoints = self.queue[:MAX_DATAPOINTS_PER_MESSAGE]
      self.queue = self.factory.queue = self.queue[MAX_DATAPOINTS_PER_MESSAGE:]
      self.sendString( pickle.dumps(datapoints, protocol=-1) )

  def send(self, metric, datapoint):
    if self.paused:
      self.queue.append( (metric, datapoint) )

    elif self.queue:
      self.queue.append( (metric, datapoint) )
      self.flushQueue()

    else:
      datapoints = [ (metric, datapoint) ]
      self.sendString( pickle.dumps(datapoints, protocol=-1) )


class MetricSenderFactory(ReconnectingClientFactory):
  connectedProtocol = None
  maxDelay = 10

  def __init__(self, host, port):
    self.host = host
    self.port = port
    self.remoteAddr = "%s:%d" % (host, port)
    self.queue = []

  def startedConnecting(self, connector):
    log.aggregator('connecting to %s' % self.remoteAddr)

  def buildProtocol(self, addr):
    log.aggregator('connection to %s established' % self.remoteAddr)
    self.connectedProtocol = MetricPickleSender()
    self.connectedProtocol.factory = self
    self.connectedProtocol.queue = self.queue
    return self.connectedProtocol

  def send(self, metric, datapoint):
    if len(self.queue) >= settings.MAX_QUEUE_SIZE:
      log.aggregator('send queue full for %s, dropping data' % self.remoteAddr)

    elif self.connectedProtocol:
      self.connectedProtocol.send(metric, datapoint)

    else:
      self.queue.append( (metric, datapoint) )

  def clientConnectionLost(self, connector, reason):
    ReconnectingClientFactory.clientConnectionLost(self, connector, reason)
    self.connectedProtocol = None
    log.aggregator("connection to %s lost: %s" % (self.remoteAddr, reason.value))

  def clientConnectionFailed(self, connector, reason):
    ReconnectingClientFactory.clientConnectionFailed(self, connector, reason)
    log.aggregator("connection attempt to %s failed: %s" % (self.remoteAddr, reason.value))
