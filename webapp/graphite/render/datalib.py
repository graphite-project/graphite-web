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
from graphite.jobs import get_job_timerange, get_jobs, get_nodes, has_job


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
    if self.consolidationFunc == 'max':
      return max(usable)
    if self.consolidationFunc == 'min':
      return min(usable)
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
  user = requestContext['user']

  # Split the job from the path
  (job, pathExpr) = pathExpr.split(".", 1);

  # Security: If the user requests a job that's not his: kick him out unless the user may see all data
  if not has_job(user, job) and not user.has_perm('account.can_see_all'):
    return []


  # Get the maximum visible time range from the job
  (jobStart, jobEnd) = get_job_timerange(job)

  # Limit the visible period to the period the job has run
  if startTime < jobEnd:
    startTime = max(startTime, jobStart)
  else:
    startTime = jobStart

  if endTime > jobStart:
    endTime = min(endTime, jobEnd)
  else:
    endTime = jobEnd

  '''
  Simple fix: If for some weird reason the endTime is earlier then the startTime; we would get an
  500 error. If we equalize the start to the end, we just get a "No data" message
  '''
  if endTime < startTime:
    endTime = startTime

  matching_nodes = STORE.find(pathExpr, startTime, endTime, local=requestContext['localOnly'], job_nodes=get_nodes(job))
  fetches = [(node, node.fetch(startTime, endTime)) for node in matching_nodes if node.is_leaf]

  for node, results in fetches:
    if isinstance(results, FetchInProgress):
      results = results.waitForResults()

    if not results:
      log.info("render.datalib.fetchData :: no results for %s.fetch(%s, %s)" % (node, startTime, endTime))
      continue

    (timeInfo,values) = results
    (start,end,step) = timeInfo
    try:
        (timeInfo, values) = results
    except ValueError, e:
        raise Exception("could not parse timeInfo/values from metric '%s': %s" % (node.path, e))
    (start, end, step) = timeInfo

    series = TimeSeries(job + '.' + node.path, start, end, step, values)
    series.pathExpression = job + '.' + pathExpr #hack to pass expressions through to render functions
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
