from twisted.internet.protocol import Factory
from twisted.protocols.basic import LineOnlyReceiver, Int32StringReceiver
from twisted.python.log import log
from carbon.cache import MetricCache

try:
  import cPickle as pickle
except ImportError:
  import pickle


class MetricLineReceiver(LineOnlyReceiver):
  def connectionMade(self):
    self.peer = self.transport.getPeer()
    self.peerAddr = "%s:%d" % (self.peer.host, self.peer.addr)
    log.msg("connection made by %s" % self.peerAddr)

  def lineReceived(self, line):
    try:
      metric, value, timestamp = line.strip().split()
      datapoint = ( float(timestamp), float(value) )
    except:
      log.err('invalid line received from client %s, disconnecting' % self.peerAddr)
      self.transport.loseConnection()
      return

    MetricCache.store(metric, datapoint)


class CacheQueryHandler(Int32StringReceiver):
  def connectionMade(self):
    self.peer = self.transport.getPeer()
    self.peerAddr = "%s:%d" % (self.peer.host, self.peer.addr)
    log.msg("connection made by %s" % self.peerAddr)

  def stringReceived(self, metric):
    values = MetricCache.get(metric, [])
    log.msg('cache query for %s returned %d values' % (metric, len(values)))
    response = pickle.dumps(values, protocol=-1)
    self.sendString(response)


def startListener(interface, port, protocol):
  factory = Factory()
  factory.protocol = protocol
  return reactor.listenTCP( int(port), factory, interface=interface )
