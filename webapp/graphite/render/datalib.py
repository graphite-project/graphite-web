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

from traceback import format_exc

from django.conf import settings

from graphite.future import Future
from graphite.logger import log
from graphite.readers.utils import wait_for_result
from graphite.storage import STORE
from graphite.util import timebounds, logtime
from graphite.render.utils import extractPathExpressions


class TimeSeries(list):
  def __init__(self, name, start, end, step, values, consolidate='average', tags=None, xFilesFactor=None):
    list.__init__(self, values)
    self.name = name
    self.start = start
    self.end = end
    self.step = step
    self.consolidationFunc = consolidate
    self.valuesPerPoint = 1
    self.options = {}
    self.pathExpression = name
    self.xFilesFactor = xFilesFactor if xFilesFactor is not None else settings.DEFAULT_XFILES_FACTOR

    if tags:
      self.tags = tags
    else:
      self.tags = {'name': name}
      # parse for tags if a tagdb is configured and name doesn't look like a function-wrapped name
      if STORE.tagdb and not re.match('^[a-z]+[(].+[)]$', name, re.IGNORECASE):
        try:
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
    'max': max,
    'min': min,
    'first': lambda usable: usable[0],
    'last': lambda usable: usable[-1],
  }
  def __consolidatingGenerator(self, gen):
    try:
      cf = self.__consolidation_functions[self.consolidationFunc]
    except KeyError:
      raise Exception("Invalid consolidation function: '%s'" % self.consolidationFunc)

    buf = []  # only the not-None values
    valcnt = 0

    for x in gen:
      valcnt += 1
      if x is not None:
        buf.append(x)

      if valcnt == self.valuesPerPoint:
        if buf and (len(buf) / self.valuesPerPoint) >= self.xFilesFactor:
          yield cf(buf)
        else:
          yield None
        buf = []
        valcnt = 0

    if valcnt > 0:
      if buf and (len(buf) / self.valuesPerPoint) >= self.xFilesFactor:
        yield cf(buf)
      else:
        yield None

    raise StopIteration


  def __repr__(self):
    return 'TimeSeries(name=%s, start=%s, end=%s, step=%s, valuesPerPoint=%s, consolidationFunc=%s, xFilesFactor=%s)' % (
      self.name, self.start, self.end, self.step, self.valuesPerPoint, self.consolidationFunc, self.xFilesFactor)


  def getInfo(self):
    """Pickle-friendly representation of the series"""
    return {
      'name' : self.name,
      'start' : self.start,
      'end' : self.end,
      'step' : self.step,
      'values' : list(self),
      'pathExpression' : self.pathExpression,
      'valuesPerPoint' : self.valuesPerPoint,
      'consolidationFunc': self.consolidationFunc,
      'xFilesFactor' : self.xFilesFactor,
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


@logtime(custom_msg=True)
def _fetchData(pathExpr, startTime, endTime, now, requestContext, seriesList, msg_setter=None):
  msg_setter("retrieval of \"%s\" took" % str(pathExpr))

  result_queue = []
  remote_done = False

  if settings.REMOTE_PREFETCH_DATA:
    prefetched = requestContext['prefetched'].get((startTime, endTime, now), None)
    if prefetched is not None:
      for result in prefetched[pathExpr]:
        result_queue.append(result)
      # Since we pre-fetched remote data only, now we can get local data only.
      remote_done = True

  local = remote_done or requestContext['localOnly']
  matching_nodes = STORE.find(
    pathExpr, startTime, endTime,
    local=local,
    headers=requestContext['forwardHeaders'],
    leaves_only=True,
  )

  for node in matching_nodes:
    result_queue.append(
      (node.path, node.fetch(startTime, endTime, now, requestContext)))

  return _merge_results(pathExpr, startTime, endTime, result_queue, seriesList, requestContext)


def _merge_results(pathExpr, startTime, endTime, result_queue, seriesList, requestContext):
  log.debug("render.datalib.fetchData :: starting to merge")
  for path, results in result_queue:
    results = wait_for_result(results)

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

    # Used as a cache to avoid recounting series None values below.
    series_best_nones = {}

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

      if known_nones > candidate_nones and len(series):
        if settings.REMOTE_STORE_MERGE_RESULTS:
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
        if settings.REMOTE_PREFETCH_DATA:
          # if we're using REMOTE_PREFETCH_DATA we can save some time by skipping
          # find, but that means we don't know how many nodes to expect so we
          # have to iterate over all returned results
          continue

        # In case if we are merging data - the existing series has no gaps and
        # there is nothing to merge together.  Save ourselves some work here.
        #
        # OR - if we picking best serie:
        #
        # We already have this series in the seriesList, and the
        # candidate is 'worse' than what we already have, we don't need
        # to compare anything else. Save ourselves some work here.
        break

    else:
      # If we looked at this series above, and it matched a 'known'
      # series already, then it's already in the series list (or ignored).
      # If not, append it here.
      seriesList[series.name] = series

  # Stabilize the order of the results by ordering the resulting series by name.
  # This returns the result ordering to the behavior observed pre PR#1010.
  return [seriesList[k] for k in sorted(seriesList)]


# Data retrieval API
@logtime(custom_msg=True)
def fetchData(requestContext, pathExpr, msg_setter=None):
  msg_setter("retrieval of \"%s\" took" % str(pathExpr))

  seriesList = {}
  (startTime, endTime, now) = timebounds(requestContext)

  retries = 1 # start counting at one to make log output and settings more readable
  while True:
    try:
      seriesList = _fetchData(pathExpr, startTime, endTime, now, requestContext, seriesList)
      break
    except Exception:
      if retries >= settings.MAX_FETCH_RETRIES:
        log.exception("Failed after %s retry! Root cause:\n%s" %
            (settings.MAX_FETCH_RETRIES, format_exc()))
        raise
      else:
        log.exception("Got an exception when fetching data! Try: %i of %i. Root cause:\n%s" %
                     (retries, settings.MAX_FETCH_RETRIES, format_exc()))
        retries += 1

  return seriesList


def nonempty(series):
  for value in series:
    if value is not None:
      return True

  return False


class PrefetchedData(Future):
  def __init__(self, results):
    self._results = results
    self._prefetched = None

  def _data(self):
    if self._prefetched is None:
      self._fetch_data()
    return self._prefetched

  def _fetch_data(self):
    prefetched = collections.defaultdict(list)
    for result in self._results:
      fetched = wait_for_result(result)

      if fetched is None:
        continue

      for result in fetched:
        prefetched[result['pathExpression']].append((
          result['name'],
          (
            result['time_info'],
            result['values'],
          ),
        ))

    self._prefetched = prefetched


def prefetchRemoteData(requestContext, targets):
  """Prefetch a bunch of path expressions and stores them in the context.

  The idea is that this will allow more batching that doing a query
  each time evaluateTarget() needs to fetch a path. All the prefetched
  data is stored in the requestContext, to be accessed later by datalib.
  """
  # only prefetch if there is at least one active remote finder
  # this is to avoid the overhead of tagdb lookups in extractPathExpressions
  if len([finder for finder in STORE.finders if not getattr(finder, 'local', True) and not getattr(finder, 'disabled', False)]) < 1:
    return

  pathExpressions = extractPathExpressions(targets)
  log.rendering("Prefetching remote data for [%s]" % (', '.join(pathExpressions)))

  (startTime, endTime, now) = timebounds(requestContext)

  results = STORE.fetch_remote(pathExpressions, startTime, endTime, now, requestContext)

  requestContext['prefetched'][(startTime, endTime, now)] = PrefetchedData(results)
