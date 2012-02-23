"""Copyright 2009 Chris Davis

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

from carbon.conf import settings


class MetricCache(dict):
  def __init__(self):
    self.size = 0

  def __setitem__(self, key, value):
    raise TypeError("Use store() method instead!")

  def store(self, metric, datapoint):
    self.setdefault(metric, []).append(datapoint)
    self.size += 1

    if self.isFull():
      log.msg("MetricCache is full: self.size=%d" % self.size)
      state.events.cacheFull()

  def isFull(self):
    return self.size >= settings.MAX_CACHE_SIZE

  def pop(self, metric):
    datapoints = dict.pop(self, metric)
    self.size -= len(datapoints)
    return datapoints

  def counts(self):
    return [ (metric, len(datapoints)) for (metric, datapoints) in self.items() ]


# Ghetto singleton
MetricCache = MetricCache()


# Avoid import circularities
from carbon import log, state
