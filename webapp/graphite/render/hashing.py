"""Copyright 2008 Orbitz WorldWide
   Copyright 2011 Chris Davis

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

from graphite.logger import log
import time
try:
  from hashlib import md5
except ImportError:
  from md5 import md5
import bisect

def hashRequest(request):
  # Normalize the request parameters so ensure we're deterministic
  queryParams = ["%s=%s" % (key, '&'.join(values))
                 for (key,values) in request.GET.lists()
                 if not key.startswith('_')]

  normalizedParams = ','.join( sorted(queryParams) ) or 'noParam'
  myHash = stripControlChars(normalizedParams) #memcached doesn't like unprintable characters in its keys

  return compactHash(myHash)


def hashData(targets, startTime, endTime):
  targetsString = ','.join(targets)
  startTimeString = startTime.strftime("%Y%m%d_%H%M")
  endTimeString = endTime.strftime("%Y%m%d_%H%M")
  myHash = targetsString + '@' + startTimeString + ':' + endTimeString
  myHash = stripControlChars(myHash)

  return compactHash(myHash)


def stripControlChars(string):
  return filter(lambda char: ord(char) >= 33, string)


def compactHash(string):
  hash = md5()
  hash.update(string)
  return hash.hexdigest()


class ConsistentHashRing:
  def __init__(self, nodes, replica_count=100):
    self.ring = []
    self.ring_len = len(self.ring)
    self.nodes = set()
    self.nodes_len = len(self.nodes)
    self.replica_count = replica_count
    for node in nodes:
      self.add_node(node)

  def compute_ring_position(self, key):
    big_hash = md5( str(key) ).hexdigest()
    small_hash = int(big_hash[:4], 16) 
    return small_hash

  def add_node(self, key):
    self.nodes.add(key)
    self.nodes_len = len(self.nodes)
    for i in range(self.replica_count):
      replica_key = "%s:%d" % (key, i)
      position = self.compute_ring_position(replica_key)
      entry = (position, key)
      bisect.insort(self.ring, entry)
    self.ring_len = len(self.ring)

  def remove_node(self, key):
    self.nodes.discard(key)
    self.nodes_len = len(self.nodes)
    self.ring = [entry for entry in self.ring if entry[1] != key]
    self.ring_len = len(self.ring)

  def get_node(self, key):
    assert self.ring
    position = self.compute_ring_position(key)
    search_entry = (position, None)
    index = bisect.bisect_left(self.ring, search_entry) % self.ring_len
    entry = self.ring[index]
    return entry[1]

  def get_nodes(self, key):
    nodes = []
    position = self.compute_ring_position(key)
    search_entry = (position, None)
    index = bisect.bisect_left(self.ring, search_entry) % self.ring_len
    last_index = (index - 1) % self.ring_len
    nodes_len = len(nodes)
    while nodes_len < self.nodes_len and index != last_index:
      next_entry = self.ring[index]
      (position, next_node) = next_entry
      if next_node not in nodes:
        nodes.append(next_node)
        nodes_len += 1

      index = (index + 1) % self.ring_len

    return nodes
