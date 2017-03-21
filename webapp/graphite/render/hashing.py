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
from itertools import chain
import bisect

try:
  import pyhash
  hasher = pyhash.fnv1a_32()
  def fnv32a(string, seed=0x811c9dc5):
    return hasher(string, seed=seed)
except ImportError:
  def fnv32a(string, seed=0x811c9dc5):
    """
    FNV-1a Hash (http://isthe.com/chongo/tech/comp/fnv/) in Python.
    Taken from https://gist.github.com/vaiorabbit/5670985
    """
    hval = seed
    fnv_32_prime = 0x01000193
    uint32_max = 2 ** 32
    for s in string:
      hval = hval ^ ord(s)
      hval = (hval * fnv_32_prime) % uint32_max
    return hval

def hashRequest(request):
  # Normalize the request parameters so ensure we're deterministic
  queryParams = ["%s=%s" % (key, '&'.join(values))
                 for (key,values) in chain(request.POST.lists(), request.GET.lists())
                 if not key.startswith('_')]

  normalizedParams = ','.join( sorted(queryParams) )
  return compactHash(normalizedParams)


def hashData(targets, startTime, endTime, node):
  targetsString = ','.join(sorted(targets))
  startTimeString = startTime.strftime("%Y%m%d_%H%M")
  endTimeString = endTime.strftime("%Y%m%d_%H%M")
  myHash = targetsString + '@' + startTimeString + ':' + endTimeString + '/' + node
  return compactHash(myHash)


def compactHash(string):
  hash = md5()
  hash.update(string)
  return hash.hexdigest()



class ConsistentHashRing:
  def __init__(self, nodes, replica_count=100, hash_type='carbon_ch'):
    self.ring = []
    self.hash_type = hash_type
    self.replica_count = replica_count
    for node in nodes:
      self.add_node(node)

  def compute_ring_position(self, key):
    if self.hash_type == 'fnv1a_ch':
      big_hash = ('%08X' % int(fnv32a(str(key)))).lower()
      small_hash = int(big_hash[:4], 16) ^ int(big_hash[4:], 16)
    else:
      big_hash = md5( str(key) ).hexdigest()
      small_hash = int(big_hash[:4], 16)
    return small_hash

  def add_node(self, key):
    for i in range(self.replica_count):
      if self.hash_type == 'fnv1a_ch':
        replica_key = "%d-%s" % (i, key[1])
      else:
        replica_key = "%s:%d" % (key, i)
      position = self.compute_ring_position(replica_key)
      entry = (position, key)
      bisect.insort(self.ring, entry)

  def remove_node(self, key):
    self.ring = [entry for entry in self.ring if entry[1] != key]

  def get_node(self, key):
    position = self.compute_ring_position(key)
    search_entry = (position, None)
    index = bisect.bisect_left(self.ring, search_entry)
    index %= len(self.ring)
    entry = self.ring[index]
    return entry[1]
