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

from graphite.render.datalib import TimeSeries, timestamp
from graphite.render.attime import parseTimeOffset
from itertools import izip
import math
import re

#Utility functions
def safeSum(values):
  safeValues = [v for v in values if v is not None]
  if not safeValues: return None
  return sum(safeValues)

def safeDiff(values):
  safeValues = [v for v in values if v is not None]
  if not safeValues: return None
  values = map(lambda x: x*-1, safeValues[1:])
  values.insert(0, safeValues[0])
  return sum(values)

def safeLen(values):
  return len([v for v in values if v is not None])

def safeDiv(a,b):
  if a is None: return None
  if b in (0,None): return None
  return float(a) / float(b)

def safeMul(a,b):
  if a is None or b is None: return None
  return float(a) * float(b)

def safeLast(values):
  for v in reversed(values):
    if v is not None: return v

def safeMin(values):
  safeValues = [v for v in values if v is not None]
  if safeValues:
    return min(safeValues)

def safeMax(values):
  safeValues = [v for v in values if v is not None]
  if safeValues:
    return max(safeValues)

def lcm(a,b):
  'least common multiple'
  if a == b: return a
  if a < b: (a,b) = (b,a) #ensure a > b
  for i in xrange(1,a * b):
    if a % (b * i) == 0 or (b * i) % a == 0: #probably inefficient
      return max(a,b * i)
  return a * b

def normalize(seriesLists):
  seriesList = reduce(lambda L1,L2: L1+L2,seriesLists)
  step = reduce(lcm,[s.step for s in seriesList])
  for s in seriesList:
    s.consolidate( step / s.step )
  start = min([s.start for s in seriesList])
  end = max([s.end for s in seriesList])
  end -= (end - start) % step
  return (seriesList,start,end,step)

# Series Functions

#NOTE: Some of the functions below use izip, which may be problematic.
#izip stops when it hits the end of the shortest series
#in practice this *shouldn't* matter because all series will cover
#the same interval, despite having possibly different steps...

def sumSeries(requestContext, *seriesLists):
  try:
    (seriesList,start,end,step) = normalize(seriesLists)
  except:
    return []
  #name = "sumSeries(%s)" % ','.join((s.name for s in seriesList))
  name = "sumSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeSum(row) for row in izip(*seriesList) )
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]

def sumSeriesWithWildcards(requestContext, seriesList, *position): #XXX
  if type(position) is int:
    positions = [position]
  else:
    positions = position
  newSeries = {}
  for series in seriesList:
    newname = '.'.join(map(lambda x: x[1], filter(lambda i: i[0] not in positions, enumerate(series.name.split('.')))))
    if newname in newSeries.keys():
      newSeries[newname] = sumSeries(requestContext, (series, newSeries[newname]))[0]
    else:
      newSeries[newname] = series
    newSeries[newname].name = newname
  return newSeries.values()

def averageSeriesWithWildcards(requestContext, seriesList, *position): #XXX
  if type(position) is int:
    positions = [position]
  else:
    positions = position
  result = []
  matchedList = {}
  for series in seriesList:
    newname = '.'.join(map(lambda x: x[1], filter(lambda i: i[0] not in positions, enumerate(series.name.split('.')))))
    if not matchedList.has_key(newname):
      matchedList[newname] = []
    matchedList[newname].append(series)
  for name in matchedList.keys():
    result.append( averageSeries(requestContext, (matchedList[name]))[0] )
    result[-1].name = name
  return result

def diffSeries(requestContext, *seriesLists):
  (seriesList,start,end,step) = normalize(seriesLists)
  name = "diffSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeDiff(row) for row in izip(*seriesList) )
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]

def averageSeries(requestContext, *seriesLists):
  (seriesList,start,end,step) = normalize(seriesLists)
  #name = "averageSeries(%s)" % ','.join((s.name for s in seriesList))
  name = "averageSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeDiv(safeSum(row),safeLen(row)) for row in izip(*seriesList) )
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]

def minSeries(requestContext, *seriesLists):
  (seriesList, start, end, step) = normalize(seriesLists)
  pathExprs = list( set([s.pathExpression for s in seriesList]) )
  name = "minSeries(%s)" % ','.join(pathExprs)
  values = ( safeMin(row) for row in izip(*seriesList) )
  series = TimeSeries(name, start, end, step, values)
  series.pathExpression = name
  return [series]

def maxSeries(requestContext, *seriesLists):
  (seriesList, start, end, step) = normalize(seriesLists)
  pathExprs = list( set([s.pathExpression for s in seriesList]) )
  name = "maxSeries(%s)" % ','.join(pathExprs)
  values = ( safeMax(row) for row in izip(*seriesList) )
  series = TimeSeries(name, start, end, step, values)
  series.pathExpression = name
  return [series]

def keepLastValue(requestContext, seriesList):
  for series in seriesList:
    series.name = "keepLastValue(%s)" % (series.name)
    for i,value in enumerate(series):
      if value is None and i != 0:
        value = series[i-1]
      series[i] = value
  return seriesList

def asPercent(requestContext, seriesList1, seriesList2orNumber):
  assert len(seriesList1) == 1, "asPercent series arguments must reference *exactly* 1 series"
  series1 = seriesList1[0]
  if type(seriesList2orNumber) is list:
    assert len(seriesList2orNumber) == 1, "asPercent series arguments must reference *exactly* 1 series"
    series2 = seriesList2orNumber[0]
    name = "asPercent(%s,%s)" % (series1.name,series2.name)
    series = (series1,series2)
    step = reduce(lcm,[s.step for s in series])
    for s in series:
      s.consolidate( step / s.step )
    start = min([s.start for s in series])
    end = max([s.end for s in series])
    end -= (end - start) % step
    values = ( safeMul( safeDiv(v1,v2), 100.0 ) for v1,v2 in izip(*series) )
  else:
    number = float(seriesList2orNumber)
    name = "asPercent(%s,%.1f)" % (series1.name,number)
    step = series1.step
    start = series1.start
    end = series1.end
    values = ( safeMul( safeDiv(v,number), 100.0 ) for v in series1 )
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]


def divideSeries(requestContext, dividendSeriesList, divisorSeriesList):
  if len(divisorSeriesList) != 1:
    raise ValueError("divideSeries second argument must reference exactly 1 series")

  divisorSeries = divisorSeriesList[0]
  results = []

  for dividendSeries in dividendSeriesList:
    name = "divideSeries(%s,%s)" % (dividendSeries.name, divisorSeries.name)
    bothSeries = (dividendSeries, divisorSeries)
    step = reduce(lcm,[s.step for s in bothSeries])

    for s in bothSeries:
      s.consolidate( step / s.step )

    start = min([s.start for s in bothSeries])
    end = max([s.end for s in bothSeries])
    end -= (end - start) % step

    values = ( safeDiv(v1,v2) for v1,v2 in izip(*bothSeries) )

    quotientSeries = TimeSeries(name, start, end, step, values)
    quotientSeries.pathExpression = name
    results.append(quotientSeries)

  return results


def scale(requestContext, seriesList, factor):
  for series in seriesList:
    series.name = "scale(%s,%.1f)" % (series.name,float(factor))
    for i,value in enumerate(series):
      series[i] = safeMul(value,factor)
  return seriesList

def offset(requestContext, seriesList, factor):
  for series in seriesList:
    series.name = "offset(%s,%.1f)" % (series.name,float(factor))
    for i,value in enumerate(series):
      if value is not None:
        series[i] = value + factor
  return seriesList

def movingAverage(requestContext, seriesList, windowSize):
  for seriesIndex, series in enumerate(seriesList):
    newName = "movingAverage(%s,%.1f)" % (series.name, float(windowSize))
    newSeries = TimeSeries(newName, series.start, series.end, series.step, [])
    newSeries.pathExpression = newName

    windowIndex = windowSize - 1

    for i in range( len(series) ):
      if i < windowIndex: # Pad the beginning with None's since we don't have enough data
        newSeries.append( None )

      else:
        window = series[i - windowIndex : i + 1]
        nonNull = [ v for v in window if v is not None ]
        if nonNull:
          newSeries.append( sum(nonNull) / len(nonNull) )
        else:
          newSeries.append(None)

    seriesList[ seriesIndex ] = newSeries

  return seriesList

def cumulative(requestContext, seriesList):
  for series in seriesList:
    series.consolidationFunc = 'sum'
    series.name = 'cumulative(%s)' % series.name
  return seriesList

def derivative(requestContext, seriesList):
  results = []
  for series in seriesList:
    newValues = []
    prev = None
    for val in series:
      if None in (prev,val):
        newValues.append(None)
        prev = val
        continue
      newValues.append(val - prev)
      prev = val
    newName = "derivative(%s)" % series.name
    newSeries = TimeSeries(newName, series.start, series.end, series.step, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)
  return results

def integral(requestContext, seriesList):
  results = []
  for series in seriesList:
    newValues = []
    current = 0.0
    for val in series:
      if val is None:
        newValues.append(None)
      else:
        current += val
        newValues.append(current)
    newName = "integral(%s)" % series.name
    newSeries = TimeSeries(newName, series.start, series.end, series.step, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)
  return results


def nonNegativeDerivative(requestContext, seriesList, maxValue=None):
  results = []

  for series in seriesList:
    newValues = []
    prev = None

    for val in series:
      if None in (prev, val):
        newValues.append(None)
        prev = val
        continue

      diff = val - prev
      if diff >= 0:
        newValues.append(diff)
      elif maxValue is not None and maxValue >= val:
        newValues.append( (maxValue - prev) + val  + 1 )
      else:
        newValues.append(None)

      prev = val

    newName = "nonNegativeDerivative(%s)" % series.name
    newSeries = TimeSeries(newName, series.start, series.end, series.step, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)

  return results


def alias(requestContext, seriesList, newName):
  for series in seriesList:
    series.name = newName
  return seriesList

def color(requestContext, seriesList, theColor):
  for series in seriesList:
    series.color = theColor
  return seriesList

def substr(requestContext, seriesList, start=0, stop=0):
  for series in seriesList:
    left = series.name.rfind('(') + 1
    right = series.name.find(')')
    if right < 0:
      right = len(series.name)+1
    cleanName = series.name[left:right:]
    if int(stop) == 0:
      series.name = '.'.join(cleanName.split('.')[int(start)::])
    else:
      series.name = '.'.join(cleanName.split('.')[int(start):int(stop):])
  return seriesList


def log(requestContext, seriesList, base=10):
  results = []
  for series in seriesList:
    newValues = []
    for val in series:
      if val is None:
        newValues.append(None)
      elif val <= 0:
        newValues.append(None)
      else:
        newValues.append(math.log(val, base))
    newName = "log(%s, %s)" % (series.name, base)
    newSeries = TimeSeries(newName, series.start, series.end, series.step, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)
  return results


def maximumAbove(requestContext, seriesList, n):
  results = []
  for series in seriesList:
    if max(series) >= n:
      results.append(series)
  return results


def maximumBelow(requestContext, seriesList, n):
  result = []
  for series in seriesList:
    if max(series) <= n:
      result.append(series)
  return result


def highestCurrent(requestContext, seriesList, n):
  return sorted( seriesList, key=safeLast )[-n:]

def highestMax(requestContext, seriesList, n):
  """Returns upto n seriesList members where the respective series has a max member is in the top-n."""
  result_list = sorted( seriesList, key=lambda s: max(s) )[-n:]

  return sorted(result_list, key=lambda s: max(s), reverse=True)

def lowestCurrent(requestContext, seriesList, n):
  return sorted( seriesList, key=safeLast )[:n]

def currentAbove(requestContext, seriesList, n):
  return [ series for series in seriesList if safeLast(series) >= n ]

def currentBelow(requestContext, seriesList, n):
  return [ series for series in seriesList if safeLast(series) <= n ]

def highestAverage(requestContext, seriesList, n):
  return sorted( seriesList, key=lambda s: safeDiv(safeSum(s),safeLen(s)) )[-n:]

def lowestAverage(requestContext, seriesList, n):
  return sorted( seriesList, key=lambda s: safeDiv(safeSum(s),safeLen(s)) )[:n]

def averageAbove(requestContext, seriesList, n):
  return [ series for series in seriesList if safeDiv(safeSum(series),safeLen(series)) >= n ]

def averageBelow(requestContext, seriesList, n):
  return [ series for series in seriesList if safeDiv(safeSum(series),safeLen(series)) <= n ]

def percentileOrdinal(n, series):
  result = int( safeDiv(n * len(series), 100) + 0.5 )
  return result

def nPercentile(requestContext, seriesList, n):
  """Returns n-percent of each series in the seriesList."""
  assert n, 'The requested percent is required to be greater than 0'

  results = []
  for s in seriesList:
    # Create a sorted copy of the TimeSeries excluding None values in the values list.
    s_copy = TimeSeries( s.name, s.start, s.end, s.step, sorted( [item for item in s if item is not None] ) )
    if not s_copy:
      continue  # Skip this series because it is empty.

    pord = percentileOrdinal( n, s_copy )
    if pord > 0:
      i = pord - 1
    else:
      i = pord

    perc_val = s_copy[i]
    if perc_val:
      results.append( TimeSeries( '%dth Percentile(%s, %.1f)' % ( n, s_copy.name, perc_val ),
                                  s_copy.start, s_copy.end, s_copy.step, [perc_val] ) )
  return results

def limit(requestContext, seriesList, n):
  return seriesList[0:n]

def sortByMaxima(requestContext, seriesList):
  def compare(x,y):
    return cmp(max(y), max(x))
  seriesList.sort(compare)
  return seriesList

def sortByMinima(requestContext, seriesList):
  def compare(x,y):
    return cmp(min(x), min(y))
  newSeries = [series for series in seriesList if max(series) > 0]
  newSeries.sort(compare)
  return newSeries

def mostDeviant(requestContext, n, seriesList):
  deviants = []
  for series in seriesList:
    mean = safeDiv( safeSum(series), safeLen(series) )
    if mean is None: continue
    square_sum = sum([ (value - mean) ** 2 for value in series if value is not None ])
    sigma = safeDiv(square_sum, safeLen(series))
    if sigma is None: continue
    deviants.append( (sigma, series) )
  deviants.sort(key=lambda i: i[0], reverse=True) #sort by sigma
  return [ series for (sigma,series) in deviants ][:n] #return the n most deviant series


# returns a two-element tuple
# the first element is the std dev, the second is the new sum of squares
def doStdDev(sumOfSquares, first, new, n, avg):
   newSumOfSquares = sumOfSquares - (first * first) + (new * new)
   return (math.sqrt((newSumOfSquares / float(n)) - (avg * avg)), newSumOfSquares)


def stdev(requestContext, seriesList, time):
  count = 0
  for series in seriesList:
    stddevs = TimeSeries("stddev(%s,%.1f)" % (series.name, float(time)), series.start, series.end, series.step, [])
    stddevs.pathExpression = "stddev(%s,%.1f)" % (series.name, float(time))
    avg = safeDiv(safeSum(series[:time]), time)

    if avg is not None:
      sumOfSquares = sum(map(lambda(x): x * x, [v for v in series[:time] if v is not None]))
      (sd, sumOfSquares) = doStdDev(sumOfSquares, 0, 0, time, avg)
      stddevs.append(sd)
    else:
      stddevs.append(None)

    for (index, el) in enumerate(series[time:]):
      if el is None:
        continue

      toDrop = series[index]
      if toDrop is None:
        toDrop = 0

      s = safeSum([safeMul(time, avg), el, -toDrop])
      avg = safeDiv(s, time)

      if avg is not None:
        (sd, sumOfSquares) = doStdDev(sumOfSquares, toDrop, series[index+time], time, avg)
        stddevs.append(sd)
      else:
        stddevs.append(None)

    for i in range(0, time-1):
      stddevs.insert(0, None)

    seriesList[count] = stddevs
    count = count + 1

  return seriesList


def holtWintersIntercept(alpha,actual,last_season,last_intercept,last_slope):
  return alpha * (actual - last_season) \
          + (1 - alpha) * (last_intercept + last_slope)

def holtWintersSlope(beta,intercept,last_intercept,last_slope):
  return beta * (intercept - last_intercept) + (1 - beta) * last_slope

def holtWintersSeasonal(gamma,actual,intercept,last_season):
  return gamma * (actual - intercept) + (1 - gamma) * last_season

def holtWintersDeviation(gamma,actual,prediction,last_seasonal_dev):
  return gamma * math.fabs(actual - prediction) + (1 - gamma) * last_seasonal_dev

def holtWintersAnalysis(series, bootstrap=None):
  alpha = gamma = 0.1
  beta = 0.0035
  season_length = (24*60*60) / series.step
  intercept = 0
  slope = 0
  pred = 0
  intercepts = list()
  slopes = list()
  seasonals = list()
  predictions = list()
  deviations = list()

  def getLastSeasonal(i):
    j = i - season_length
    if j >= 0:
      return seasonals[j]
    if bootstrap:
      return bootstrap['seasonals'][j]
    return 0

  def getLastDeviation(i):
    j = i - season_length
    if j >= 0:
      return deviations[j]
    if bootstrap:
      return bootstrap['deviations'][j]
    return 0

  last_seasonal = 0
  last_seasonal_dev = 0
  next_last_seasonal = 0
  next_pred = None

  for i,actual in enumerate(series):
    if actual is None:
      # missing input values break all the math
      # do the best we can and move on
      intercepts.append(None)
      slopes.append(0)
      seasonals.append(0)
      predictions.append(next_pred)
      deviations.append(0)
      next_pred = None
      continue

    if i == 0:
      if bootstrap:
        last_intercept = bootstrap['intercepts'][-1]
        last_slope = bootstrap['slopes'][-1]
        prediction = bootstrap['predictions'][-1]
      else:
        last_intercept = actual
        last_slope = 0
        # seed the first prediction as the first actual
        prediction = actual
    else:
      last_intercept = intercepts[-1]
      last_slope = slopes[-1]
      if last_intercept is None:
        last_intercept = actual
      prediction = next_pred

    last_seasonal = getLastSeasonal(i)
    next_last_seasonal = getLastSeasonal(i+1)
    last_seasonal_dev = getLastDeviation(i)

    intercept = holtWintersIntercept(alpha,actual,last_seasonal
            ,last_intercept,last_slope)
    slope = holtWintersSlope(beta,intercept,last_intercept,last_slope)
    seasonal = holtWintersSeasonal(gamma,actual,intercept,last_seasonal)
    next_pred = intercept + slope + next_last_seasonal
    deviation = holtWintersDeviation(gamma,actual,prediction,last_seasonal_dev)

    intercepts.append(intercept)
    slopes.append(slope)
    seasonals.append(seasonal)
    predictions.append(prediction)
    deviations.append(deviation)

  # make the new forecast series
  forecastName = "holtWintersForecast(%s)" % series.name
  forecastSeries = TimeSeries(forecastName, series.start, series.end
    , series.step, predictions)
  forecastSeries.pathExpression = forecastName

  # make the new deviation series
  deviationName = "holtWintersDeviation(%s)" % series.name
  deviationSeries = TimeSeries(deviationName, series.start, series.end
          , series.step, deviations)
  deviationSeries.pathExpression = deviationName

  results = { 'predictions': forecastSeries
        , 'deviations': deviationSeries
        , 'intercepts': intercepts
        , 'slopes': slopes
        , 'seasonals': seasonals
        }
  return results

def holtWintersFetchBootstrap(requestContext, seriesPath):
  previousContext = requestContext.copy()
  # go back 1 week to get a solid bootstrap
  previousContext['startTime'] = requestContext['startTime'] - timedelta(7)
  previousContext['endTime'] = requestContext['startTime']
  bootstrapPath = "holtWintersBootstrap(%s)" % seriesPath
  previousResults = evaluateTarget(previousContext, bootstrapPath)
  return {'predictions': previousResults[0]
        , 'deviations': previousResults[1]
        , 'intercepts': previousResults[2]
        , 'slopes': previousResults[3]
        , 'seasonals': previousResults[4]
        }

def holtWintersBootstrap(requestContext, seriesList):
  results = []
  for series in seriesList:
    bootstrap = holtWintersAnalysis(series)
    interceptSeries = TimeSeries('intercepts', series.start, series.end
            , series.step, bootstrap['intercepts'])
    slopeSeries = TimeSeries('slopes', series.start, series.end
            , series.step, bootstrap['slopes'])
    seasonalSeries = TimeSeries('seasonals', series.start, series.end
            , series.step, bootstrap['seasonals'])

    results.append(bootstrap['predictions'])
    results.append(bootstrap['deviations'])
    results.append(interceptSeries)
    results.append(slopeSeries)
    results.append(seasonalSeries)
  return results

def holtWintersForecast(requestContext, seriesList):
  results = []
  for series in seriesList:
    bootstrap = holtWintersFetchBootstrap(requestContext, series.pathExpression)
    analysis = holtWintersAnalysis(series, bootstrap)
    results.append(analysis['predictions'])
    #results.append(analysis['deviations'])
  return results

def holtWintersConfidenceBands(requestContext, seriesList):
  results = []
  for series in seriesList:
    bootstrap = holtWintersFetchBootstrap(requestContext, series.pathExpression)
    analysis = holtWintersAnalysis(series, bootstrap)
    forecast = analysis['predictions']
    deviation = analysis['deviations']
    seriesLength = len(series)
    i = 0
    upperBand = list()
    lowerBand = list()
    while i < seriesLength:
      forecast_item = forecast[i]
      deviation_item = deviation[i]
      i = i + 1
      if forecast_item is None or deviation_item is None:
        upperBand.append(None)
        lowerBand.append(None)
      else:
        scaled_deviation = 3 * deviation_item
        upperBand.append(forecast_item + scaled_deviation)
        lowerBand.append(forecast_item - scaled_deviation)
    upperName = "holtWintersConfidenceUpper(%s)" % series.name
    lowerName = "holtWintersConfidenceLower(%s)" % series.name
    upperSeries = TimeSeries(upperName, series.start, series.end
            , series.step, upperBand)
    lowerSeries = TimeSeries(lowerName, series.start, series.end
            , series.step, lowerBand)
    results.append(upperSeries)
    results.append(lowerSeries)
  return results

def holtWintersAberration(requestContext, seriesList):
  results = []
  for series in seriesList:
    confidenceBands = holtWintersConfidenceBands(requestContext, [series])
    upperBand = confidenceBands[0]
    lowerBand = confidenceBands[1]
    aberration = list()
    for i, actual in enumerate(series):
      if series[i] > upperBand[i]:
        aberration.append(series[i] - upperBand[i])
      elif series[i] < lowerBand[i]:
        aberration.append(series[i] - lowerBand[i])
      else:
        aberration.append(0)

    newName = "holtWintersAberration(%s)" % series.name
    results.append(TimeSeries(newName, series.start, series.end
            , series.step, aberration))
  return results


def drawAsInfinite(requestContext, seriesList):
  for series in seriesList:
    series.options['drawAsInfinite'] = True
    series.name = 'drawAsInfinite(%s)' % series.name
  return seriesList

def lineWidth(requestContext, seriesList, width):
  for series in seriesList:
    series.options['lineWidth'] = width
  return seriesList

def dashed(requestContext, *seriesList):
  if len(seriesList) == 2:
    dashLength = seriesList[1]
  else:
    dashLength = 5
  for series in seriesList[0]:
    series.name = 'dashed(%s, %d)' % (series.name, dashLength)
    series.options['dashed'] = dashLength
  return seriesList[0]


def timeShift(requestContext, seriesList, timeShift):
  delta = abs( parseTimeOffset(timeShift) )
  myContext = requestContext.copy()
  myContext['startTime'] = requestContext['startTime'] - delta
  myContext['endTime'] = requestContext['endTime'] - delta
  series = seriesList[0] # if len(seriesList) > 1, they will all have the same pathExpression, which is all we care about.
  results = []

  for shiftedSeries in evaluateTarget(myContext, series.pathExpression):
    shiftedSeries.name = 'timeShift(%s, %s)' % (shiftedSeries.name, timeShift)
    shiftedSeries.start = series.start
    shiftedSeries.end = series.end
    results.append(shiftedSeries)

  return results


def constantLine(requestContext, value):
  start = timestamp( requestContext['startTime'] )
  end = timestamp( requestContext['endTime'] )
  step = end - start
  series = TimeSeries(str(value), start, end, step, [value])
  return [series]


def threshold(requestContext, value, label=None, color=None):
  series = constantLine(requestContext, value)[0]
  if label:
    series.name = label
  if color:
    series.color = color

  return [series]


def group(requestContext, *seriesLists):
  seriesGroup = []
  for s in seriesLists:
    seriesGroup.extend(s)

  return seriesGroup


def exclude(requestContext, seriesList, pattern):
  regex = re.compile(pattern)
  return [s for s in seriesList if not regex.search(s.name)]


def summarize(requestContext, seriesList, intervalString):
  results = []
  delta = parseTimeOffset(intervalString)
  interval = delta.seconds + (delta.days * 86400)

  for series in seriesList:
    buckets = {}

    timestamps = range( int(series.start), int(series.end), int(series.step) )
    datapoints = zip(timestamps, series)

    for (timestamp, value) in datapoints:
      bucketInterval = timestamp - (timestamp % interval)

      if bucketInterval not in buckets:
        buckets[bucketInterval] = []

      if value is not None:
        buckets[bucketInterval].append(value)

    newStart = series.start - (series.start % interval)
    newEnd = series.end - (series.end % interval) + interval
    newValues = []
    for timestamp in range(newStart, newEnd, interval):
      bucket = buckets.get(timestamp, [])

      if bucket:
        newValues.append( sum(bucket) )
      else:
        newValues.append( None )

    newName = "summarize(%s, \"%s\")" % (series.name, intervalString)
    newSeries = TimeSeries(newName, newStart, newEnd, interval, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)

  return results


def hitcount(requestContext, seriesList, intervalString):
  """Estimate hit counts from a list of time series.

  This function assumes the values in each time series represent
  hits per second.  It calculates hits per some larger interval
  such as per day or per hour.  This function is like summarize(),
  except that it compensates automatically for different time scales
  (so that a similar graph results from using either fine-grained
  or coarse-grained records) and handles rarely-occurring events
  gracefully.
  """
  results = []
  delta = parseTimeOffset(intervalString)
  interval = int(delta.seconds + (delta.days * 86400))

  for series in seriesList:
    length = len(series)
    step = int(series.step)
    bucket_count = int(math.ceil(float(series.end - series.start) / interval))
    buckets = [[] for _ in range(bucket_count)]
    newStart = int(series.end - bucket_count * interval)

    for i, value in enumerate(series):
      if value is None:
        continue

      start_time = int(series.start + i * step)
      start_bucket, start_mod = divmod(start_time - newStart, interval)
      end_time = start_time + step
      end_bucket, end_mod = divmod(end_time - newStart, interval)

      if end_bucket >= bucket_count:
        end_bucket = bucket_count - 1
        end_mod = interval

      if start_bucket == end_bucket:
        # All of the hits go to a single bucket.
        if start_bucket >= 0:
          buckets[start_bucket].append(value * (end_mod - start_mod))

      else:
        # Spread the hits among 2 or more buckets.
        if start_bucket >= 0:
          buckets[start_bucket].append(value * (interval - start_mod))
        hits_per_bucket = value * interval
        for j in range(start_bucket + 1, end_bucket):
          buckets[j].append(hits_per_bucket)
        if end_mod > 0:
          buckets[end_bucket].append(value * end_mod)

    newValues = []
    for bucket in buckets:
      if bucket:
        newValues.append( sum(bucket) )
      else:
        newValues.append(None)

    newName = 'hitcount(%s, "%s")' % (series.name, intervalString)
    newSeries = TimeSeries(newName, newStart, series.end, interval, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)

  return results


def pieAverage(requestContext, series):
  return safeDiv(safeSum(series),safeLen(series))

def pieMaximum(requestContext, series):
  return max(series)

def pieMinimum(requestContext, series):
  return min(series)

PieFunctions = {
  'average' : pieAverage,
  'maximum' : pieMaximum,
  'minimum' : pieMinimum,
}

SeriesFunctions = {
  # Combine functions
  'sumSeries' : sumSeries,
  'sum' : sumSeries,
  'diffSeries' : diffSeries,
  'divideSeries' : divideSeries,
  'averageSeries' : averageSeries,
  'avg' : averageSeries,
  'sumSeriesWithWildcards': sumSeriesWithWildcards,
  'averageSeriesWithWildcards': averageSeriesWithWildcards,
  'minSeries' : minSeries,
  'maxSeries' : maxSeries,

  # Transform functions
  'scale' : scale,
  'offset' : offset,
  'derivative' : derivative,
  'integral' : integral,
  'nonNegativeDerivative' : nonNegativeDerivative,
  'log' : log,
  'timeShift': timeShift,
  'summarize' : summarize,
  'hitcount'  : hitcount,

  # Calculate functions
  'movingAverage' : movingAverage,
  'stdev' : stdev,
  'holtWintersBootstrap': holtWintersBootstrap,
  'holtWintersForecast': holtWintersForecast,
  'holtWintersConfidenceBands': holtWintersConfidenceBands,
  'asPercent' : asPercent,
  'pct' : asPercent,

  # Filter functions
  'mostDeviant' : mostDeviant,
  'holtWintersAberration': holtWintersAberration,
  'highestCurrent' : highestCurrent,
  'lowestCurrent' : lowestCurrent,
  'highestMax' : highestMax,
  'currentAbove' : currentAbove,
  'currentBelow' : currentBelow,
  'highestAverage' : highestAverage,
  'lowestAverage' : lowestAverage,
  'averageAbove' : averageAbove,
  'averageBelow' : averageBelow,
  'maximumAbove' : maximumAbove,
  'maximumBelow' : maximumBelow,
  'nPercentile' : nPercentile,
  'limit' : limit,
  'sortByMaxima' : sortByMaxima,
  'sortByMinima' : sortByMinima,

  # Special functions
  'alias' : alias,
  'color' : color,
  'cumulative' : cumulative,
  'keepLastValue' : keepLastValue,
  'drawAsInfinite' : drawAsInfinite,
  'lineWidth' : lineWidth,
  'dashed' : dashed,
  'substr' : substr,
  'group' : group,
  'exclude' : exclude,
  'constantLine' : constantLine,
  'threshold' : threshold,
}


#Avoid import circularity
from graphite.render.evaluator import evaluateTarget
