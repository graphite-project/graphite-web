import time
from django.conf import settings
from web.render.grammar import grammar
from web.render.functions import SeriesFunctions
from web.render.datatypes import TimeSeries
from web.render.carbonlink import CarbonLink
from web.logger import log



def evaluateTarget(target, timeInterval):
  tokens = grammar.parseString(target)
  result = evaluateTokens(tokens, timeInterval)
  if type(result) is TimeSeries:
    return [result] #we have to return a list of TimeSeries objects
  else:
    return result


def evaluateTokens(tokens, timeInterval):
  if tokens.expression:
    return evaluateTokens(tokens.expression, timeInterval)
  elif tokens.pathExpression:
    pathExpr = tokens.pathExpression
    if pathExpr.lower().startswith('graphite.'):
      pathExpr = pathExpr[9:]
    seriesList = []
    (startTime,endTime) = timeInterval
    for dbFile in settings.FINDER.find(pathExpr):
      log.metric_access(dbFile.graphite_path)
      getCacheResults = CarbonLink.sendRequest(dbFile.graphite_path)
      dbResults = dbFile.fetch( timestamp(startTime), timestamp(endTime) )
      results = mergeResults(dbResults, getCacheResults())
      if not results: continue
      (timeInfo,values) = results
      (start,end,step) = timeInfo
      series = TimeSeries(dbFile.graphite_path, start, end, step, values)
      series.pathExpression = pathExpr #hack to pass expressions through to render functions
      seriesList.append(series)
    return seriesList
  elif tokens.call:
    func = SeriesFunctions[tokens.call.func]
    args = [evaluateTokens(arg, timeInterval) for arg in tokens.call.args]
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
  if not cacheResults:
    return dbResults

  (timeInfo,values) = dbResults
  (start,end,step) = timeInfo

  for (timestamp,value) in cacheResults:
    interval = timestamp - (timestamp % step)
    try:
      i = int(interval - start) / int(step)
      values[i] = value
    except:
      pass

  return (timeInfo,values)
