"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

import time
from graphite.logger import log
from graphite.storage import STORE
from graphite.readers import FetchInProgress


class TimeSeries(list):
  def __init__(self, name, start, end, step, values, consolidate='average'):
    list.__init__(self, values)
    self.name = name
    self.start = start
    self.end = end
    self.step = step
    self.consolidationFunc = consolidate
    self.valuesPerPoint = 1
    self.options = {}


  def __iter__(self):
    if self.valuesPerPoint > 1:
      return self.__consolidatingGenerator( list.__iter__(self) )
    else:
      return list.__iter__(self)


  def consolidate(self, valuesPerPoint):
    self.valuesPerPoint = int(valuesPerPoint)


  def __consolidatingGenerator(self, gen):
    buf = []
    for x in gen:
      buf.append(x)
      if len(buf) == self.valuesPerPoint:
        while None in buf: buf.remove(None)
        if buf:
          yield self.__consolidate(buf)
          buf = []
        else:
          yield None
    while None in buf: buf.remove(None)
    if buf: yield self.__consolidate(buf)
    else: yield None
    raise StopIteration


  def __consolidate(self, values):
    usable = [v for v in values if v is not None]
    if not usable: return None
    if self.consolidationFunc == 'sum':
      return sum(usable)
    if self.consolidationFunc == 'average':
      return float(sum(usable)) / len(usable)
    raise Exception, "Invalid consolidation function!"


  def __repr__(self):
    return 'TimeSeries(name=%s, start=%s, end=%s, step=%s)' % (self.name, self.start, self.end, self.step)


  def getInfo(self):
    """Pickle-friendly representation of the series"""
    return {
      'name' : self.name,
      'start' : self.start,
      'end' : self.end,
      'step' : self.step,
      'values' : list(self),
    }


# Data retrieval API
def fetchData(requestContext, pathExpr):

  seriesList = []
  startTime = int( time.mktime( requestContext['startTime'].timetuple() ) )
  endTime   = int( time.mktime( requestContext['endTime'].timetuple() ) )

  matching_nodes = STORE.find(pathExpr, startTime, endTime, local=requestContext['localOnly'])
  fetches = [(node, node.fetch(startTime, endTime)) for node in matching_nodes if node.is_leaf]

  for node, results in fetches:
    if isinstance(results, FetchInProgress):
      results = results.waitForResults()

    if not results:
      log.info("render.datalib.fetchData :: no results for %s.fetch(%s, %s)" % (node, startTime, endTime))
      continue

    (timeInfo, values) = results
    (start, end, step) = timeInfo

    series = TimeSeries(node.path, start, end, step, values)
    series.pathExpression = pathExpr #hack to pass expressions through to render functions
    seriesList.append(series)

  # Prune empty series with duplicate metric paths to avoid showing empty graph elements for old whisper data
  names = set([ series.name for series in seriesList ])
  for name in names:
    series_with_duplicate_names = [ series for series in seriesList if series.name == name ]
    empty_duplicates = [ series for series in series_with_duplicate_names if not nonempty(series) ]

    if series_with_duplicate_names == empty_duplicates and len(empty_duplicates) > 0: # if they're all empty
      empty_duplicates.pop() # make sure we leave one in seriesList

    for series in empty_duplicates:
      seriesList.remove(series)

  return seriesList


def nonempty(series):
  for value in series:
    if value is not None:
      return True

  return False
