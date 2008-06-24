import time
from django.conf import settings
from web.render.grammar import grammar
from web.render.functions import SeriesFunctions
from web.render.datatypes import TimeSeries


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
    seriesList = []
    (startTime,endTime) = timeInterval
    for dbFile in Finder.find(tokens.pathExpression):
      results = dbFile.fetch( timestamp(startTime), timestamp(endTime) )
      if not results: continue
      (timeInfo,values) = results
      (start,end,step) = timeInfo
      series = TimeSeries(dbFile.graphite_path, start, end, step, values)
      series.pathExpression = tokens.pathExpression #hack to pass expressions through to render functions
      seriesList.append(series)
    return seriesList
  elif tokens.call:
    func = SeriesFunctions[tokens.call.func]
    args = [evaluate(arg) for arg in tokens.call.args]
    return func(args)
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
