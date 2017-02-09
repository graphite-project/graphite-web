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

# import pprint
import time
from threading import Lock, current_thread
# import pprint

from graphite.logger import log
from graphite.storage import STORE
from graphite.readers import FetchInProgress
from graphite.remote_storage import RemoteReader
from django.conf import settings
from graphite.util import timebounds

from traceback import format_exc

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
    self.pathExpression = name


  def __eq__(self, other):
    if isinstance(other, TimeSeries):
      color_check = True
      if hasattr(self, 'color'):
        if hasattr(other, 'color'):
          color_check = (self.color == other.color)
        else:
          color_check = False
      elif hasattr(other, 'color'):
        color_check = False

      return ((self.name, self.start, self.end, self.step, self.consolidationFunc, self.valuesPerPoint, self.options) ==
              (other.name, other.start, other.end, other.step, other.consolidationFunc, other.valuesPerPoint, other.options)) and list.__eq__(self, other) and color_check
    return False


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
    if self.consolidationFunc == 'max':
      return max(usable)
    if self.consolidationFunc == 'min':
      return min(usable)
    raise Exception("Invalid consolidation function: '%s'" % self.consolidationFunc)


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
      'pathExpression' : self.pathExpression,
    }


def prefetchRemoteData(requestContext, pathExpressions):
  if requestContext['localOnly']:
    return

  (startTime, endTime, now) = timebounds(requestContext)

  requestContext['result_completeness'] = {
    'lock': Lock(),
    'stores_left': len(STORE.remote_stores),
    'await_complete': Lock(),
  }
  if requestContext['result_completeness']['stores_left'] > 0:
    requestContext['result_completeness']['await_complete'].acquire()

  log.info('thread %s prefetchRemoteData:: Starting fetch_list on all backends' % current_thread().name)
  for pathExpr in pathExpressions:
    for store in STORE.remote_stores:
      reader = RemoteReader(store, {'path': pathExpr, 'intervals': []}, bulk_query=pathExpr)
      reader.fetch_list(startTime, endTime, now, requestContext)


def fetchRemoteData(requestContext, pathExpr, nodes):
  start = time.time()
  (startTime, endTime, now) = timebounds(requestContext)
  log.info("Got timebounds %fs" % (time.time() - start))

  leaf_nodes = [node for node in nodes if node.is_leaf]

  def _gen():
    for node in leaf_nodes:
      yield node.fetch(startTime, endTime, now, requestContext)

  return _gen()


# Data retrieval API
def fetchData(requestContext, pathExpr):
  start = time.time()

  seriesList = {}
  (startTime, endTime, now) = timebounds(requestContext)

  retries = 1 # start counting at one to make log output and settings more readable
  while True:
    try:
      seriesList = _fetchData(pathExpr, startTime, endTime, requestContext, seriesList)
      break
    except Exception, e:
      if retries >= settings.MAX_FETCH_RETRIES:
        log.exception("Failed after %s retry! Root cause:\n%s" %
            (settings.MAX_FETCH_RETRIES, format_exc()))
        raise
      else:
        log.exception("Got an exception when fetching data! Try: %i of %i. Root cause:\n%s" %
                     (retries, settings.MAX_FETCH_RETRIES, format_exc()))
        retries += 1

  # Stabilize the order of the results by ordering the resulting series by name.
  # This returns the result ordering to the behavior observed pre PR#1010.
  retval = [ seriesList[k] for k in sorted(seriesList) ]

  log.info("render.datalib.fetchData :: completed in %fs" % (time.time() - start))

  return retval

def _fetchData(pathExpr, startTime, endTime, requestContext, seriesList):
  t = time.time()

  if settings.REMOTE_PREFETCH_DATA and 'result_completeness' in requestContext:
    result_completeness = requestContext['result_completeness']

    # wait for all results to come in
    acquired = False
    while not acquired:
      acquired=result_completeness['await_complete'].acquire(False)
      if time.time() - t > settings.REMOTE_FETCH_TIMEOUT:
        raise Exception('timed out waiting for results')

    # inflight_requests is only present if at least one remote store
    # has been queried
    if 'inflight_requests' in requestContext:
      fetches = requestContext['inflight_requests']
    else:
      fetches = {}

    def result_queue_generator():
      log.info(
        'render.datalib.fetchData:: result_queue_generator got {count} fetches'
        .format(count=len(fetches)),
      )
      for key, fetch in fetches.iteritems():
        log.info(
          'render.datalib.fetchData:: getting results of {host}'
          .format(host=key),
        )

        if isinstance(fetch, FetchInProgress):
          fetch = fetch.waitForResults()

        if fetch is None:
          log.info('render.datalib.fetchData:: fetch is None')
          continue

        for result in fetch:
          yield (
            result['node'],
            (
              (result['start'], result['end'], result['step']),
              result['values'],
            ),
          )

    result_queue = result_queue_generator()

  else:
    nodes = [node for node in STORE.find(pathExpr, startTime, endTime, local=requestContext['localOnly'])]
    result_queue = fetchRemoteData(requestContext, pathExpr, nodes)

  log.info("render.datalib.fetchData :: starting to merge")
  for node, results in result_queue:
    if isinstance(results, FetchInProgress):
      results = results.waitForResults()

    if not results:
      log.info("render.datalib.fetchData :: no results for %s.fetch(%s, %s)" % (node, startTime, endTime))
      continue

    try:
      (timeInfo, values) = results
    except ValueError as e:
      raise Exception("could not parse timeInfo/values from metric '%s': %s" % (node.path, e))
    (start, end, step) = timeInfo

    series = TimeSeries(node.path, start, end, step, values)

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

      if known_nones > candidate_nones:
        if settings.REMOTE_STORE_MERGE_RESULTS:
          # This series has potential data that might be missing from
          # earlier series.  Attempt to merge in useful data and update
          # the cache count.
          log.info("Merging multiple TimeSeries for %s" % known.name)
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
        if not settings.REMOTE_PREFETCH_DATA:
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
          # if we're using REMOTE_PREFETCH_DATA we can save some time by skipping
          # find, but that means we don't know how many nodes to expect so we
          # have to iterate over all returned results
          continue

        # If we looked at this series above, and it matched a 'known'
        # series already, then it's already in the series list (or ignored).
        # If not, append it here.
    else:
      seriesList[series.name] = series

  log.info("render.datalib._fetchData :: completed in %fs" % (time.time() - t))

  return seriesList

def nonempty(series):
  for value in series:
    if value is not None:
      return True

  return False
