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
import threading
import Queue
import time

from graphite.logger import log
from graphite.storage import STORE
from django.conf import settings
from graphite.util import epoch

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


def _timebounds(requestContext):
  startTime = int(epoch(requestContext['startTime']))
  endTime = int(epoch(requestContext['endTime']))
  now = int(epoch(requestContext['now']))

  return (startTime, endTime, now)


def _prefetchMetricKey(pathExpression, start, end):
  return '-'.join([pathExpression, str(start), str(end)])


def prefetchRemoteData(requestContext, pathExpressions):
  # if required, fetch data from all remote nodes
  # storing the result in a big hash of the form:
  # data[node][hash(originalPathExpression, start, end)] = [
  #   matchingSeries, matchingSeries2, ... ]

  prefetchedRemoteData = {}
  if requestContext['localOnly']:
    return prefetchedRemoteData

  (startTime, endTime, now) = _timebounds(requestContext)
  result_queue = fetchRemoteData(requestContext, pathExpressions, False)
  while not result_queue.empty():
    try:
      (node, results) = result_queue.get_nowait()
    except Queue.Empty:
      log.exception("result_queue not empty, but unable to retrieve results")

    # prefill result with empty list
    # Needed to be able to detect if a query has already been made
    prefetchedRemoteData[node] = {}
    for pe in pathExpressions:
      prefetchedRemoteData[node][_prefetchMetricKey(pe, startTime, endTime)] = []

    for series in results:
      # series.pathExpression is original target, ie. containing wildcards
      # XXX would be nice to disable further prefetch calls to that backend
      try:
        k = _prefetchMetricKey(series['pathExpression'], startTime, endTime)
      except KeyError:
        log.exception("Remote node %s doesn't support prefetching data" % node)
        raise

      if prefetchedRemoteData[node].get(k) is None:
        # This should not be needed because of above filling with [],
        # but could happen if backend sends unexpected stuff
        prefetchedRemoteData[node][k] = [series]
      else:
        prefetchedRemoteData[node][k].append(series)

  return prefetchedRemoteData


def prefetchLookup(requestContext, node):
  # Returns a seriesList if found in cache
  # or None if key doesn't exist (aka prefetch didn't cover this pathExpr / timerange
  (start, end, now) = _timebounds(requestContext)
  try:
    cache = requestContext['prefetchedRemoteData'][node.store.host]
    r = cache[_prefetchMetricKey(node.metric_path, start, end)]
  except (AttributeError, KeyError):
    r = None

  return r


def fetchRemoteData(requestContext, pathExpr, usePrefetchCache=settings.REMOTE_PREFETCH_DATA):
  (startTime, endTime, now) = _timebounds(requestContext)
  nodes = STORE.find(pathExpr, startTime, endTime, local=requestContext['localOnly'])

  # Go through all of the remote_nodes, and launch a remote_fetch for each one.
  # Each fetch will take place in its own thread, since it's naturally parallel work.
  # Notable: return the 'seriesList' result from each node.fetch into result_queue
  # instead of directly from the method. Queue.Queue() is threadsafe.
  fetches = []
  results = []
  result_queue = Queue.Queue()
  for node in nodes:
    need_fetch = True

    if not node.local and usePrefetchCache:
      series = prefetchLookup(requestContext, node)
      # Will be either:
      #   []: prefetch done, returned no data. Do not fetch
      #   seriesList: prefetch done, returned data, do not fetch
      #   None: prefetch not done, FETCH
      if series is not None:
        results.append( (node, series) )
        need_fetch = False

    if need_fetch:
      fetch_thread = threading.Thread(target=node.fetch,
                                      args=(startTime, endTime, now, result_queue, requestContext.get('forwardHeaders')))
      fetch_thread.start()
      fetches.append(fetch_thread)

  deadline = time.clock() + settings.REMOTE_FETCH_TIMEOUT
  result_cnt = 0
  threads_alive = fetches

  # Once the fetches have started, wait for them all to finish. Assuming an
  # upper bound of REMOTE_FETCH_TIMEOUT per thread, this should take about that
  # amount of time (6s by default) at the longest.
  while True:
    if time.clock() > deadline:
      log.info("Timed out")
      break

    threads_alive = [t for t in threads_alive if t.is_alive()]

    try:
      result = result_queue.get(True, 0.01)
    except Queue.Empty:
      if len(threads_alive) == 0:
        log.info("Empty queue and no threads alive")
        break
      continue

    results.append(result)
    result_cnt += 1
    if result_cnt >= len(fetches):
      log.info("Got all results")
      break

  return results


# Data retrieval API
def fetchData(requestContext, pathExpr):
  seriesList = {}
  (startTime, endTime, now) = _timebounds(requestContext)

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
  return [ seriesList[k] for k in sorted(seriesList) ]

def _fetchData(pathExpr, startTime, endTime, requestContext, seriesList):
  # matching_nodes = STORE.find(pathExpr, startTime, endTime, local=True)
  # fetches = [(node, node.fetch(startTime, endTime)) for node in matching_nodes if node.is_leaf]
  result_queue = fetchRemoteData(requestContext, pathExpr)
  #pp = pprint.PrettyPrinter(indent=4)
  #log.rendering('DEBUG: fetches...')
  #log.rendering(pp.pprint(fetches))
  #log.rendering('DEBUG: test_result_queue...')
  #log.rendering(pp.pprint(result_queue))

  for node, results in result_queue:
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
          [val for val in series['values'] if val is None])

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
        # In case if we are merging data - the existing series has no gaps and
        # there is nothing to merge together.  Save ourselves some work here.
        #
        # OR - if we picking best serie:
        #
        # We already have this series in the seriesList, and the
        # candidate is 'worse' than what we already have, we don't need
        # to compare anything else. Save ourselves some work here.
        break

        # If we looked at this series above, and it matched a 'known'
        # series already, then it's already in the series list (or ignored).
        # If not, append it here.
    else:
      seriesList[series.name] = series

  return seriesList

def nonempty(series):
  for value in series:
    if value is not None:
      return True

  return False
