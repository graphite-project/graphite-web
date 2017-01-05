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
# import pprint

from graphite.logger import log
from graphite.storage import STORE
from graphite.readers import FetchInProgress
from django.conf import settings
from graphite.util import epoch
from graphite.remote_storage import RemoteReader

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


def prefetchRemoteData(requestContext, pathExpressions):
  if requestContext['localOnly']:
    return

  (startTime, endTime, now) = _timebounds(requestContext)

  # Go through all of the remote nodes, and launch a fetch for each one.
  # Each fetch will take place in its own thread, since it's naturally parallel work.
  for pathExpr in pathExpressions:
    for store in STORE.remote_stores:
      reader = RemoteReader(store, {'path': pathExpr, 'intervals': []}, bulk_query=pathExpr)

      fetch_thread = threading.Thread(target=reader.fetch_list,
                                      args=(startTime, endTime, now, requestContext))
      fetch_thread.start()


def fetchRemoteData(requestContext, pathExpr, nodes):
  start = time.time()
  (startTime, endTime, now) = _timebounds(requestContext)
  log.info("Got timebounds %fs" % (time.time() - start))

  # Go through all of the nodes, and launch a fetch for each one.
  # Each fetch will take place in its own thread, since it's naturally parallel work.
  # Notable: return the 'seriesList' result from each node.fetch into result_queue
  # instead of directly from the method. Queue.Queue() is threadsafe.
  fetches = []
  results = []
  result_queue = Queue.Queue()
  for node in nodes:
    if not node.is_leaf:
      continue

    fetch_thread = threading.Thread(target=node.fetch,
                                    args=(startTime, endTime, now, result_queue, requestContext))
    fetch_thread.start()
    fetches.append(fetch_thread)

  deadline = start + settings.REMOTE_FETCH_TIMEOUT
  result_cnt = 0
  threads_alive = fetches

  log.info("Started %d threads %fs" % (len(threads_alive), time.time() - start))

  # Once the fetches have started, wait for them all to finish. Assuming an
  # upper bound of REMOTE_FETCH_TIMEOUT per thread, this should take about that
  # amount of time (6s by default) at the longest.
  while True:
    if time.time() > deadline:
      log.info("Timed out in fetchRemoteData")
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
      log.info("Got all read results in %fs" % (time.time() - start))
      break

  return results


# Data retrieval API
def fetchData(requestContext, pathExpr):
  start = time.time()

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
  retval = [ seriesList[k] for k in sorted(seriesList) ]

  log.info("render.datalib.fetchData :: completed in %fs" % (time.time() - start))

  return retval

def _fetchData(pathExpr, startTime, endTime, requestContext, seriesList):
  t = time.time()

  nodes = [node for node in STORE.find(pathExpr, startTime, endTime, local=requestContext['localOnly'])]

  result_queue = fetchRemoteData(requestContext, pathExpr, nodes)

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

  log.info("render.datalib._fetchData :: completed in %fs" % (time.time() - t))

  return seriesList

def nonempty(series):
  for value in series:
    if value is not None:
      return True

  return False
