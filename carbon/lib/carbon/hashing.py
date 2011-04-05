import hashlib
import bisect


serverRing = None


class ConsistentHashRing:
  def __init__(self, nodes, replica_count=100):
    self.ring = []
    self.replica_count = replica_count
    for node in nodes:
      self.add_node(node)

  def compute_ring_position(self, key):
    big_hash = hashlib.md5( str(key) ).hexdigest()
    small_hash = int(big_hash[:4], 16)
    return small_hash

  def add_node(self, key):
    for i in range(self.replica_count):
      replica_key = "%s:%d" % (key, i)
      position = self.compute_ring_position(replica_key)
      entry = (position, key)
      bisect.insort(self.ring, entry)

  def remove_node(self, key):
    self.ring = [entry for entry in self.ring if entry[1] != key]

  def get_node(self, key):
    assert self.ring
    position = self.compute_ring_position(key)
    search_entry = (position, None)
    index = bisect.bisect_left(self.ring, search_entry)
    index %= len(self.ring)
    entry = self.ring[index]
    return entry[1]


def setDestinationServers(servers):
  global serverRing
  serverRing = ConsistentHashRing(servers)


def getDestinations(metric):
  return [ serverRing.get_node(metric) ]
