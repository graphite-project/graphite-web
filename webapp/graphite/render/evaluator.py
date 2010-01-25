import datetime
import time
from django.conf import settings
from graphite.render.attime import parseATTime
from graphite.render.grammar import grammar
from graphite.render.functions import SeriesFunctions
from graphite.render.datatypes import TimeSeries
from graphite.render.carbonlink import CarbonLink
from graphite.logger import log


def evaluateTarget(target, timeInterval):
  tokens = grammar.parseString(target)
  result = evaluateTokens(tokens, timeInterval)

  if type(result) is TimeSeries:
    return [result] #we have to return a list of TimeSeries objects

  else:
    return result


def evaluateTokens(tokens, timeInterval, originalTime = None):
  if tokens.expression:
    if tokens[0][0][0] == "timeShift":
      delta = timeInterval[0] - parseATTime(tokens[0][0][1][1]['string'].strip('"'))
      delta += timeInterval[1] - timeInterval[0]
      originalTime = timeInterval
      timeInterval = (timeInterval[0] - delta, timeInterval[1] - delta)
    return evaluateTokens(tokens.expression, timeInterval, originalTime)

  elif tokens.pathExpression:
    pathExpr = tokens.pathExpression
    if pathExpr.lower().startswith('graphite.'):
      pathExpr = pathExpr[9:]

    seriesList = []
    (startTime,endTime) = originalTime or timeInterval

    for dbFile in settings.STORE.find(pathExpr):
      log.metric_access(dbFile.metric_path)
      getCacheResults = CarbonLink.sendRequest(dbFile.real_metric)
      dbResults = dbFile.fetch( timestamp(startTime), timestamp(endTime) )
      results = mergeResults(dbResults, getCacheResults())

      if not results:
        continue

      (timeInfo,values) = results
      (start,end,step) = timeInfo
      series = TimeSeries(dbFile.metric_path, start, end, step, values)
      series.pathExpression = pathExpr #hack to pass expressions through to render functions
      series.start = time.mktime(startTime.timetuple())
      series.end = time.mktime(endTime.timetuple())
      seriesList.append(series)

    return seriesList

  elif tokens.call:
    func = SeriesFunctions[tokens.call.func]
    args = [evaluateTokens(arg, timeInterval, originalTime) for arg in tokens.call.args]
    return func(*args)

  elif tokens.number:
    if tokens.number.integer:
      return int(tokens.number.integer)

    elif tokens.number.float:
      return float(tokens.number.float)

  elif tokens.string:
    return str(tokens.string)[1:-1]


def timestamp(datetime):
  "Convert a datetime object into epoch time"
  return time.mktime( datetime.timetuple() )


def mergeResults(dbResults, cacheResults):
  cacheResults = list(cacheResults)

  if not dbResults:
    return cacheResults
  elif not cacheResults:
    return dbResults

  (timeInfo,values) = dbResults
  (start,end,step) = timeInfo

  for (timestamp,value) in cacheResults:
    interval = timestamp - (timestamp % step)

    try:
      i = int(interval - start) / step
      values[i] = value
    except:
      pass

  return (timeInfo,values)
