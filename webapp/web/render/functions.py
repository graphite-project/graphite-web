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

from web.render.datatypes import TimeSeries
from itertools import izip

#Utility functions
def safeSum(values):
  safeValues = [v for v in values if v is not None]
  if not safeValues: return None
  return sum(safeValues)

def safeLen(values):
  return len([v for v in values if v is not None])

def safeDiv(a,b):
  if a is None: return None
  if b in (0,None): return None
  return float(a) / float(b)

def safeMul(a,b):
  if a is None or b is None: return None
  return float(a) * float(b)

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
  (seriesList,start,end,step) = normalize(seriesLists)
  #name = "sumSeries(%s)" % ','.join((s.name for s in seriesList))
  name = "sumSeries(%s)" % ','.join(set([s.pathExpression for s in seriesList]))
  values = ( safeSum(row) for row in izip(*seriesList) ) #XXX izip
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

def alias(seriesList,newName):
  for series in seriesList:
    series.name = newName
  return seriesList


SeriesFunctions = {
  'sumSeries', sumSeries,
  'sum' : sumSeries,
  'averageSeries', averageSeries,
  'avg' : averageSeries,
  'asPercent' : asPercent,
  'pct' : asPercent,
  'scale' : scale,
  'cumulative' : cumulative,
  'derivative' : derivative,
  'integral' : integral,
  'alias' : alias,
}
