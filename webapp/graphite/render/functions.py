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

from graphite.render.datatypes import TimeSeries
from itertools import izip
import math

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

def sumSeries(*seriesLists):
  try:
    (seriesList,start,end,step) = normalize(seriesLists)
  except:
    return []
  #name = "sumSeries(%s)" % ','.join((s.name for s in seriesList))
  name = "sumSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeSum(row) for row in izip(*seriesList) ) #XXX izip
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]

def diffSeries(*seriesLists):
  (seriesList,start,end,step) = normalize(seriesLists)
  name = "diffSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeDiff(row) for row in izip(*seriesList) ) #XXX izip
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]

def averageSeries(*seriesLists):
  (seriesList,start,end,step) = normalize(seriesLists)
  #name = "averageSeries(%s)" % ','.join((s.name for s in seriesList))
  name = "averageSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeDiv(safeSum(row),safeLen(row)) for row in izip(*seriesList) ) #XXX izip
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]

def keepLastValue(seriesList):
  for series in seriesList:
    series.name = "keepLastValue(%s)" % (series.name)
    for i,value in enumerate(series):
      if value is None:
        value = series[i-1]
      series[i] = value
  return seriesList

def asPercent(seriesList1,seriesList2orNumber):
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
    values = ( safeMul( safeDiv(v1,v2), 100.0 ) for v1,v2 in izip(*series) ) #XXX izip
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

def scale(seriesList,factor):
  for series in seriesList:
    series.name = "scale(%s,%.1f)" % (series.name,float(factor))
    for i,value in enumerate(series):
      series[i] = safeMul(value,factor)
  return seriesList

def offset(seriesList,factor):
  for series in seriesList:
    series.name = "offset(%s,%.1f)" % (series.name,float(factor))
    for i,value in enumerate(series):
      if value is not None:
        series[i] = value + factor
  return seriesList

def movingAverage(seriesList,time):
  count = 0
  for series in seriesList:
    movAvg = TimeSeries("movingAverage(%s,%.1f)" % (series.name,float(time)),series.start,series.end,series.step,[])
    movAvg.pathExpression = "movingAverage(%s,%.1f)" % (series.name,float(time))
    avg = safeDiv(safeSum(series[:time]), time)
    movAvg.append(avg)
    for (index, el) in enumerate(series[time:]):
      if el is None:
	continue
      toDrop = series[index]
      if toDrop is None:
        toDrop = 0
      s = safeSum([safeMul(time, avg), el, -toDrop])
      avg = safeDiv(s, time)
      movAvg.append(avg)
    for i in range(0, time-1):
      movAvg.insert(0, None)
    seriesList[count] = movAvg
    count = count + 1
  return seriesList

def cumulative(seriesList):
  for series in seriesList:
    series.consolidationFunc = 'sum'
    series.name = 'cumulative(%s)' % series.name
  return seriesList

def derivative(seriesList):
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

def integral(seriesList):
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

def nonNegativeDerivative(seriesList): # useful for watching counter metrics that occasionally wrap
  results = []
  for series in seriesList:
    newValues = []
    prev = None
    for val in series:
      if None in (prev,val):
        newValues.append(None)
        prev = val
        continue
      newValues.append( max(val - prev, 0) )
      prev = val
    newName = "nonNegativeDerivative(%s)" % series.name
    newSeries = TimeSeries(newName, series.start, series.end, series.step, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)
  return results


def alias(seriesList,newName):
  for series in seriesList:
    series.name = newName
  return seriesList


def highestCurrent(seriesList, n):
  return sorted( seriesList, key=safeLast )[-n:]

def lowestCurrent(seriesList, n):
  return sorted( seriesList, key=safeLast )[:n]

def currentAbove(seriesList, n):
  return [ series for series in seriesList if safeLast(series) >= n ]

def currentBelow(seriesList, n):
  return [ series for series in seriesList if safeLast(series) <= n ]

def highestAverage(seriesList, n):
  return sorted( seriesList, key=lambda s: safeDiv(safeSum(s),safeLen(s)) )[-n:]

def lowestAverage(seriesList, n):
  return sorted( seriesList, key=lambda s: safeDiv(safeSum(s),safeLen(s)) )[:n]

def averageAbove(seriesList, n):
  return [ series for series in seriesList if safeDiv(safeSum(series),safeLen(series)) >= n ]

def averageBelow(seriesList, n):
  return [ series for series in seriesList if safeDiv(safeSum(series),safeLen(series)) <= n ]


def mostDeviant(n, seriesList):
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

def stdev(seriesList,time):
  count = 0
  for series in seriesList:
    stddevs = TimeSeries("stddev(%s,%.1f)" % (series.name,float(time)),series.start,series.end,series.step,[])
    stddevs.pathExpression = "stddev(%s,%.1f)" % (series.name,float(time))
    avg = safeDiv(safeSum(series[:time]), time)

    sumOfSquares = sum(map(lambda(x): x * x, series[:time]))
    (sd, sumOfSquares) = doStdDev(sumOfSquares, 0, 0, time, avg)
    stddevs.append(sd)

    for (index, el) in enumerate(series[time:]):
      if el is None:
        continue
      toDrop = series[index]
      if toDrop is None:
        toDrop = 0
      s = safeSum([safeMul(time, avg), el, -toDrop])
      avg = safeDiv(s, time)

      (sd, sumOfSquares) = doStdDev(sumOfSquares, toDrop, series[index+time], time, avg)
      stddevs.append(sd)
    for i in range(0, time-1):
      stddevs.insert(0, None)
    seriesList[count] = stddevs
    count = count + 1
  return seriesList

def drawAsInfinite(seriesList):
  for series in seriesList:
    series.options['drawAsInfinite'] = True
    series.name = 'drawAsInfinite(%s)' % series.name
  return seriesList

def lineWidth(seriesList, width):
  for series in seriesList:
    series.options['lineWidth'] = width
  return seriesList

def dashed(*seriesList):
  if len(seriesList) == 2:
    dashLength = seriesList[1]
  else:
    dashLength = 5
  for series in seriesList[0]:
    series.name = 'dashed(%s, %d)' % (series.name, dashLength)
    series.options['dashed'] = dashLength
  return seriesList[0]


SeriesFunctions = {
  # Combine functions
  'sumSeries' : sumSeries,
  'sum' : sumSeries,
  'diffSeries' : diffSeries,
  'averageSeries' : averageSeries,
  'avg' : averageSeries,

  # Transform functions
  'scale' : scale,
  'offset' : offset,
  'derivative' : derivative,
  'integral' : integral,
  'nonNegativeDerivative' : nonNegativeDerivative,

  # Calculate functions
  'movingAverage' : movingAverage,
  'stdev' : stdev,
  'asPercent' : asPercent,
  'pct' : asPercent,

  # Filter functions
  'mostDeviant' : mostDeviant,
  'highestCurrent' : highestCurrent,
  'lowestCurrent' : lowestCurrent,
  'currentAbove' : currentAbove,
  'currentBelow' : currentBelow,
  'highestAverage' : highestAverage,
  'lowestAverage' : lowestAverage,
  'averageAbove' : averageAbove,
  'averageBelow' : averageBelow,

  # Special functions
  'alias' : alias,
  'cumulative' : cumulative,
  'keepLastValue' : keepLastValue,
  'drawAsInfinite' : drawAsInfinite,
  'lineWidth' : lineWidth,
  'dashed' : dashed,
}
