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
from __future__ import division

import collections
import re
import time
import types
from six import text_type

from django.conf import settings

from graphite.logger import log
from graphite.storage import STORE
from graphite.util import timebounds, logtime


try:
  from collections import UserDict
except ImportError:
  from UserDict import IterableUserDict as UserDict


class Tags(UserDict):
  def __setitem__(self, key, value):
    self.data[key] = str(value)


class TimeSeries(list):
  def __init__(self, name, start, end, step, values, consolidate='average', tags=None, xFilesFactor=None, pathExpression=None):
    list.__init__(self, values)
    self.name = name
    self.start = start
    self.end = end
    self.step = step
    self.consolidationFunc = consolidate
    self.valuesPerPoint = 1
    self.options = {}
    self.pathExpression = pathExpression or name
    self.xFilesFactor = xFilesFactor if xFilesFactor is not None else settings.DEFAULT_XFILES_FACTOR

    if tags:
      self.tags = tags
    else:
      self.tags = {'name': name}
      # parse for tags if a tagdb is configured and name doesn't look like a function-wrapped name
      try:
        if STORE.tagdb and not re.match('^[a-z]+[(].+[)]$', name, re.IGNORECASE):
          self.tags = STORE.tagdb.parse(name).tags
      except Exception as err:
        # tags couldn't be parsed, just use "name" tag
        log.debug("Couldn't parse tags for %s: %s" % (name, err))

  def __eq__(self, other):
    if not isinstance(other, TimeSeries):
      return False

    if hasattr(self, 'color'):
      if not hasattr(other, 'color') or (self.color != other.color):
        return False
    elif hasattr(other, 'color'):
      return False

    return ((self.name, self.start, self.end, self.step, self.consolidationFunc, self.valuesPerPoint, self.options, self.xFilesFactor) ==
      (other.name, other.start, other.end, other.step, other.consolidationFunc, other.valuesPerPoint, other.options, other.xFilesFactor)) and list.__eq__(self, other)

  def __iter__(self):
    if self.valuesPerPoint > 1:
      return self.__consolidatingGenerator( list.__iter__(self) )
    else:
      return list.__iter__(self)

  def consolidate(self, valuesPerPoint):
    self.valuesPerPoint = int(valuesPerPoint)

  __consolidation_functions = {
    'sum': sum,
    'average': lambda usable: sum(usable) / len(usable),
    'avg_zero': lambda usable: sum(usable) / len(usable),
    'max': max,
    'min': min,
    'first': lambda usable: usable[0],
    'last': lambda usable: usable[-1],
  }
  __consolidation_function_aliases = {
    'avg': 'average',
  }

  def __consolidatingGenerator(self, gen):
    if self.consolidationFunc in self.__consolidation_functions:
      cf = self.__consolidation_functions[self.consolidationFunc]
    elif self.consolidationFunc in self.__consolidation_function_aliases:
      cf = self.__consolidation_functions[self.__consolidation_function_aliases[self.consolidationFunc]]
    else:
      raise Exception("Invalid consolidation function: '%s'" % self.consolidationFunc)

    buf = []
    valcnt = 0
    nonNull = 0

    for x in gen:
      valcnt += 1
      if x is not None:
        buf.append(x)
        nonNull += 1
      elif self.consolidationFunc == 'avg_zero':
        buf.append(0)

      if valcnt == self.valuesPerPoint:
        if nonNull and (nonNull / self.valuesPerPoint) >= self.xFilesFactor:
          yield cf(buf)
        else:
          yield None
        buf = []
        valcnt = 0
        nonNull = 0

    if valcnt > 0:
      if nonNull and (nonNull / self.valuesPerPoint) >= self.xFilesFactor:
        yield cf(buf)
      else:
        yield None

    return

  def __repr__(self):
    return 'TimeSeries(name=%s, start=%s, end=%s, step=%s, valuesPerPoint=%s, consolidationFunc=%s, xFilesFactor=%s)' % (
      self.name, self.start, self.end, self.step, self.valuesPerPoint, self.consolidationFunc, self.xFilesFactor)

  def getInfo(self):
    """Pickle-friendly representation of the series"""
    # make sure everything is unicode in python 2.x and 3.x
    return {
      text_type('name') : text_type(self.name),
      text_type('start') : self.start,
      text_type('end') : self.end,
      text_type('step') : self.step,
      text_type('values') : list(self),
      text_type('pathExpression') : text_type(self.pathExpression),
      text_type('valuesPerPoint') : self.valuesPerPoint,
      text_type('consolidationFunc'): text_type(self.consolidationFunc),
      text_type('xFilesFactor') : self.xFilesFactor,
    }

  def copy(self, name=None, start=None, end=None, step=None, values=None, consolidate=None, tags=None, xFilesFactor=None):
    return TimeSeries(
      name if name is not None else self.name,
      start if start is not None else self.start,
      end if end is not None else self.end,
      step if step is not None else self.step,
      values if values is not None else self.values,
      consolidate=consolidate if consolidate is not None else self.consolidationFunc,
      tags=tags if tags is not None else self.tags,
      xFilesFactor=xFilesFactor if xFilesFactor is not None else self.xFilesFactor
    )

  def datapoints(self):
    timestamps = range(int(self.start), int(self.end) + 1, int(self.step * self.valuesPerPoint))
    return list(zip(self, timestamps))

  @property
  def tags(self):
    return self.__tags

  @tags.setter
  def tags(self, tags):
    if isinstance(tags, Tags):
      self.__tags = tags
    elif isinstance(tags, dict):
      self.__tags = Tags(tags)
    else:
      raise Exception('Invalid tags specified')


# Data retrieval API
@logtime
def fetchData(requestContext, pathExpr, timer=None):
  timer.set_msg("lookup and merge of \"%s\" took" % str(pathExpr))

  seriesList = {}
  (startTime, endTime, now) = timebounds(requestContext)

  prefetched = requestContext.get('prefetched', {}).get((startTime, endTime, now), {}).get(pathExpr)
  if not prefetched:
    return []

  return _merge_results(pathExpr, startTime, endTime, prefetched, seriesList, requestContext)


def _merge_results(pathExpr, startTime, endTime, prefetched, seriesList, requestContext):
  log.debug("render.datalib.fetchData :: starting to merge")

  # Used as a cache to avoid recounting series None values below.
  series_best_nones = {}

  for path, results in prefetched:
    if not results:
      log.debug("render.datalib.fetchData :: no results for %s.fetch(%s, %s)" % (path, startTime, endTime))
      continue

    try:
      (timeInfo, values) = results
    except ValueError as e:
      raise Exception("could not parse timeInfo/values from metric '%s': %s" % (path, e))
    (start, end, step) = timeInfo

    series = TimeSeries(path, start, end, step, values, xFilesFactor=requestContext.get('xFilesFactor'))

    # hack to pass expressions through to render functions
    series.pathExpression = pathExpr

    if series.name in seriesList:
      # This counts the Nones in each series, and is unfortunately O(n) for each
      # series, which may be worth further optimization. The value of doing this
      # at all is to avoid the "flipping" effect of loading a graph multiple times
      # and having inconsistent data returned if one of the backing stores has
      # inconsistent data. This is imperfect as a validity test, but in practice
      # nicely keeps us using the "most complete" dataset available. Think of it
      # as a very weak CRDT resolver.
      candidate_nones = 0
      if not settings.REMOTE_STORE_MERGE_RESULTS:
        candidate_nones = len(
          [val for val in values if val is None])

      known = seriesList[series.name]
      # To avoid repeatedly recounting the 'Nones' in series we've already seen,
      # cache the best known count so far in a dict.
      if known.name in series_best_nones:
        known_nones = series_best_nones[known.name]
      else:
        known_nones = len([val for val in known if val is None])
        series_best_nones[known.name] = known_nones

      if known_nones > candidate_nones and len(series):
        if settings.REMOTE_STORE_MERGE_RESULTS and len(series) == len(known):
          # This series has potential data that might be missing from
          # earlier series.  Attempt to merge in useful data and update
          # the cache count.
          log.debug("Merging multiple TimeSeries for %s" % known.name)
          for i, j in enumerate(known):
            if j is None and series[i] is not None:
              known[i] = series[i]
              known_nones -= 1
          # Store known_nones in our cache
          series_best_nones[known.name] = known_nones
        else:
          # Not merging data -
          # we've found a series better than what we've already seen. Update
          # the count cache and replace the given series in the array.
          series_best_nones[known.name] = candidate_nones
          seriesList[known.name] = series

    else:
      # If we looked at this series above, and it matched a 'known'
      # series already, then it's already in the series list (or ignored).
      # If not, append it here.
      seriesList[series.name] = series

  # Stabilize the order of the results by ordering the resulting series by name.
  # This returns the result ordering to the behavior observed pre PR#1010.
  return [seriesList[k] for k in sorted(seriesList)]


def prefetchData(requestContext, pathExpressions):
  """Prefetch a bunch of path expressions and stores them in the context.

  The idea is that this will allow more batching than doing a query
  each time evaluateTarget() needs to fetch a path. All the prefetched
  data is stored in the requestContext, to be accessed later by fetchData.
  """
  if not pathExpressions:
    return

  start = time.time()
  log.debug("Fetching data for [%s]" % (', '.join(pathExpressions)))

  (startTime, endTime, now) = timebounds(requestContext)

  prefetched = collections.defaultdict(list)

  for result in STORE.fetch(pathExpressions, startTime, endTime, now, requestContext):
    if result is None:
      continue

    prefetched[result['pathExpression']].append((
      result['name'],
      (
        result['time_info'],
        result['values'],
      ),
    ))

  # Several third-party readers including rrdtool and biggraphite return values in a
  # generator which can only be iterated on once. These must be converted to a list.
  for pathExpression, items in prefetched.items():
    for i, (name, (time_info, values)) in enumerate(items):
      if isinstance(values, types.GeneratorType):
        prefetched[pathExpression][i] = (name, (time_info, list(values)))

  if not requestContext.get('prefetched'):
    requestContext['prefetched'] = {}

  if (startTime, endTime, now) in requestContext['prefetched']:
    for k in prefetched:
      requestContext['prefetched'][(startTime, endTime, now)][k] = prefetched[k]
  else:
      requestContext['prefetched'][(startTime, endTime, now)] = prefetched

  log.rendering("Fetched data for [%s] in %fs" % (', '.join(pathExpressions), time.time() - start))
