#Copyright 2008 Orbitz WorldWide
#
#Licensed under the Apache License, Version 2.0 (the "License");
#you may not use this file except in compliance with the License.
#You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
#Unless required by applicable law or agreed to in writing, software
#distributed under the License is distributed on an "AS IS" BASIS,
#WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#See the License for the specific language governing permissions and
#limitations under the License.


from datetime import date, datetime, timedelta
from itertools import izip, imap
import math
import re
import random
import time

from graphite.logger import log
from graphite.render.datalib import TimeSeries
from graphite.render.attime import parseTimeOffset
from graphite.util import timestamp

from graphite.events import models
#XXX format_units() should go somewhere else
from os import environ
if environ.get('READTHEDOCS'):
  format_units = lambda *args, **kwargs: (0,'')
else:
  from graphite.render.glyph import format_units

NAN = float('NaN')
INF = float('inf')
DAY = 86400
HOUR = 3600
MINUTE = 60

NAN = float('NaN')
INF = float('inf')

#Utility functions
def safeSum(values):
  safeValues = [v for v in values if v is not None]
  if safeValues:
    return sum(safeValues)

def safeDiff(values):
  safeValues = [v for v in values if v is not None]
  if safeValues:
    values = map(lambda x: x*-1, safeValues[1:])
    values.insert(0, safeValues[0])
    return sum(values)

def safeLen(values):
  return len([v for v in values if v is not None])

def safeDiv(a,b):
  if a is None: return None
  if b in (0,None): return None
  return float(a) / float(b)

def safeMul(*factors):
  if None in factors:
    return None

  factors = map(float, factors)
  product = reduce(lambda x,y: x*y, factors)
  return product

def safeSubtract(a,b):
    if a is None or b is None: return None
    return float(a) - float(b)

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

def safeMap(function, values):
  safeValues = [v for v in values if v is not None]
  if safeValues:
    return map(function, values)

def safeAbs(value):
  if value is None: return None
  return abs(value)

def lcm(a,b):
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
  """
  Short form: sum()

  This will add metrics together and return the sum at each datapoint. (See
  integral for a sum over time)

  Example:

  .. code-block:: none

    &target=sum(company.server.application*.requestsHandled)

  This would show the sum of all requests handled per minute (provided
  requestsHandled are collected once a minute).   If metrics with different
  retention rates are combined, the coarsest metric is graphed, and the sum
  of the other metrics is averaged for the metrics with finer retention rates.

  """

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
  """
  Call sumSeries after inserting wildcards at the given position(s).

  Example:

  .. code-block:: none

    &target=sumSeriesWithWildcards(host.cpu-[0-7].cpu-{user,system}.value, 1)

  This would be the equivalent of
  ``target=sumSeries(host.*.cpu-user.value)&target=sumSeries(host.*.cpu-system.value)``

  """
  if type(position) is int:
    positions = [position]
  else:
    positions = position

  newSeries = {}
  newNames = list()

  for series in seriesList:
    newname = '.'.join(map(lambda x: x[1], filter(lambda i: i[0] not in positions, enumerate(series.name.split('.')))))
    if newname in newSeries.keys():
      newSeries[newname] = sumSeries(requestContext, (series, newSeries[newname]))[0]
    else:
      newSeries[newname] = series
      newNames.append(newname)
    newSeries[newname].name = newname

  return [newSeries[name] for name in newNames]

def averageSeriesWithWildcards(requestContext, seriesList, *position): #XXX
  """
  Call averageSeries after inserting wildcards at the given position(s).

  Example:

  .. code-block:: none

    &target=averageSeriesWithWildcards(host.cpu-[0-7].cpu-{user,system}.value, 1)

  This would be the equivalent of
  ``target=averageSeries(host.*.cpu-user.value)&target=averageSeries(host.*.cpu-system.value)``

  """
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
  """
  Can take two or more metrics, or a single metric and a constant.
  Subtracts parameters 2 through n from parameter 1.

  Example:

  .. code-block:: none

    &target=diffSeries(service.connections.total,service.connections.failed)
    &target=diffSeries(service.connections.total,5)

  """
  (seriesList,start,end,step) = normalize(seriesLists)
  name = "diffSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeDiff(row) for row in izip(*seriesList) )
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]

def averageSeries(requestContext, *seriesLists):
  """
  Short Alias: avg()

  Takes one metric or a wildcard seriesList.
  Draws the average value of all metrics passed at each time.

  Example:

  .. code-block:: none

    &target=averageSeries(company.server.*.threads.busy)

  """
  (seriesList,start,end,step) = normalize(seriesLists)
  #name = "averageSeries(%s)" % ','.join((s.name for s in seriesList))
  name = "averageSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeDiv(safeSum(row),safeLen(row)) for row in izip(*seriesList) )
  series = TimeSeries(name,start,end,step,values)
  series.pathExpression = name
  return [series]

def minSeries(requestContext, *seriesLists):
  """
  Takes one metric or a wildcard seriesList.
  For each datapoint from each metric passed in, pick the minimum value and graph it.

  Example:

  .. code-block:: none

    &target=minSeries(Server*.connections.total)
  """
  (seriesList, start, end, step) = normalize(seriesLists)
  pathExprs = list( set([s.pathExpression for s in seriesList]) )
  name = "minSeries(%s)" % ','.join(pathExprs)
  values = ( safeMin(row) for row in izip(*seriesList) )
  series = TimeSeries(name, start, end, step, values)
  series.pathExpression = name
  return [series]

def maxSeries(requestContext, *seriesLists):
  """
  Takes one metric or a wildcard seriesList.
  For each datapoint from each metric passed in, pick the maximum value and graph it.

  Example:

  .. code-block:: none

    &target=maxSeries(Server*.connections.total)

  """
  (seriesList, start, end, step) = normalize(seriesLists)
  pathExprs = list( set([s.pathExpression for s in seriesList]) )
  name = "maxSeries(%s)" % ','.join(pathExprs)
  values = ( safeMax(row) for row in izip(*seriesList) )
  series = TimeSeries(name, start, end, step, values)
  series.pathExpression = name
  return [series]

def rangeOfSeries(requestContext, *seriesLists):
    """
    Takes a wildcard seriesList.
    Distills down a set of inputs into the range of the series

    Example:

    .. code-block:: none

        &target=rangeOfSeries(Server*.connections.total)

    """
    (seriesList,start,end,step) = normalize(seriesLists)
    name = "rangeOfSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
    values = ( safeSubtract(max(row), min(row)) for row in izip(*seriesList) )
    series = TimeSeries(name,start,end,step,values)
    series.pathExpression = name
    return [series]

def percentileOfSeries(requestContext, seriesList, n, interpolate=False):
  """
  percentileOfSeries returns a single series which is composed of the n-percentile
  values taken across a wildcard series at each point. Unless `interpolate` is
  set to True, percentile values are actual values contained in one of the
  supplied series.
  """
  if n <= 0:
    raise ValueError('The requested percent is required to be greater than 0')

  name = 'percentilesOfSeries(%s, %.1f)' % (seriesList[0].pathExpression, n)
  (start, end, step) = normalize([seriesList])[1:]
  values = [ _getPercentile(row, n, interpolate) for row in izip(*seriesList) ]
  resultSeries = TimeSeries(name, start, end, step, values)
  resultSeries.pathExpression = name

  return [resultSeries]

def keepLastValue(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.
  Continues the line with the last received value when gaps ('None' values) appear in your data, rather than breaking your line.

  Example:

  .. code-block:: none

    &target=keepLastValue(Server01.connections.handled)

  """
  for series in seriesList:
    series.name = "keepLastValue(%s)" % (series.name)
    series.pathExpression = series.name
    for i,value in enumerate(series):
      if value is None and i != 0:
        value = series[i-1]
      series[i] = value
  return seriesList

def asPercent(requestContext, seriesList, total=None):
  """

  Calculates a percentage of the total of a wildcard series. If `total` is specified,
  each series will be calculated as a percentage of that total. If `total` is not specified,
  the sum of all points in the wildcard series will be used instead.

  The `total` parameter may be a single series or a numeric value.

  Example:

  .. code-block:: none

    &target=asPercent(Server01.connections.{failed,succeeded}, Server01.connections.attempted)
    &target=asPercent(apache01.threads.busy,1500)
    &target=asPercent(Server01.cpu.*.jiffies)

  """

  normalize([seriesList])

  if total is None:
    totalValues = [ safeSum(row) for row in izip(*seriesList) ]
    totalText = None # series.pathExpression
  elif type(total) is list:
    if len(total) != 1:
      raise ValueError("asPercent second argument must reference exactly 1 series")
    normalize([seriesList, total])
    totalValues = total[0]
    totalText = totalValues.name
  else:
    totalValues = [total] * len(seriesList[0])
    totalText = str(total)

  resultList = []
  for series in seriesList:
    resultValues = [ safeMul(safeDiv(val, totalVal), 100.0) for val,totalVal in izip(series,totalValues) ]

    name = "asPercent(%s, %s)" % (series.name, totalText or series.pathExpression)
    resultSeries = TimeSeries(name,series.start,series.end,series.step,resultValues)
    resultSeries.pathExpression = name
    resultList.append(resultSeries)

  return resultList

def divideSeries(requestContext, dividendSeriesList, divisorSeriesList):
  """
  Takes a dividend metric and a divisor metric and draws the division result.
  A constant may *not* be passed. To divide by a constant, use the scale()
  function (which is essentially a multiplication operation) and use the inverse
  of the dividend. (Division by 8 = multiplication by 1/8 or 0.125)

  Example:

  .. code-block:: none

    &target=divideSeries(Series.dividends,Series.divisors)


  """
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

def multiplySeries(requestContext, *seriesLists):
  """
  Takes two or more series and multiplies their points. A constant may not be
  used. To multiply by a constant, use the scale() function.

  Example:

  .. code-block:: none

    &target=multiplySeries(Series.dividends,Series.divisors)


  """
  (seriesList,start,end,step) = normalize(seriesLists)

  if len(seriesList) == 1:
    return seriesList

  name = "multiplySeries(%s)" % ','.join([s.name for s in seriesList])
  product = imap(lambda x: safeMul(*x), izip(*seriesList))
  resultSeries = TimeSeries(name, start, end, step, product)
  resultSeries.pathExpression = name
  return resultSeries

def movingMedian(requestContext, seriesList, windowSize):
  """
  Takes one metric or a wildcard seriesList followed by a number N of datapoints and graphs
  the median of N previous datapoints.  N-1 datapoints are set to None at the
  beginning of the graph.

  .. code-block:: none

    &target=movingMedian(Server.instance01.threads.busy,10)

  """
  for seriesIndex, series in enumerate(seriesList):
    newName = "movingMedian(%s,%.1f)" % (series.name, float(windowSize))
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
          m_index = len(nonNull) / 2
          newSeries.append(sorted(nonNull)[m_index])
        else:
          newSeries.append(None)

    seriesList[ seriesIndex ] = newSeries

  return seriesList

def scale(requestContext, seriesList, factor):
  """
  Takes one metric or a wildcard seriesList followed by a constant, and multiplies the datapoint
  by the constant provided at each point.

  Example:

  .. code-block:: none

    &target=scale(Server.instance01.threads.busy,10)
    &target=scale(Server.instance*.threads.busy,10)

  """
  for series in seriesList:
    series.name = "scale(%s,%.1f)" % (series.name,float(factor))
    for i,value in enumerate(series):
      series[i] = safeMul(value,factor)
  return seriesList

def scaleToSeconds(requestContext, seriesList, seconds):
  """
  Takes one metric or a wildcard seriesList and returns "value per seconds" where
  seconds is a last argument to this functions.

  Useful in conjunction with derivative or integral function if you want
  to normalize its result to a known resolution for arbitrary retentions
  """

  for series in seriesList:
    series.name = "scaleToSeconds(%s,%d)" % (series.name,seconds)
    for i,value in enumerate(series):
      factor = seconds * 1.0 / series.step
      series[i] = safeMul(value,factor)
  return seriesList

def absolute(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList and applies the mathematical abs function to each
  datapoint transforming it to its absolute value.

  Example:

  .. code-block:: none

    &target=absolute(Server.instance01.threads.busy)
    &target=absolute(Server.instance*.threads.busy)
  """
  for series in seriesList:
    series.name = "absolute(%s)" % (series.name)
    for i,value in enumerate(series):
      series[i] = safeAbs(value)
  return seriesList

def offset(requestContext, seriesList, factor):
  """
  Takes one metric or a wildcard seriesList followed by a constant, and adds the constant to
  each datapoint.

  Example:

  .. code-block:: none

    &target=offset(Server.instance01.threads.busy,10)

  """
  for series in seriesList:
    series.name = "offset(%s,%.1f)" % (series.name,float(factor))
    for i,value in enumerate(series):
      if value is not None:
        series[i] = value + factor
  return seriesList

def movingAverage(requestContext, seriesList, windowSize):
  """
  Takes one metric or a wildcard seriesList followed by a number N of datapoints and graphs
  the average of N previous datapoints.  N-1 datapoints are set to None at the
  beginning of the graph.

  .. code-block:: none

    &target=movingAverage(Server.instance01.threads.busy,10)

  """
  for seriesIndex, series in enumerate(seriesList):
    newName = "movingAverage(%s,%d)" % (series.name, windowSize)
    newSeries = TimeSeries(newName, series.start, series.end, series.step, [])
    newSeries.pathExpression = newName

    windowIndex = int(windowSize) - 1

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
  """
  Takes one metric or a wildcard seriesList.

  By default, when a graph is drawn, and the width of the graph in pixels is
  smaller than the number of datapoints to be graphed, Graphite averages the
  value at each pixel.  The cumulative() function changes the consolidation
  function to sum from average.  This is especially useful in sales graphs,
  where fractional values make no sense (How can you have half of a sale?)

  .. code-block:: none

    &target=cumulative(Sales.widgets.largeBlue)

  """
  for series in seriesList:
    series.consolidationFunc = 'sum'
    series.name = 'cumulative(%s)' % series.name
  return seriesList

def derivative(requestContext, seriesList):
  """
  This is the opposite of the integral function.  This is useful for taking a
  running total metric and showing how many requests per minute were handled.

  Example:

  .. code-block:: none

    &target=derivative(company.server.application01.ifconfig.TXPackets)

  Each time you run ifconfig, the RX and TXPackets are higher (assuming there
  is network traffic.) By applying the derivative function, you can get an
  idea of the packets per minute sent or received, even though you're only
  recording the total.
  """
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

def perSecond(requestContext, seriesList, maxValue=None):
  """
  Derivative adjusted for the series time interval
  This is useful for taking a running total metric and showing how many requests
  per second were handled.

  Example:

  .. code-block:: none

    &target=perSecond(company.server.application01.ifconfig.TXPackets)

  Each time you run ifconfig, the RX and TXPackets are higher (assuming there
  is network traffic.) By applying the derivative function, you can get an
  idea of the packets per minute sent or received, even though you're only
  recording the total.
  """
  results = []
  for series in seriesList:
    newValues = []
    prev = None
    for val in series:
      step = series.step
      if None in (prev,val):
        newValues.append(None)
        prev = val
        continue

      diff = val - prev
      if diff >= 0:
        newValues.append(diff / step)
      elif maxValue is not None and maxValue >= val:
        newValues.append( ((maxValue - prev) + val  + 1) / step )
      else:
        newValues.append(None)

      prev = val
    newName = "perSecond(%s)" % series.name
    newSeries = TimeSeries(newName, series.start, series.end, series.step, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)
  return results


def integral(requestContext, seriesList):
  """
  This will show the sum over time, sort of like a continuous addition function.
  Useful for finding totals or trends in metrics that are collected per minute.

  Example:

  .. code-block:: none

    &target=integral(company.sales.perMinute)

  This would start at zero on the left side of the graph, adding the sales each
  minute, and show the total sales for the time period selected at the right
  side, (time now, or the time specified by '&until=').
  """
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
  """
  Same as the derivative function above, but ignores datapoints that trend
  down.  Useful for counters that increase for a long time, then wrap or
  reset. (Such as if a network interface is destroyed and recreated by unloading
  and re-loading a kernel module, common with USB / WiFi cards.

  Example:

  .. code-block:: none

    &target=derivative(company.server.application01.ifconfig.TXPackets)

  """
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

def stacked(requestContext,seriesLists,stackName='__DEFAULT__'):
  """
  Takes one metric or a wildcard seriesList and change them so they are
  stacked. This is a way of stacking just a couple of metrics without having
  to use the stacked area mode (that stacks everything). By means of this a mixed
  stacked and non stacked graph can be made

  It can also take an optional argument with a name of the stack, in case there is
  more than one, e.g. for input and output metrics.

  Example:

  .. code-block:: none

    &target=stacked(company.server.application01.ifconfig.TXPackets, 'tx')

  """
  if 'totalStack' in requestContext:
    totalStack = requestContext['totalStack'].get(stackName, [])
  else:
    requestContext['totalStack'] = {}
    totalStack = [];
  results = []
  for series in seriesLists:
    newValues = []
    for i in range(len(series)):
      if len(totalStack) <= i: totalStack.append(0)

      if series[i] is not None:
        totalStack[i] += series[i]
        newValues.append(totalStack[i])
      else:
        newValues.append(None)

    # Work-around for the case when legend is set
    if stackName=='__DEFAULT__':
      newName = "stacked(%s)" % series.name
    else:
      newName = series.name

    newSeries = TimeSeries(newName, series.start, series.end, series.step, newValues)
    newSeries.options['stacked'] = True
    newSeries.pathExpression = newName
    results.append(newSeries)
  requestContext['totalStack'][stackName] = totalStack
  return results


def areaBetween(requestContext, seriesList):
  """
  Draws the area in between the two series in seriesList
  """
  assert len(seriesList) == 2, "areaBetween series argument must reference *exactly* 2 series"
  lower = seriesList[0]
  upper = seriesList[1]

  lower.options['stacked'] = True
  lower.options['invisible'] = True

  upper.options['stacked'] = True
  lower.name = upper.name = "areaBetween(%s)" % upper.pathExpression
  return seriesList


def aliasSub(requestContext, seriesList, search, replace):
  """
  Runs series names through a regex search/replace.

  .. code-block:: none

    &target=aliasSub(ip.*TCP*,"^.*TCP(\d+)","\\1")
  """
  for series in seriesList:
    series.name = re.sub(search, replace, series.name)
  return seriesList


def alias(requestContext, seriesList, newName):
  """
  Takes one metric or a wildcard seriesList and a string in quotes.
  Prints the string instead of the metric name in the legend.

  .. code-block:: none

    &target=alias(Sales.widgets.largeBlue,"Large Blue Widgets")

  """
  for series in seriesList:
    series.name = newName
  return seriesList

def cactiStyle(requestContext, seriesList):
  """
  Takes a series list and modifies the aliases to provide column aligned
  output with Current, Max, and Min values in the style of cacti.
  NOTE: column alignment only works with monospace fonts such as terminus.

  .. code-block:: none

    &target=cactiStyle(ganglia.*.net.bytes_out)

  """
  if 0 == len(seriesList):
      return seriesList
  nameLen = max([len(getattr(series,"name")) for series in seriesList])
  lastLen = max([len(repr(int(safeLast(series) or 3))) for series in seriesList]) + 3
  maxLen = max([len(repr(int(safeMax(series) or 3))) for series in seriesList]) + 3
  minLen = max([len(repr(int(safeMin(series) or 3))) for series in seriesList]) + 3
  for series in seriesList:
      name = series.name
      last = safeLast(series)
      maximum = safeMax(series)
      minimum = safeMin(series)
      if last is None:
        last = NAN
      if maximum is None:
        maximum = NAN
      if minimum is None:
        minimum = NAN

      series.name = "%*s Current:%*.2f Max:%*.2f Min:%*.2f" % \
          (-nameLen, series.name,
          lastLen, last,
          maxLen, maximum,
          minLen, minimum)
  return seriesList

def aliasByNode(requestContext, seriesList, *nodes):
  """
  Takes a seriesList and applies an alias derived from one or more "node"
  portion/s of the target name. Node indices are 0 indexed.

  .. code-block:: none

    &target=aliasByNode(ganglia.*.cpu.load5,1)

  """
  if type(nodes) is int:
    nodes=[nodes]
  for series in seriesList:
    metric_pieces = re.search('(?:.*\()?(?P<name>[-\w*\.]+)(?:,|\)?.*)?',series.name).groups()[0].split('.')
    series.name = '.'.join(metric_pieces[n] for n in nodes)
  return seriesList

def aliasByMetric(requestContext, seriesList):
  """
  Takes a seriesList and applies an alias derived from the base metric name.

  .. code-block:: none

    &target=aliasByMetric(carbon.agents.graphite.creates)

  """
  for series in seriesList:
    series.name = series.name.split('.')[-1]
  return seriesList

def legendValue(requestContext, seriesList, *valueTypes):
  """
  Takes one metric or a wildcard seriesList and a string in quotes.
  Appends a value to the metric name in the legend.  Currently one or several of: `last`, `avg`,
  `total`, `min`, `max`.
  The last argument can be `si` (default) or `binary`, in that case values will be formatted in the
  corresponding system.

  .. code-block:: none

  &target=legendValue(Sales.widgets.largeBlue, 'avg', 'max', 'si')

  """
  def last(s):
    "Work-around for the missing last point"
    v = s[-1]
    if v is None:
      return s[-2]
    return v

  valueFuncs = {
    'avg':   lambda s: safeDiv(safeSum(s), safeLen(s)),
    'total': safeSum,
    'min':   safeMin,
    'max':   safeMax,
    'last':  last
  }
  system = None
  if valueTypes[-1] in ('si', 'binary'):
    system = valueTypes[-1]
    valueTypes = valueTypes[:-1]
  for valueType in valueTypes:
    valueFunc = valueFuncs.get(valueType, lambda s: '(?)')
    if system is None:
      for series in seriesList:
        series.name += " (%s: %s)" % (valueType, valueFunc(series))
    else:
      for series in seriesList:
        value = valueFunc(series)
        formatted = None
        if value is not None:
          formatted = "%.2f%s" % format_units(abs(value), system=system)
        series.name = "%-20s%-5s%-10s" % (series.name, valueType, formatted)
  return seriesList

def alpha(requestContext, seriesList, alpha):
  """
  Assigns the given alpha transparency setting to the series. Takes a float value between 0 and 1.
  """
  for series in seriesList:
    series.options['alpha'] = alpha
  return seriesList

def color(requestContext, seriesList, theColor):
  """
  Assigns the given color to the seriesList

  Example:

  .. code-block:: none

    &target=color(collectd.hostname.cpu.0.user, 'green')
    &target=color(collectd.hostname.cpu.0.system, 'ff0000')
    &target=color(collectd.hostname.cpu.0.idle, 'gray')
    &target=color(collectd.hostname.cpu.0.idle, '6464ffaa')

  """
  for series in seriesList:
    series.color = theColor
  return seriesList

def substr(requestContext, seriesList, start=0, stop=0):
  """
  Takes one metric or a wildcard seriesList followed by 1 or 2 integers.  Assume that the
  metric name is a list or array, with each element separated by dots.  Prints
  n - length elements of the array (if only one integer n is passed) or n - m
  elements of the array (if two integers n and m are passed).  The list starts
  with element 0 and ends with element (length - 1).

  Example:

  .. code-block:: none

    &target=substr(carbon.agents.hostname.avgUpdateTime,2,4)

  The label would be printed as "hostname.avgUpdateTime".

  """
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

    # substr(func(a.b,'c'),1) becomes b instead of b,'c'
    series.name = re.sub(',.*$', '', series.name)
  return seriesList


def logarithm(requestContext, seriesList, base=10):
  """
  Takes one metric or a wildcard seriesList, a base, and draws the y-axis in logarithmic
  format.  If base is omitted, the function defaults to base 10.

  Example:

  .. code-block:: none

    &target=log(carbon.agents.hostname.avgUpdateTime,2)

  """
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
  """
  Takes one metric or a wildcard seriesList followed by a constant n.
  Draws only the metrics with a maximum value above n.

  Example:

  .. code-block:: none

    &target=maximumAbove(system.interface.eth*.packetsSent,1000)

  This would only display interfaces which sent more than 1000 packets/min.
  """
  results = []
  for series in seriesList:
    if max(series) > n:
      results.append(series)
  return results


def minimumAbove(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant n.
  Draws only the metrics with a minimum value above n.

  Example:

  .. code-block:: none

    &target=minimumAbove(system.interface.eth*.packetsSent,1000)

  This would only display interfaces which sent more than 1000 packets/min.
  """
  results = []
  for series in seriesList:
    if min(series) > n:
      results.append(series)
  return results


def maximumBelow(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant n.
  Draws only the metrics with a maximum value below n.

  Example:

  .. code-block:: none

    &target=maximumBelow(system.interface.eth*.packetsSent,1000)

  This would only display interfaces which sent less than 1000 packets/min.
  """

  result = []
  for series in seriesList:
    if max(series) <= n:
      result.append(series)
  return result


def highestCurrent(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the N metrics with the highest value
  at the end of the time period specified.

  Example:

  .. code-block:: none

    &target=highestCurrent(server*.instance*.threads.busy,5)

  Draws the 5 servers with the highest busy threads.

  """
  return sorted( seriesList, key=safeLast )[-n:]

def highestMax(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.

  Out of all metrics passed, draws only the N metrics with the highest maximum
  value in the time period specified.

  Example:

  .. code-block:: none

    &target=highestCurrent(server*.instance*.threads.busy,5)

  Draws the top 5 servers who have had the most busy threads during the time
  period specified.

  """
  result_list = sorted( seriesList, key=lambda s: max(s) )[-n:]

  return sorted(result_list, key=lambda s: max(s), reverse=True)

def lowestCurrent(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the N metrics with the lowest value at
  the end of the time period specified.

  Example:

  .. code-block:: none

    &target=lowestCurrent(server*.instance*.threads.busy,5)

  Draws the 5 servers with the least busy threads right now.

  """

  return sorted( seriesList, key=safeLast )[:n]

def currentAbove(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the  metrics whose value is above N
  at the end of the time period specified.

  Example:

  .. code-block:: none

    &target=highestAbove(server*.instance*.threads.busy,50)

  Draws the servers with more than 50 busy threads.

  """
  return [ series for series in seriesList if safeLast(series) >= n ]

def currentBelow(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the  metrics whose value is below N
  at the end of the time period specified.

  Example:

  .. code-block:: none

    &target=currentBelow(server*.instance*.threads.busy,3)

  Draws the servers with less than 3 busy threads.

  """
  return [ series for series in seriesList if safeLast(series) <= n ]

def highestAverage(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the top N metrics with the highest
  average value for the time period specified.

  Example:

  .. code-block:: none

    &target=highestAverage(server*.instance*.threads.busy,5)

  Draws the top 5 servers with the highest average value.

  """

  return sorted( seriesList, key=lambda s: safeDiv(safeSum(s),safeLen(s)) )[-n:]

def lowestAverage(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the bottom N metrics with the lowest
  average value for the time period specified.

  Example:

  .. code-block:: none

    &target=lowestAverage(server*.instance*.threads.busy,5)

  Draws the bottom 5 servers with the lowest average value.

  """

  return sorted( seriesList, key=lambda s: safeDiv(safeSum(s),safeLen(s)) )[:n]

def averageAbove(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the metrics with an average value
  above N for the time period specified.

  Example:

  .. code-block:: none

    &target=averageAbove(server*.instance*.threads.busy,25)

  Draws the servers with average values above 25.

  """
  return [ series for series in seriesList if safeDiv(safeSum(series),safeLen(series)) >= n ]

def averageBelow(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the metrics with an average value
  below N for the time period specified.

  Example:

  .. code-block:: none

    &target=averageBelow(server*.instance*.threads.busy,25)

  Draws the servers with average values below 25.

  """
  return [ series for series in seriesList if safeDiv(safeSum(series),safeLen(series)) <= n ]

def _getPercentile(points, n, interpolate=False):
  """
  Percentile is calculated using the method outlined in the NIST Engineering
  Statistics Handbook:
  http://www.itl.nist.gov/div898/handbook/prc/section2/prc252.htm
  """
  sortedPoints = sorted([ p for p in points if points is not None])
  if len(sortedPoints) == 0:
    return None
  fractionalRank = (n/100.0) * (len(sortedPoints) + 1)
  rank = int(fractionalRank)
  rankFraction = fractionalRank - rank

  if not interpolate:
    rank += int(math.ceil(rankFraction))

  if rank == 0:
    percentile = sortedPoints[0]
  elif rank - 1 == len(sortedPoints):
    percentile = sortedPoints[-1]
  else:
    percentile = sortedPoints[rank - 1] # Adjust for 0-index

  if interpolate:
    if rank != len(sortedPoints): # if a next value exists
      nextValue = sortedPoints[rank]
      percentile = percentile + rankFraction * (nextValue - percentile)

  return percentile

def nPercentile(requestContext, seriesList, n):
  """Returns n-percent of each series in the seriesList."""
  assert n, 'The requested percent is required to be greater than 0'

  results = []
  for s in seriesList:
    # Create a sorted copy of the TimeSeries excluding None values in the values list.
    s_copy = TimeSeries( s.name, s.start, s.end, s.step, sorted( [item for item in s if item is not None] ) )
    if not s_copy:
      continue  # Skip this series because it is empty.

    perc_val = _getPercentile(s_copy, n)
    if perc_val:
      name = 'nPercentile(%.1f, %s)' % (n, s_copy.name)
      point_count = int((s.end - s.start)/s.step)
      perc_series = TimeSeries(name, s_copy.start, s_copy.end, s_copy.step, [perc_val] * point_count )
      perc_series.pathExpression = name
      results.append(perc_series)
  return results

def removeAbovePercentile(requestContext, seriesList, n):
  """
  Removes data above the nth percentile from the series or list of series provided.
  Values below this percentile are assigned a value of None.
  """
  for s in seriesList:
    s.name = 'removeAbovePercentile(%s, %d)' % (s.name, n)
    percentile = nPercentile(requestContext, [s], n)[0][0]
    for (index, val) in enumerate(s):
      if val > percentile:
        s[index] = None

  return seriesList

def removeAboveValue(requestContext, seriesList, n):
  """
  Removes data above the given threshold from the series or list of series provided.
  Values below this threshole are assigned a value of None
  """
  for s in seriesList:
    s.name = 'removeAboveValue(%s, %d)' % (s.name, n)
    for (index, val) in enumerate(s):
      if val > n:
        s[index] = None

  return seriesList

def removeBelowPercentile(requestContext, seriesList, n):
  """
  Removes data above the nth percentile from the series or list of series provided.
  Values below this percentile are assigned a value of None.
  """
  for s in seriesList:
    s.name = 'removeBelowPercentile(%s, %d)' % (s.name, n)
    percentile = nPercentile(requestContext, [s], n)[0][0]
    for (index, val) in enumerate(s):
      if val < percentile:
        s[index] = None

  return seriesList

def removeBelowValue(requestContext, seriesList, n):
  """
  Removes data above the given threshold from the series or list of series provided.
  Values below this threshole are assigned a value of None
  """
  for s in seriesList:
    s.name = 'removeBelowValue(%s, %d)' % (s.name, n)
    for (index, val) in enumerate(s):
      if val < n:
        s[index] = None

  return seriesList

def limit(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.

  Only draw the first N metrics.  Useful when testing a wildcard in a metric.

  Example:

  .. code-block:: none

    &target=limit(server*.instance*.memory.free,5)

  Draws only the first 5 instance's memory free.

  """
  return seriesList[0:n]

def sortByMaxima(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.

  Sorts the list of metrics by the maximum value across the time period
  specified.  Useful with the &areaMode=all parameter, to keep the
  lowest value lines visible.

  Example:

  .. code-block:: none

    &target=sortByMaxima(server*.instance*.memory.free)

  """
  def compare(x,y):
    return cmp(max(y), max(x))
  seriesList.sort(compare)
  return seriesList

def sortByMinima(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.

  Sorts the list of metrics by the lowest value across the time period
  specified.

  Example:

  .. code-block:: none

    &target=sortByMinima(server*.instance*.memory.free)

  """
  def compare(x,y):
    return cmp(min(x), min(y))
  newSeries = [series for series in seriesList if max(series) > 0]
  newSeries.sort(compare)
  return newSeries

def useSeriesAbove(requestContext, seriesList, value, search, replace):
  """
  Compares the maximum of each series against the given `value`. If the series
  maximum is greater than `value`, the regular expression search and replace is
  applied against the series name to plot a related metric

  e.g. given useSeriesAbove(ganglia.metric1.reqs,10,'reqs','time'),
  the response time metric will be plotted only when the maximum value of the
  corresponding request/s metric is > 10

  .. code-block:: none

    &target=useSeriesAbove(ganglia.metric1.reqs,10,"reqs","time")
  """
  newSeries = []

  for series in seriesList:
    newname = re.sub(search, replace, series.name)
    if max(series) > value:
      n = evaluateTarget(requestContext, newname)
      if n is not None and len(n) > 0:
        newSeries.append(n[0])

  return newSeries

def mostDeviant(requestContext, n, seriesList):
  """
  Takes an integer N followed by one metric or a wildcard seriesList.
  Draws the N most deviant metrics.
  To find the deviant, the average across all metrics passed is determined,
  and then the average of each metric is compared to the overall average.

    Example:

  .. code-block:: none

    &target=mostDeviant(5, server*.instance*.memory.free)

  Draws the 5 instances furthest from the average memory free.

  """

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


def stdev(requestContext, seriesList, points, windowTolerance=0.1):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Draw the Standard Deviation of all metrics passed for the past N datapoints.
  If the ratio of null points in the window is greater than windowTolerance,
  skip the calculation. The default for windowTolerance is 0.1 (up to 10% of points
  in the window can be missing). Note that if this is set to 0.0, it will cause large
  gaps in the output anywhere a single point is missing.

  Example:

  .. code-block:: none

    &target=stdev(server*.instance*.threads.busy,30)
    &target=stdev(server*.instance*.cpu.system,30,0.0)

  """

  # For this we take the standard deviation in terms of the moving average
  # and the moving average of series squares.
  for (seriesIndex,series) in enumerate(seriesList):
    stddevSeries = TimeSeries("stddev(%s,%.1f)" % (series.name, float(points)), series.start, series.end, series.step, [])
    stddevSeries.pathExpression = "stddev(%s,%.1f)" % (series.name, float(points))

    validPoints = 0
    currentSum = 0
    currentSumOfSquares = 0
    for (index, newValue) in enumerate(series):
      # Mark whether we've reached our window size - dont drop points out otherwise
      if index < points:
        bootstrapping = True
        droppedValue = None
      else:
        bootstrapping = False
        droppedValue = series[index - points]

      # Track non-None points in window
      if not bootstrapping and droppedValue is not None:
        validPoints -= 1
      if newValue is not None:
        validPoints += 1

      # Remove the value that just dropped out of the window
      if not bootstrapping and droppedValue is not None:
        currentSum -= droppedValue
        currentSumOfSquares -= droppedValue**2

      # Add in the value that just popped in the window
      if newValue is not None:
        currentSum += newValue
        currentSumOfSquares += newValue**2

      if validPoints > 0 and \
        float(validPoints)/points >= windowTolerance:

        try:
          deviation = math.sqrt(validPoints * currentSumOfSquares - currentSum**2)/validPoints
        except ValueError:
          deviation = None
        stddevSeries.append(deviation)
      else:
        stddevSeries.append(None)

    seriesList[seriesIndex] = stddevSeries

  return seriesList

def secondYAxis(requestContext, seriesList):
  """
  Graph the series on the secondary Y axis.
  """
  for series in seriesList:
    series.options['secondYAxis'] = True
    series.name= 'secondYAxis(%s)' % series.name
  return seriesList

def _fetchWithBootstrap(requestContext, series, days=7):
  'Request the same data but with a bootstrap period at the beginning'
  previousContext = requestContext.copy()
  # go back 1 week to get a solid bootstrap
  previousContext['startTime'] = requestContext['startTime'] - timedelta(days)
  previousContext['endTime'] = requestContext['startTime']
  oldSeries = evaluateTarget(previousContext, series.pathExpression)[0]

  newValues = []
  if oldSeries.step != series.step:
    ratio = oldSeries.step / series.step
    for value in oldSeries:
      newValues.extend([ value ] * ratio)
  else:
    newValues.extend(oldSeries)
  newValues.extend(series)

  newSeries = TimeSeries(series.name, oldSeries.start, series.end, series.step, newValues)
  newSeries.pathExpression = series.name
  return newSeries

def _trimBootstrap(bootstrap, original):
  'Trim the bootstrap period off the front of this series so it matches the original'
  original_len = len(original)
  bootstrap_len = len(bootstrap)
  length_limit = (original_len * original.step) / bootstrap.step
  trim_start = bootstrap.end - (length_limit * bootstrap.step)
  trimmed = TimeSeries(bootstrap.name, trim_start, bootstrap.end, bootstrap.step,
        bootstrap[-length_limit:])
  return trimmed

def holtWintersIntercept(alpha,actual,last_season,last_intercept,last_slope):
  return alpha * (actual - last_season) \
          + (1 - alpha) * (last_intercept + last_slope)

def holtWintersSlope(beta,intercept,last_intercept,last_slope):
  return beta * (intercept - last_intercept) + (1 - beta) * last_slope

def holtWintersSeasonal(gamma,actual,intercept,last_season):
  return gamma * (actual - intercept) + (1 - gamma) * last_season

def holtWintersDeviation(gamma,actual,prediction,last_seasonal_dev):
  if prediction is None:
    prediction = 0
  return gamma * math.fabs(actual - prediction) + (1 - gamma) * last_seasonal_dev

def holtWintersAnalysis(series):
  alpha = gamma = 0.1
  beta = 0.0035
  # season is currently one day
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
    return 0

  def getLastDeviation(i):
    j = i - season_length
    if j >= 0:
      return deviations[j]
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

def holtWintersForecast(requestContext, seriesList):
  """
  Performs a Holt-Winters forecast using the series as input data. Data from
  one week previous to the series is used to bootstrap the initial forecast.
  """
  results = []
  for series in seriesList:
    withBootstrap = _fetchWithBootstrap(requestContext, series)
    analysis = holtWintersAnalysis(withBootstrap)
    results.append(_trimBootstrap(analysis['predictions'], series))
  return results

def holtWintersConfidenceBands(requestContext, seriesList, delta=3):
  """
  Performs a Holt-Winters forecast using the series as input data and plots
  upper and lower bands with the predicted forecast deviations.
  """
  results = []
  for series in seriesList:
    bootstrap = _fetchWithBootstrap(requestContext, series)
    analysis = holtWintersAnalysis(bootstrap)
    forecast = _trimBootstrap(analysis['predictions'], series)
    deviation = _trimBootstrap(analysis['deviations'], series)
    seriesLength = len(forecast)
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
        scaled_deviation = delta * deviation_item
        upperBand.append(forecast_item + scaled_deviation)
        lowerBand.append(forecast_item - scaled_deviation)

    upperName = "holtWintersConfidenceUpper(%s)" % series.name
    lowerName = "holtWintersConfidenceLower(%s)" % series.name
    upperSeries = TimeSeries(upperName, forecast.start, forecast.end
            , forecast.step, upperBand)
    lowerSeries = TimeSeries(lowerName, forecast.start, forecast.end
            , forecast.step, lowerBand)
    upperSeries.pathExpression = series.pathExpression
    lowerSeries.pathExpression = series.pathExpression
    results.append(lowerSeries)
    results.append(upperSeries)
  return results

def holtWintersAberration(requestContext, seriesList, delta=3):
  """
  Performs a Holt-Winters forecast using the series as input data and plots the
  positive or negative deviation of the series data from the forecast.
  """
  results = []
  for series in seriesList:
    confidenceBands = holtWintersConfidenceBands(requestContext, [series], delta)
    bootstrapped = _fetchWithBootstrap(requestContext, series)
    series = _trimBootstrap(bootstrapped, series)
    lowerBand = confidenceBands[0]
    upperBand = confidenceBands[1]
    aberration = list()
    for i, actual in enumerate(series):
      if series[i] is None:
        aberration.append(0)
      elif series[i] > upperBand[i]:
        aberration.append(series[i] - upperBand[i])
      elif series[i] < lowerBand[i]:
        aberration.append(series[i] - lowerBand[i])
      else:
        aberration.append(0)

    newName = "holtWintersAberration(%s)" % series.name
    results.append(TimeSeries(newName, series.start, series.end
            , series.step, aberration))
  return results

def holtWintersConfidenceArea(requestContext, seriesList, delta=3):
  """
  Performs a Holt-Winters forecast using the series as input data and plots the
  area between the upper and lower bands of the predicted forecast deviations.
  """
  bands = holtWintersConfidenceBands(requestContext, seriesList, delta)
  results = areaBetween(requestContext, bands)
  for series in results:
    series.name = series.name.replace('areaBetween', 'holtWintersConfidenceArea')
  return results


def drawAsInfinite(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.
  If the value is zero, draw the line at 0.  If the value is above zero, draw
  the line at infinity. If the value is null or less than zero, do not draw
  the line.

  Useful for displaying on/off metrics, such as exit codes. (0 = success,
  anything else = failure.)

  Example:

  .. code-block:: none

    drawAsInfinite(Testing.script.exitCode)

  """
  for series in seriesList:
    series.options['drawAsInfinite'] = True
    series.name = 'drawAsInfinite(%s)' % series.name
  return seriesList

def lineWidth(requestContext, seriesList, width):
  """
  Takes one metric or a wildcard seriesList, followed by a float F.

  Draw the selected metrics with a line width of F, overriding the default
  value of 1, or the &lineWidth=X.X parameter.

  Useful for highlighting a single metric out of many, or having multiple
  line widths in one graph.

  Example:

  .. code-block:: none

    &target=lineWidth(server01.instance01.memory.free,5)

  """
  for series in seriesList:
    series.options['lineWidth'] = width
  return seriesList

def dashed(requestContext, *seriesList):
  """
  Takes one metric or a wildcard seriesList, followed by a float F.

  Draw the selected metrics with a dotted line with segments of length F
  If omitted, the default length of the segments is 5.0

  Example:

  .. code-block:: none

    &target=dashed(server01.instance01.memory.free,2.5)

  """

  if len(seriesList) == 2:
    dashLength = seriesList[1]
  else:
    dashLength = 5
  for series in seriesList[0]:
    series.name = 'dashed(%s, %d)' % (series.name, dashLength)
    series.options['dashed'] = dashLength
  return seriesList[0]


def timeShift(requestContext, seriesList, timeShift):
  """
  Takes one metric or a wildcard seriesList, followed by a quoted string with the
  length of time (See ``from / until`` in the render\_api_ for examples of time formats).

  Draws the selected metrics shifted in time. If no sign is given, a minus sign ( - ) is
  implied which will shift the metric back in time. If a plus sign ( + ) is given, the
  metric will be shifted forward in time.

  Useful for comparing a metric against itself at a past periods or correcting data
  stored at an offset.

  Example:

  .. code-block:: none

    &target=timeShift(Sales.widgets.largeBlue,"7d")
    &target=timeShift(Sales.widgets.largeBlue,"-7d")
    &target=timeShift(Sales.widgets.largeBlue,"+1h")

  """
  # Default to negative. parseTimeOffset defaults to +
  if timeShift[0].isdigit():
    timeShift = '-' + timeShift
  delta = parseTimeOffset(timeShift)
  myContext = requestContext.copy()
  myContext['startTime'] = requestContext['startTime'] + delta
  myContext['endTime'] = requestContext['endTime'] + delta
  series = seriesList[0] # if len(seriesList) > 1, they will all have the same pathExpression, which is all we care about.
  results = []

  for shiftedSeries in evaluateTarget(myContext, series.pathExpression):
    shiftedSeries.name = 'timeShift(%s, %s)' % (shiftedSeries.name, timeShift)
    shiftedSeries.start = series.start
    shiftedSeries.end = series.end
    results.append(shiftedSeries)

  return results


def constantLine(requestContext, value):
  """
  Takes a float F.

  Draws a horizontal line at value F across the graph.

  Example:

  .. code-block:: none

    &target=constantLine(123.456)

  """
  start = timestamp( requestContext['startTime'] )
  end = timestamp( requestContext['endTime'] )
  step = (end - start) / 2.0
  series = TimeSeries(str(value), start, end, step, [value, value])
  return [series]


def threshold(requestContext, value, label=None, color=None):
  """
  Takes a float F, followed by a label (in double quotes) and a color.
  (See ``bgcolor`` in the render\_api_ for valid color names & formats.)

  Draws a horizontal line at value F across the graph.

  Example:

  .. code-block:: none

    &target=threshold(123.456, "omgwtfbbq", red)

  """

  series = constantLine(requestContext, value)[0]
  if label:
    series.name = label
  if color:
    series.color = color

  return [series]

def transformNull(requestContext, seriesList, default=0):
  """
  Takes a metric or wild card seriesList and an optional value
  to transform Nulls to. Default is 0. This method compliments
  drawNullAsZero flag in graphical mode but also works in text only
  mode.
  Example:

  .. code-block:: none

    &target=transformNull(webapp.pages.*.views,-1)

  This would take any page that didn't have values and supply negative 1 as a default.
  Any other numeric value may be used as well.
  """
  def transform(v):
    if v is None: return default
    else: return v

  for series in seriesList:
    series.name = "transformNull(%s, %.2f)" % (series.name, default)
    series.pathExpression = series.name
    values = [transform(v) for v in series]
    series.extend(values)
    del series[:len(values)]
  return seriesList

def group(requestContext, *seriesLists):
  """
  Takes an arbitrary number of seriesLists and adds them to a single seriesList. This is used
  to pass multiple seriesLists to a function which only takes one
  """
  seriesGroup = []
  for s in seriesLists:
    seriesGroup.extend(s)

  return seriesGroup


def groupByNode(requestContext, seriesList, nodeNum, callback):
  """
  Takes a serieslist and maps a callback to subgroups within as defined by a common node

  .. code-block:: none

    &target=groupByNode(ganglia.by-function.*.*.cpu.load5,2,"sumSeries")

    Would return multiple series which are each the result of applying the "sumSeries" function
    to groups joined on the second node (0 indexed) resulting in a list of targets like
    sumSeries(ganglia.by-function.server1.*.cpu.load5),sumSeries(ganglia.by-function.server2.*.cpu.load5),...

  """
  metaSeries = {}
  keys = []
  for series in seriesList:
    key = series.name.split(".")[nodeNum]
    if key not in metaSeries.keys():
      metaSeries[key] = [series]
      keys.append(key)
    else:
      metaSeries[key].append(series)
  for key in metaSeries.keys():
    metaSeries[key] = SeriesFunctions[callback](requestContext,
        metaSeries[key])[0]
    metaSeries[key].name = key
  return [ metaSeries[key] for key in keys ]


def exclude(requestContext, seriesList, pattern):
  """
  Takes a metric or a wildcard seriesList, followed by a regular expression
  in double quotes.  Excludes metrics that match the regular expression.

  Example:

  .. code-block:: none

    &target=exclude(servers*.instance*.threads.busy,"server02")
  """
  regex = re.compile(pattern)
  return [s for s in seriesList if not regex.search(s.name)]


def smartSummarize(requestContext, seriesList, intervalString, func='sum', alignToFrom=False):
  """
  Smarter experimental version of summarize.

  The alignToFrom parameter has been deprecated, it no longer has any effect.
  Alignment happens automatically for days, hours, and minutes.
  """
  if alignToFrom:
    log.info("Deprecated parameter 'alignToFrom' is being ignored.")

  results = []
  delta = parseTimeOffset(intervalString)
  interval = delta.seconds + (delta.days * 86400)

  # Adjust the start time to fit an entire day for intervals >= 1 day
  requestContext = requestContext.copy()
  s = requestContext['startTime']
  if interval >= DAY:
    requestContext['startTime'] = datetime(s.year, s.month, s.day)
  elif interval >= HOUR:
    requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour)
  elif interval >= MINUTE:
    requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour, s.minute)

  for i,series in enumerate(seriesList):
    # XXX: breaks with summarize(metric.{a,b})
    #      each series.pathExpression == metric.{a,b}
    newSeries = evaluateTarget(requestContext, series.pathExpression)[0]
    series[0:len(series)] = newSeries
    series.start = newSeries.start
    series.end = newSeries.end
    series.step = newSeries.step

  for series in seriesList:
    buckets = {} # { timestamp: [values] }

    timestamps = range( int(series.start), int(series.end), int(series.step) )
    datapoints = zip(timestamps, series)

    # Populate buckets
    for (timestamp, value) in datapoints:
      bucketInterval = int((timestamp - series.start) / interval)

      if bucketInterval not in buckets:
        buckets[bucketInterval] = []

      if value is not None:
        buckets[bucketInterval].append(value)


    newValues = []
    for timestamp in range(series.start, series.end, interval):
      bucketInterval = int((timestamp - series.start) / interval)
      bucket = buckets.get(bucketInterval, [])

      if bucket:
        if func == 'avg':
          newValues.append( float(sum(bucket)) / float(len(bucket)) )
        elif func == 'last':
          newValues.append( bucket[len(bucket)-1] )
        elif func == 'max':
          newValues.append( max(bucket) )
        elif func == 'min':
          newValues.append( min(bucket) )
        else:
          newValues.append( sum(bucket) )
      else:
        newValues.append( None )

    newName = "smartSummarize(%s, \"%s\", \"%s\")" % (series.name, intervalString, func)
    alignedEnd = series.start + (bucketInterval * interval) + interval
    newSeries = TimeSeries(newName, series.start, alignedEnd, interval, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)

  return results


def summarize(requestContext, seriesList, intervalString, func='sum', alignToFrom=False):
  """
  Summarize the data into interval buckets of a certain size.

  By default, the contents of each interval bucket are summed together. This is
  useful for counters where each increment represents a discrete event and
  retrieving a "per X" value requires summing all the events in that interval.

  Specifying 'avg' instead will return the mean for each bucket, which can be more
  useful when the value is a gauge that represents a certain value in time.

  'max', 'min' or 'last' can also be specified.

  By default, buckets are caculated by rounding to the nearest interval. This
  works well for intervals smaller than a day. For example, 22:32 will end up
  in the bucket 22:00-23:00 when the interval=1hour.

  Passing alignToFrom=true will instead create buckets starting at the from
  time. In this case, the bucket for 22:32 depends on the from time. If
  from=6:30 then the 1hour bucket for 22:32 is 22:30-23:30.

  Example:

  .. code-block:: none

    &target=summarize(counter.errors, "1hour") # total errors per hour
    &target=summarize(nonNegativeDerivative(gauge.num_users), "1week") # new users per week
    &target=summarize(queue.size, "1hour", "avg") # average queue size per hour
    &target=summarize(queue.size, "1hour", "max") # maximum queue size during each hour
    &target=summarize(metric, "13week", "avg", true)&from=midnight+20100101 # 2010 Q1-4
  """
  results = []
  delta = parseTimeOffset(intervalString)
  interval = delta.seconds + (delta.days * 86400)

  for series in seriesList:
    buckets = {}

    timestamps = range( int(series.start), int(series.end), int(series.step) )
    datapoints = zip(timestamps, series)

    for (timestamp, value) in datapoints:
      if alignToFrom:
        bucketInterval = int((timestamp - series.start) / interval)
      else:
        bucketInterval = timestamp - (timestamp % interval)

      if bucketInterval not in buckets:
        buckets[bucketInterval] = []

      if value is not None:
        buckets[bucketInterval].append(value)

    if alignToFrom:
      newStart = series.start
      newEnd = series.end
    else:
      newStart = series.start - (series.start % interval)
      newEnd = series.end - (series.end % interval) + interval

    newValues = []
    for timestamp in range(newStart, newEnd, interval):
      if alignToFrom:
        newEnd = timestamp
        bucketInterval = int((timestamp - series.start) / interval)
      else:
        bucketInterval = timestamp - (timestamp % interval)

      bucket = buckets.get(bucketInterval, [])

      if bucket:
        if func == 'avg':
          newValues.append( float(sum(bucket)) / float(len(bucket)) )
        elif func == 'last':
          newValues.append( bucket[len(bucket)-1] )
        elif func == 'max':
          newValues.append( max(bucket) )
        elif func == 'min':
          newValues.append( min(bucket) )
        else:
          newValues.append( sum(bucket) )
      else:
        newValues.append( None )

    if alignToFrom:
      newEnd += interval

    newName = "summarize(%s, \"%s\", \"%s\"%s)" % (series.name, intervalString, func, alignToFrom and ", true" or "")
    newSeries = TimeSeries(newName, newStart, newEnd, interval, newValues)
    newSeries.pathExpression = newName
    results.append(newSeries)

  return results


def hitcount(requestContext, seriesList, intervalString, alignToInterval = False):
  """
  Estimate hit counts from a list of time series.

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

  if alignToInterval:
    requestContext = requestContext.copy()
    s = requestContext['startTime']
    if interval >= DAY:
      requestContext['startTime'] = datetime(s.year, s.month, s.day)
    elif interval >= HOUR:
      requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour)
    elif interval >= MINUTE:
      requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour, s.minute)

    for i,series in enumerate(seriesList):
      newSeries = evaluateTarget(requestContext, series.pathExpression)[0]
      intervalCount = int((series.end - series.start) / interval)
      series[0:len(series)] = newSeries
      series.start = newSeries.start
      series.end =  newSeries.start + (intervalCount * interval) + interval
      series.step = newSeries.step

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

    newName = 'hitcount(%s, "%s"%s)' % (series.name, intervalString, alignToInterval and ", true" or "")
    newSeries = TimeSeries(newName, newStart, series.end, interval, newValues)    
    newSeries.pathExpression = newName
    results.append(newSeries)

  return results


def timeFunction(requestContext, name):
  """
  Short Alias: time()

  Just returns the timestamp for each X value. T

  Example:

  .. code-block:: none

    &target=time("The.time.series")

  This would create a series named "The.time.series" that contains in Y the same
  value (in seconds) as X.

  """

  step = 60
  delta = timedelta(seconds=step)
  when = requestContext["startTime"]
  values = []

  while when < requestContext["endTime"]:
    values.append(time.mktime(when.timetuple()))
    when += delta

  return [TimeSeries(name,
            time.mktime(requestContext["startTime"].timetuple()),
            time.mktime(requestContext["endTime"].timetuple()),
            step, values)]


def sinFunction(requestContext, name, amplitude=1):
  """
  Short Alias: sin()

  Just returns the sine of the current time. The optional amplitude parameter
  changes the amplitude of the wave.

  Example:

  .. code-block:: none

    &target=sin("The.time.series", 2)

  This would create a series named "The.time.series" that contains sin(x)*2.
  """
  step = 60
  delta = timedelta(seconds=step)
  when = requestContext["startTime"]
  values = []

  while when < requestContext["endTime"]:
    values.append(math.sin(time.mktime(when.timetuple()))*amplitude)
    when += delta

  return [TimeSeries(name,
            time.mktime(requestContext["startTime"].timetuple()),
            time.mktime(requestContext["endTime"].timetuple()),
            step, values)]

def randomWalkFunction(requestContext, name):
  """
  Short Alias: randomWalk()

  Returns a random walk starting at 0. This is great for testing when there is
  no real data in whisper.

  Example:

  .. code-block:: none

    &target=randomWalk("The.time.series")

  This would create a series named "The.time.series" that contains points where
  x(t) == x(t-1)+random()-0.5, and x(0) == 0.
  """
  step = 60
  delta = timedelta(seconds=step)
  when = requestContext["startTime"]
  values = []
  current = 0
  while when < requestContext["endTime"]:
    values.append(current)
    current += random.random() - 0.5
    when += delta

  return [TimeSeries(name,
            time.mktime(requestContext["startTime"].timetuple()),
            time.mktime(requestContext["endTime"].timetuple()),
            step, values)]

def events(requestContext, *tags):
  """
  Returns the number of events at this point in time. Usable with
  drawAsInfinite.

  Example:

  .. code-block:: none

    &target=events("tag-one", "tag-two")
    &target=events("*")

  Returns all events tagged as "tag-one" and "tag-two" and the second one
  returns all events.
  """
  def to_epoch(datetime_object):
    return int(time.mktime(datetime_object.timetuple()))

  step = 1
  name = "events(" + ", ".join(tags) + ")"
  if tags == ("*",):
    tags = None

  # Django returns database timestamps in timezone-ignorant datetime objects
  # so we use epoch seconds and do the conversion ourselves
  start_timestamp = to_epoch(requestContext["startTime"])
  start_timestamp = start_timestamp - start_timestamp % step
  end_timestamp = to_epoch(requestContext["endTime"])
  end_timestamp = end_timestamp - end_timestamp % step
  points = (end_timestamp - start_timestamp)/step

  events = models.Event.find_events(datetime.fromtimestamp(start_timestamp),
                                    datetime.fromtimestamp(end_timestamp),
                                    tags=tags)

  values = [None] * points
  for event in events:
    event_timestamp = to_epoch(event.when)
    value_offset = (event_timestamp - start_timestamp)/step
    if values[value_offset] is None:
      values[value_offset] = 1
    else:
      values[value_offset] += 1

  result_series = TimeSeries(name, start_timestamp, end_timestamp, step, values, 'sum')
  result_series.pathExpression = name
  return [result_series]

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
  'multiplySeries' : multiplySeries,
  'averageSeries' : averageSeries,
  'avg' : averageSeries,
  'sumSeriesWithWildcards': sumSeriesWithWildcards,
  'averageSeriesWithWildcards': averageSeriesWithWildcards,
  'minSeries' : minSeries,
  'maxSeries' : maxSeries,
  'rangeOfSeries': rangeOfSeries,
  'percentileOfSeries': percentileOfSeries,

  # Transform functions
  'scale' : scale,
  'scaleToSeconds' : scaleToSeconds,
  'offset' : offset,
  'derivative' : derivative,
  'perSecond' : perSecond,
  'integral' : integral,
  'percentileOfSeries': percentileOfSeries,
  'nonNegativeDerivative' : nonNegativeDerivative,
  'log' : logarithm,
  'timeShift': timeShift,
  'summarize' : summarize,
  'smartSummarize' : smartSummarize,
  'hitcount'  : hitcount,
  'absolute' : absolute,

  # Calculate functions
  'movingAverage' : movingAverage,
  'movingMedian' : movingMedian,
  'stdev' : stdev,
  'holtWintersForecast': holtWintersForecast,
  'holtWintersConfidenceBands': holtWintersConfidenceBands,
  'holtWintersConfidenceArea': holtWintersConfidenceArea,
  'holtWintersAberration': holtWintersAberration,
  'asPercent' : asPercent,
  'pct' : asPercent,
  'diffSeries' : diffSeries,
  'divideSeries' : divideSeries,

  # Series Filter functions
  'mostDeviant' : mostDeviant,
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
  'minimumAbove' : minimumAbove,
  'maximumBelow' : maximumBelow,
  'nPercentile' : nPercentile,
  'limit' : limit,
  'sortByMaxima' : sortByMaxima,
  'sortByMinima' : sortByMinima,
  'useSeriesAbove': useSeriesAbove,
  'exclude' : exclude,

  # Data Filter functions
  'removeAbovePercentile' : removeAbovePercentile,
  'removeAboveValue' : removeAboveValue,
  'removeBelowPercentile' : removeAbovePercentile,
  'removeBelowValue' : removeBelowValue,

  # Special functions
  'legendValue' : legendValue,
  'alias' : alias,
  'aliasSub' : aliasSub,
  'aliasByNode' : aliasByNode,
  'aliasByMetric' : aliasByMetric,
  'cactiStyle' : cactiStyle,
  'color' : color,
  'alpha' : alpha,
  'cumulative' : cumulative,
  'keepLastValue' : keepLastValue,
  'drawAsInfinite' : drawAsInfinite,
  'secondYAxis': secondYAxis,
  'lineWidth' : lineWidth,
  'dashed' : dashed,
  'substr' : substr,
  'group' : group,
  'groupByNode' : groupByNode,
  'constantLine' : constantLine,
  'stacked' : stacked,
  'areaBetween' : areaBetween,
  'threshold' : threshold,
  'transformNull' : transformNull,

  # test functions
  'time': timeFunction,
  "sin": sinFunction,
  "randomWalk": randomWalkFunction,
  'timeFunction': timeFunction,
  "sinFunction": sinFunction,
  "randomWalkFunction": randomWalkFunction,

  #events
  'events': events,
}


#Avoid import circularity
from graphite.render.evaluator import evaluateTarget
