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

# make / work consistently between python 2.x and 3.x
# https://www.python.org/dev/peps/pep-0238/
from __future__ import division

import math
import random
import re
import time

from datetime import datetime, timedelta
from functools import reduce
from six.moves import range, zip
import six
try:
  from itertools import izip, izip_longest
except ImportError:
  # Python 3
  from itertools import zip_longest as izip_longest
  izip = zip
from os import environ

from django.conf import settings
from graphite.errors import NormalizeEmptyResultError, InputParameterError
from graphite.events import models
from graphite.functions import SeriesFunction, ParamTypes, Param, ParamTypeAggFunc, getAggFunc, safe
from graphite.logger import log
from graphite.render.attime import getUnitString, parseTimeOffset, parseATTime, SECONDS_STRING, MINUTES_STRING, HOURS_STRING, DAYS_STRING, WEEKS_STRING, MONTHS_STRING, YEARS_STRING
from graphite.render.evaluator import evaluateTarget
from graphite.render.grammar import grammar
from graphite.storage import STORE
from graphite.util import epoch, epoch_to_dt, timestamp, deltaseconds

# XXX format_units() should go somewhere else
if environ.get('READTHEDOCS'):
  format_units = lambda *args, **kwargs: (0,'')
else:
  from graphite.render.glyph import format_units
  from graphite.render.datalib import TimeSeries

NAN = float('NaN')
INF = float('inf')
DAY = 86400
HOUR = 3600
MINUTE = 60

#Utility functions


# In Py2, None < (any integer) . Use -inf for same sorting on Python 3
def keyFunc(func):
  def safeFunc(values):
    val = func(values)
    return val if val is not None else -INF
  return safeFunc


# Greatest common divisor
def gcd(a, b):
  if b == 0:
    return a
  return gcd(b, a % b)


# Least common multiple
def lcm(a, b):
  if a == b: return a
  if a < b: (a, b) = (b, a) #ensure a > b
  return a // gcd(a,b) * b


# check list of values against xFilesFactor
def xffValues(values, xFilesFactor):
  if not values:
    return False
  return xff(len([v for v in values if v is not None]), len(values), xFilesFactor)


def xff(nonNull, total, xFilesFactor=None):
  if not nonNull or not total:
    return False
  return nonNull / total >= (xFilesFactor if xFilesFactor is not None else settings.DEFAULT_XFILES_FACTOR)


def getNodeOrTag(series, n, pathExpression=None):
  try:
    # if n is an integer use it as a node, otherwise catch ValueError and treat it as a tag
    if n == int(n):
      # first split off any tags, then list of nodes is name split on .
      return (pathExpression or series.name).split(';', 2)[0].split('.')[n]
  except (ValueError, IndexError):
    # if node isn't an integer or isn't found then try it as a tag name
    pass
  # return tag value, default to '' if not found
  return series.tags.get(str(n), '')


def aggKey(series, nodes, pathExpression=None):
  # if series.name looks like it includes a function, use the first path expression
  if pathExpression is None and series.name[-1] == ')':
    pathExpression = _getFirstPathExpression(series.name)
  return '.'.join([getNodeOrTag(series, n, pathExpression) for n in nodes])


def normalize(seriesLists):
  if seriesLists:
    seriesList = reduce(lambda L1,L2: L1+L2,seriesLists)
    if seriesList:
      step = reduce(lcm,[s.step for s in seriesList])
      for s in seriesList:
        s.consolidate( step // s.step )
      start = min([s.start for s in seriesList])
      end = max([s.end for s in seriesList])
      end -= (end - start) % step
      return (seriesList,start,end,step)
  raise NormalizeEmptyResultError()


def matchSeries(seriesList1, seriesList2):
  assert len(seriesList2) == len(seriesList1), "The number of series in each argument must be the same"
  return izip(sorted(seriesList1, key=lambda a: a.name), sorted(seriesList2, key=lambda a: a.name))


def trimRecent(seriesList):
  # trim right side of the graph to avoid dip when only part of most recent metrics has entered the system
  for s in seriesList:
    if len(s) > 1:
      if (s[-1] is None) and (s[-2] is not None):
        for sl in seriesList:
          sl[-1] = None
        break
  for s in seriesList:
    if len(s) > 2:
      if (s[-2] is None) and (s[-3] is not None):
        for sl in seriesList:
          sl[-2] = None
        break
  return (seriesList)


def formatPathExpressions(seriesList):
  # remove duplicates
  pathExpressions = []
  [pathExpressions.append(s.pathExpression) for s in seriesList if not pathExpressions.count(s.pathExpression)]
  return ','.join(pathExpressions)


# Series Functions


def aggregate(requestContext, seriesList, func, xFilesFactor=None):
  """
  Aggregate series using the specified function.

  Example:

  .. code-block:: none

    &target=aggregate(host.cpu-[0-7].cpu-{user,system}.value, "sum")

  This would be the equivalent of

  .. code-block:: none

    &target=sumSeries(host.cpu-[0-7].cpu-{user,system}.value)

  This function can be used with aggregation functions ``average`` (or ``avg``), ``avg_zero``,
  ``median``, ``sum`` (or ``total``), ``min``, ``max``, ``diff``, ``stddev``, ``count``,
  ``range`` (or ``rangeOf``) , ``multiply`` & ``last`` (or ``current``).
  """
  # strip Series from func if func was passed like sumSeries
  rawFunc = func
  if func[-6:] == 'Series':
    func = func[:-6]

  consolidationFunc = getAggFunc(func, rawFunc)

  # if seriesList is empty then just short-circuit
  if not seriesList:
    return []

  # if seriesList is a single series then wrap it for normalize
  if isinstance(seriesList[0], TimeSeries):
    seriesList = [seriesList]

  try:
    (seriesList, start, end, step) = normalize(seriesList)
  except NormalizeEmptyResultError:
    return []

  if (settings.RENDER_TRIM_RECENT_IN_AGGREGATE):
    seriesList = trimRecent(seriesList)

  xFilesFactor = xFilesFactor if xFilesFactor is not None else requestContext.get('xFilesFactor')
  name = "%sSeries(%s)" % (func, formatPathExpressions(seriesList))
  values = ( consolidationFunc(row) if xffValues(row, xFilesFactor) else None for row in izip_longest(*seriesList) )
  tags = seriesList[0].tags
  for series in seriesList:
    tags = {tag: tags[tag] for tag in tags if tag in series.tags and tags[tag] == series.tags[tag]}
  if 'name' not in tags:
    tags['name'] = name
  tags['aggregatedBy'] = func
  series = TimeSeries(name, start, end, step, values, xFilesFactor=xFilesFactor, tags=tags)

  return [series]


aggregate.group = 'Combine'
aggregate.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('func', ParamTypes.aggFunc, required=True),
  Param('xFilesFactor', ParamTypes.float),
]


def aggregateSeriesLists(requestContext, seriesListFirstPos, seriesListSecondPos, func, xFilesFactor=None):
  """
  Iterates over a two lists and aggregates using specified function
  list1[0] to list2[0], list1[1] to list2[1] and so on.
  The lists will need to be the same length

  Position of seriesList matters. For example using "sum" function
  ``aggregateSeriesLists(list1[0..n], list2[0..n], "sum")``
  it would find sum for each member
  of the list ``list1[0] + list2[0], list1[1] + list2[1], list1[n] + list2[n]``.

  Example:

  .. code-block:: none

    &target=aggregateSeriesLists(mining.{carbon,graphite,diamond}.extracted,mining.{carbon,graphite,diamond}.shipped, 'sum')

  An example above would be the same as running :py:func:`aggregate <aggregate>` for each member of the list:

  .. code-block:: none

    ?target=aggregate(mining.carbon.extracted,mining.carbon.shipped, 'sum')
    &target=aggregate(mining.graphite.extracted,mining.graphite.shipped, 'sum')
    &target=aggregate(mining.diamond.extracted,mining.diamond.shipped, 'sum')

  This function can be used with aggregation functions ``average`` (or ``avg``), ``avg_zero``,
  ``median``, ``sum`` (or ``total``), ``min``, ``max``, ``diff``, ``stddev``, ``count``,
  ``range`` (or ``rangeOf``) , ``multiply`` & ``last`` (or ``current``).
  """
  if len(seriesListFirstPos) != len(seriesListSecondPos):
    raise InputParameterError(
      "seriesListFirstPos and seriesListSecondPos argument must have equal length")
  results = []

  for i in range(0, len(seriesListFirstPos)):
    firstSeries = seriesListFirstPos[i]
    secondSeries = seriesListSecondPos[i]
    aggregated = aggregate(requestContext, (firstSeries, secondSeries), func, xFilesFactor=xFilesFactor)
    if not aggregated: # empty list, no data found
      continue
    result = aggregated[0]  # aggregate() can only return len 1 list
    result.name = result.name[:result.name.find('Series(')] + 'Series(%s,%s)' % (firstSeries.name, secondSeries.name)
    results.append(result)
  return results


aggregateSeriesLists.group = 'Combine'
aggregateSeriesLists.params = [
  Param('seriesListFirstPos', ParamTypes.seriesList, required=True),
  Param('seriesListSecondPos', ParamTypes.seriesList, required=True),
  Param('func', ParamTypes.aggFunc, required=True),
  Param('xFilesFactor', ParamTypes.float),
]


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

  This is an alias for :py:func:`aggregate <aggregate>` with aggregation ``sum``.
  """
  return aggregate(requestContext, seriesLists, 'sum')


sumSeries.group = 'Combine'
sumSeries.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]
sumSeries.aggregator = True


def sumSeriesLists(requestContext, seriesListFirstPos, seriesListSecondPos):
  """
  Iterates over a two lists and subtracts series lists 2 through n from series 1
  list1[0] to list2[0], list1[1] to list2[1] and so on.
  The lists will need to be the same length

  Example:

  .. code-block:: none

    &target=sumSeriesLists(mining.{carbon,graphite,diamond}.extracted,mining.{carbon,graphite,diamond}.shipped)

  An example above would be the same as running :py:func:`sumSeries <sumSeries>` for each member of the list:

  .. code-block:: none

    ?target=sumSeries(mining.carbon.extracted,mining.carbon.shipped)
    &target=sumSeries(mining.graphite.extracted,mining.graphite.shipped)
    &target=sumSeries(mining.diamond.extracted,mining.diamond.shipped)

  This is an alias for :py:func:`aggregateSeriesLists <aggregateSeriesLists>` with aggregation ``sum``.
  """
  return aggregateSeriesLists(requestContext, seriesListFirstPos, seriesListSecondPos, 'sum')


sumSeriesLists.group = 'Combine'
sumSeriesLists.params = [
  Param('seriesListFirstPos', ParamTypes.seriesList, required=True),
  Param('seriesListSecondPos', ParamTypes.seriesList, required=True),
]
sumSeriesLists.aggregator = True


def sumSeriesWithWildcards(requestContext, seriesList, *position): #XXX
  """
  Categorizes the provided series in groups by name, by ignoring
  ("wildcarding") the given position(s) and calls sumSeries on each group.
  Important: the introduction of wildcards only happens *after* retrieving
  the input.

  Example:

  .. code-block:: none

    &target=sumSeriesWithWildcards(host.cpu-[0-7].cpu-{user,system}.value, 1)

  This would be the equivalent of

  .. code-block:: none

    &target=sumSeries(host.cpu-[0-7].cpu-user.value)&target=sumSeries(host.cpu-[0-7].cpu-system.value)

  This is an alias for :py:func:`aggregateWithWildcards <aggregateWithWildcards>` with aggregation ``sum``.
  """
  return aggregateWithWildcards(requestContext, seriesList, 'sum', *position)


sumSeriesWithWildcards.group = 'Combine'
sumSeriesWithWildcards.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('position', ParamTypes.node, multiple=True),
]
sumSeriesWithWildcards.aggregator = True


def averageSeriesWithWildcards(requestContext, seriesList, *position): #XXX
  """
  Categorizes the provided series in groups by name, by ignoring
  ("wildcarding") the given position(s) and calls averageSeries on each group.
  Important: the introduction of wildcards only happens *after* retrieving
  the input.

  Example:

  .. code-block:: none

    &target=averageSeriesWithWildcards(host.cpu-[0-7].cpu-{user,system}.value, 1)

  This would be the equivalent of

  .. code-block:: none

    &target=averageSeries(host.cpu-[0-7].cpu-user.value)&target=averageSeries(host.cpu-[0-7].cpu-system.value)

  This is an alias for :py:func:`aggregateWithWildcards <aggregateWithWildcards>` with aggregation ``average``.
  """
  return aggregateWithWildcards(requestContext, seriesList, 'average', *position)


averageSeriesWithWildcards.group = 'Combine'
averageSeriesWithWildcards.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('position', ParamTypes.node, multiple=True),
]
averageSeriesWithWildcards.aggregator = True


def multiplySeriesWithWildcards(requestContext, seriesList, *position): #XXX
  """
  Categorizes the provided series in groups by name, by ignoring
  ("wildcarding") the given position(s) and calls multiplySeries on each group.
  Important: the introduction of wildcards only happens *after* retrieving
  the input.

  Example:

  .. code-block:: none

    &target=multiplySeriesWithWildcards(web.host-[0-7].{avg-response,total-request}.value, 2)

  This would be the equivalent of

  .. code-block:: none

    &target=multiplySeries(web.host-0.{avg-response,total-request}.value)&target=multiplySeries(web.host-1.{avg-response,total-request}.value)...

  This is an alias for :py:func:`aggregateWithWildcards <aggregateWithWildcards>` with aggregation ``multiply``.
  """
  return aggregateWithWildcards(requestContext, seriesList, 'multiply', *position)


multiplySeriesWithWildcards.group = 'Combine'
multiplySeriesWithWildcards.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('position', ParamTypes.node, multiple=True),
]
multiplySeriesWithWildcards.aggregator = True


def aggregateWithWildcards(requestContext, seriesList, func, *positions):
  """
  Call aggregator after inserting wildcards at the given position(s).

  Example:

  .. code-block:: none

    &target=aggregateWithWildcards(host.cpu-[0-7].cpu-{user,system}.value, "sum", 1)

  This would be the equivalent of

  .. code-block:: none

    &target=sumSeries(host.cpu-[0-7].cpu-user.value)&target=sumSeries(host.cpu-[0-7].cpu-system.value)
    # or
    &target=aggregate(host.cpu-[0-7].cpu-user.value,"sum")&target=aggregate(host.cpu-[0-7].cpu-system.value,"sum")

  This function can be used with all aggregation functions supported by
  :py:func:`aggregate <aggregate>`: ``average``, ``median``, ``sum``, ``min``, ``max``, ``diff``,
  ``stddev``, ``range`` & ``multiply``.

  This complements :py:func:`groupByNodes <groupByNodes>` which takes a list of nodes that must match in each group.
  """
  metaSeries = {}
  keys = []
  for series in seriesList:
    key = '.'.join(map(lambda x: x[1], filter(lambda i: i[0] not in positions, enumerate(series.name.split('.')))))
    if key not in metaSeries:
      metaSeries[key] = [series]
      keys.append(key)
    else:
      metaSeries[key].append(series)
  for key in metaSeries.keys():
    metaSeries[key] = aggregate(requestContext, metaSeries[key], func)[0]
    metaSeries[key].name = key
  return [ metaSeries[key] for key in keys ]


aggregateWithWildcards.group = 'Combine'
aggregateWithWildcards.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('func', ParamTypes.aggFunc, required=True),
  Param('position', ParamTypes.node, multiple=True),
]


def diffSeries(requestContext, *seriesLists):
  """
  Subtracts series 2 through n from series 1.

  Example:

  .. code-block:: none

    &target=diffSeries(service.connections.total,service.connections.failed)

  To diff a series and a constant, one should use offset instead of (or in
  addition to) diffSeries

  Example:

  .. code-block:: none

    &target=offset(service.connections.total,-5)

    &target=offset(diffSeries(service.connections.total,service.connections.failed),-4)

  This is an alias for :py:func:`aggregate <aggregate>` with aggregation ``diff``.
  """
  return aggregate(requestContext, seriesLists, 'diff')


diffSeries.group = 'Combine'
diffSeries.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]
diffSeries.aggregator = True


def diffSeriesLists(requestContext, seriesListFirstPos, seriesListSecondPos):
  """
  Iterates over a two lists and subtracts series lists 2 through n from series 1
  list1[0] to list2[0], list1[1] to list2[1] and so on.
  The lists will need to be the same length

  Example:

  .. code-block:: none

    &target=diffSeriesLists(mining.{carbon,graphite,diamond}.extracted,mining.{carbon,graphite,diamond}.shipped)

  An example above would be the same as running :py:func:`diffSeries <diffSeries>` for each member of the list:

  .. code-block:: none

    ?target=diffSeries(mining.carbon.extracted,mining.carbon.shipped)
    &target=diffSeries(mining.graphite.extracted,mining.graphite.shipped)
    &target=diffSeries(mining.diamond.extracted,mining.diamond.shipped)


  This is an alias for :py:func:`aggregateSeriesLists <aggregateSeriesLists>` with aggregation ``diff``.
  """
  return aggregateSeriesLists(requestContext, seriesListFirstPos, seriesListSecondPos, 'diff')


diffSeriesLists.group = 'Combine'
diffSeriesLists.params = [
  Param('seriesListFirstPos', ParamTypes.seriesList, required=True),
  Param('seriesListSecondPos', ParamTypes.seriesList, required=True),
]
diffSeriesLists.aggregator = True


def averageSeries(requestContext, *seriesLists):
  """
  Short Alias: avg()

  Takes one metric or a wildcard seriesList.
  Draws the average value of all metrics passed at each time.

  Example:

  .. code-block:: none

    &target=averageSeries(company.server.*.threads.busy)

  This is an alias for :py:func:`aggregate <aggregate>` with aggregation ``average``.
  """
  return aggregate(requestContext, seriesLists, 'average')


averageSeries.group = 'Combine'
averageSeries.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]
averageSeries.aggregator = True


def stddevSeries(requestContext, *seriesLists):
  """

  Takes one metric or a wildcard seriesList.
  Draws the standard deviation of all metrics passed at each time.

  Example:

  .. code-block:: none

    &target=stddevSeries(company.server.*.threads.busy)

  This is an alias for :py:func:`aggregate <aggregate>` with aggregation ``stddev``.
  """
  return aggregate(requestContext, seriesLists, 'stddev')


stddevSeries.group = 'Combine'
stddevSeries.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]
stddevSeries.aggregator = True


def minSeries(requestContext, *seriesLists):
  """
  Takes one metric or a wildcard seriesList.
  For each datapoint from each metric passed in, pick the minimum value and graph it.

  Example:

  .. code-block:: none

    &target=minSeries(Server*.connections.total)

  This is an alias for :py:func:`aggregate <aggregate>` with aggregation ``min``.
  """
  return aggregate(requestContext, seriesLists, 'min')


minSeries.group = 'Combine'
minSeries.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]
minSeries.aggregator = True


def maxSeries(requestContext, *seriesLists):
  """
  Takes one metric or a wildcard seriesList.
  For each datapoint from each metric passed in, pick the maximum value and graph it.

  Example:

  .. code-block:: none

    &target=maxSeries(Server*.connections.total)

  This is an alias for :py:func:`aggregate <aggregate>` with aggregation ``max``.
  """
  return aggregate(requestContext, seriesLists, 'max')


maxSeries.group = 'Combine'
maxSeries.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]
maxSeries.aggregator = True


def rangeOfSeries(requestContext, *seriesLists):
  """
  Takes a wildcard seriesList.
  Distills down a set of inputs into the range of the series

  Example:

  .. code-block:: none

      &target=rangeOfSeries(Server*.connections.total)

  This is an alias for :py:func:`aggregate <aggregate>` with aggregation ``rangeOf``.
  """
  return aggregate(requestContext, seriesLists, 'rangeOf')


rangeOfSeries.group = 'Combine'
rangeOfSeries.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]
rangeOfSeries.aggregator = True


def percentileOfSeries(requestContext, seriesList, n, interpolate=False):
  """
  percentileOfSeries returns a single series which is composed of the n-percentile
  values taken across a wildcard series at each point. Unless `interpolate` is
  set to True, percentile values are actual values contained in one of the
  supplied series.
  """
  if n <= 0:
    raise InputParameterError('The requested percent is required to be greater than 0')

  # if seriesList is empty then just short-circuit
  if not seriesList:
    return []

  name = 'percentileOfSeries(%s,%g)' % (seriesList[0].pathExpression, n)
  (start, end, step) = normalize([seriesList])[1:]
  values = [ _getPercentile(row, n, interpolate) for row in izip_longest(*seriesList) ]
  resultSeries = TimeSeries(name, start, end, step, values, xFilesFactor=requestContext.get('xFilesFactor'))

  return [resultSeries]


percentileOfSeries.group = 'Combine'
percentileOfSeries.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
  Param('interpolate', ParamTypes.boolean, default=False),
]


def keepLastValue(requestContext, seriesList, limit = INF):
  """
  Takes one metric or a wildcard seriesList, and optionally a limit to the number of 'None' values to skip over.
  Continues the line with the last received value when gaps ('None' values) appear in your data, rather than breaking your line.

  Example:

  .. code-block:: none

    &target=keepLastValue(Server01.connections.handled)
    &target=keepLastValue(Server01.connections.handled, 10)

  """
  for series in seriesList:
    series.name = "keepLastValue(%s)" % (series.name)
    series.pathExpression = series.name
    consecutiveNones = 0
    lastVal = None
    for i,value in enumerate(series):
      if value is None:
        consecutiveNones += 1
      else:
         if 0 < consecutiveNones <= limit and lastVal is not None:
           # If a non-None value is seen before the limit of Nones is hit,
           # backfill all the missing datapoints with the last known value.
           for index in range(i - consecutiveNones, i):
             series[index] = lastVal

         consecutiveNones = 0
         lastVal = value

    # If the series ends with some None values, try to backfill a bit to cover it.
    if 0 < consecutiveNones <= limit and lastVal is not None:
      for index in range(len(series) - consecutiveNones, len(series)):
        series[index] = lastVal

  return seriesList


keepLastValue.group = 'Transform'
keepLastValue.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('limit', ParamTypes.intOrInf, default=INF),
]


def interpolate(requestContext, seriesList, limit = INF):
  """
  Takes one metric or a wildcard seriesList, and optionally a limit to the number of 'None' values to skip over.
  Continues the line with the last received value when gaps ('None' values) appear in your data, rather than breaking your line.

  Example:

  .. code-block:: none

    &target=interpolate(Server01.connections.handled)
    &target=interpolate(Server01.connections.handled, 10)

  """
  for series in seriesList:
    series.name = "interpolate(%s)" % (series.name)
    series.pathExpression = series.name
    consecutiveNones = 0
    for i,value in enumerate(series):
      series[i] = value

      # No 'keeping' can be done on the first value because we have no idea
      # what came before it.
      if i == 0:
        continue

      if value is None:
        consecutiveNones += 1
      elif consecutiveNones == 0: # have a value but no need to interpolate
        continue
      elif series[i - consecutiveNones - 1] is None: # have a value but can't interpolate: reset count
        consecutiveNones = 0
        continue
      else: # have a value and can interpolate
        # If a non-None value is seen before the limit of Nones is hit,
        # backfill all the missing datapoints with the last known value.
        if 0 < consecutiveNones <= limit:
          for index in range(i - consecutiveNones, i):
            series[index] = series[i - consecutiveNones - 1] + (index - (i - consecutiveNones -1)) * (value - series[i - consecutiveNones - 1]) / (consecutiveNones + 1)

        consecutiveNones = 0

    # If the series ends with some None values, try to backfill a bit to cover it.
    # if 0 < consecutiveNones < limit:
    #   for index in xrange(len(series) - consecutiveNones, len(series)):
    #     series[index] = series[len(series) - consecutiveNones - 1]

  return seriesList


interpolate.group = 'Transform'
interpolate.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('limit', ParamTypes.intOrInf, default=INF),
]


def changed(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.
  Output 1 when the value changed, 0 when null or the same

  Example:

  .. code-block:: none

    &target=changed(Server01.connections.handled)

  """
  for series in seriesList:
    series.name = "changed(%s)" % (series.name)
    series.pathExpression = series.name
    previous = None
    for i,value in enumerate(series):
      if previous is None:
        previous = value
        series[i] = 0
      elif value is not None and previous != value:
        series[i] = 1
        previous = value
      else:
        series[i] = 0
  return seriesList


changed.group = 'Special'
changed.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def asPercent(requestContext, seriesList, total=None, *nodes):
  """

  Calculates a percentage of the total of a wildcard series. If `total` is specified,
  each series will be calculated as a percentage of that total. If `total` is not specified,
  the sum of all points in the wildcard series will be used instead.

  A list of nodes can optionally be provided, if so they will be used to match series with their
  corresponding totals following the same logic as :py:func:`groupByNodes <groupByNodes>`.

  When passing `nodes` the `total` parameter may be a series list or `None`.  If it is `None` then
  for each series in `seriesList` the percentage of the sum of series in that group will be returned.

  When not passing `nodes`, the `total` parameter may be a single series, reference the same number
  of series as `seriesList` or be a numeric value.

  Example:

  .. code-block:: none

    # Server01 connections failed and succeeded as a percentage of Server01 connections attempted
    &target=asPercent(Server01.connections.{failed,succeeded}, Server01.connections.attempted)

    # For each server, its connections failed as a percentage of its connections attempted
    &target=asPercent(Server*.connections.failed, Server*.connections.attempted)

    # For each server, its connections failed and succeeded as a percentage of its connections attemped
    &target=asPercent(Server*.connections.{failed,succeeded}, Server*.connections.attempted, 0)

    # apache01.threads.busy as a percentage of 1500
    &target=asPercent(apache01.threads.busy,1500)

    # Server01 cpu stats as a percentage of its total
    &target=asPercent(Server01.cpu.*.jiffies)

    # cpu stats for each server as a percentage of its total
    &target=asPercent(Server*.cpu.*.jiffies, None, 0)

  When using `nodes`, any series or totals that can't be matched will create output series with
  names like ``asPercent(someSeries,MISSING)`` or ``asPercent(MISSING,someTotalSeries)`` and all
  values set to None. If desired these series can be filtered out by piping the result through
  ``|exclude("MISSING")`` as shown below:

  .. code-block:: none

    &target=asPercent(Server{1,2}.memory.used,Server{1,3}.memory.total,0)

    # will produce 3 output series:
    # asPercent(Server1.memory.used,Server1.memory.total) [values will be as expected]
    # asPercent(Server2.memory.used,MISSING) [all values will be None]
    # asPercent(MISSING,Server3.memory.total) [all values will be None]

    &target=asPercent(Server{1,2}.memory.used,Server{1,3}.memory.total,0)|exclude("MISSING")

    # will produce 1 output series:
    # asPercent(Server1.memory.used,Server1.memory.total) [values will be as expected]

  Each node may be an integer referencing a node in the series name or a string identifying a tag.

  .. note::

    When `total` is a seriesList, specifying `nodes` to match series with the corresponding total
    series will increase reliability.

  """
  normalize([seriesList])
  xFilesFactor=requestContext.get('xFilesFactor')

  # if nodes are specified, use them to match series & total
  if nodes:
    keys = []

    # group series together by key
    metaSeries = {}
    for series in seriesList:
      key = aggKey(series, nodes)
      if key not in metaSeries:
        metaSeries[key] = [series]
        keys.append(key)
      else:
        metaSeries[key].append(series)

    # make list of totals
    totalSeries = {}
    # no total seriesList was specified, sum the values for each group of series
    if total is None:
      for key in keys:
        if len(metaSeries[key]) == 1:
          totalSeries[key] = metaSeries[key][0]
        else:
          name = 'sumSeries(%s)' % formatPathExpressions(metaSeries[key])
          (seriesList,start,end,step) = normalize([metaSeries[key]])
          totalValues = [ safe.safeSum(row) for row in izip_longest(*metaSeries[key]) ]
          totalSeries[key] = TimeSeries(name,start,end,step,totalValues,xFilesFactor=xFilesFactor)
    # total seriesList was specified, sum the values for each group of totals
    elif isinstance(total, list):
      for series in total:
        key = aggKey(series, nodes)
        if key not in totalSeries:
          totalSeries[key] = [series]
          if key not in keys:
            keys.append(key)
        else:
          totalSeries[key].append(series)

      for key in totalSeries.keys():
        if len(totalSeries[key]) == 1:
          totalSeries[key] = totalSeries[key][0]
        else:
          name = 'sumSeries(%s)' % formatPathExpressions(totalSeries[key])
          (seriesList,start,end,step) = normalize([totalSeries[key]])
          totalValues = [ safe.safeSum(row) for row in izip_longest(*totalSeries[key]) ]
          totalSeries[key] = TimeSeries(name,start,end,step,totalValues,xFilesFactor=xFilesFactor)
    # trying to use nodes with a total value, which isn't supported because it has no effect
    else:
      raise InputParameterError('total must be None or a seriesList')

    resultList = []
    for key in keys:
      # no series, must have total only
      if key not in metaSeries:
        series2 = totalSeries[key]
        name = "asPercent(%s,%s)" % ('MISSING', series2.name)
        resultValues = [ None for v1 in series2 ]
        resultSeries = TimeSeries(name,start,end,step,resultValues,xFilesFactor=xFilesFactor)
        resultList.append(resultSeries)
        continue

      for series1 in metaSeries[key]:
        # no total
        if key not in totalSeries:
          name = "asPercent(%s,%s)" % (series1.name, 'MISSING')
          resultValues = [ None for v1 in series1 ]
        # series and total
        else:
          series2 = totalSeries[key]
          name = "asPercent(%s,%s)" % (series1.name, series2.name)
          (seriesList,start,end,step) = normalize([(series1, series2)])
          resultValues = [ safe.safeMul(safe.safeDiv(v1, v2), 100.0) for v1,v2 in izip_longest(series1,series2) ]

        resultSeries = TimeSeries(name,start,end,step,resultValues,xFilesFactor=xFilesFactor)
        resultList.append(resultSeries)

    return resultList

  if total is None:
    totalValues = [ safe.safeSum(row) for row in izip_longest(*seriesList) ]
    totalText = "sumSeries(%s)" % formatPathExpressions(seriesList)
  elif type(total) is list:
    if len(total) != 1 and len(total) != len(seriesList):
      raise InputParameterError("asPercent second argument must be missing, a single digit, reference exactly 1 series or reference the same number of series as the first argument")

    if len(total) == 1:
      normalize([seriesList, total])
      totalValues = total[0]
      totalText = totalValues.name
  else:
    totalValues = [total] * len(seriesList[0])
    totalText = str(total)

  resultList = []
  if type(total) is list and len(total) == len(seriesList):
    for series1, series2 in matchSeries(seriesList, total):
      name = "asPercent(%s,%s)" % (series1.name,series2.name)
      (seriesList,start,end,step) = normalize([(series1, series2)])
      resultValues = [ safe.safeMul(safe.safeDiv(v1, v2), 100.0) for v1,v2 in izip_longest(series1,series2) ]
      resultSeries = TimeSeries(name,start,end,step,resultValues,xFilesFactor=xFilesFactor)
      resultList.append(resultSeries)
  else:
    for series in seriesList:
      resultValues = [ safe.safeMul(safe.safeDiv(val, totalVal), 100.0) for val,totalVal in izip_longest(series,totalValues) ]

      name = "asPercent(%s,%s)" % (series.name, totalText or series.pathExpression)
      resultSeries = TimeSeries(name,series.start,series.end,series.step,resultValues,xFilesFactor=xFilesFactor)
      resultList.append(resultSeries)

  return resultList


asPercent.group = 'Combine'
asPercent.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('total', ParamTypes.any),
  Param('nodes', ParamTypes.nodeOrTag, multiple=True),
]
asPercent.aggregator = True


def divideSeriesLists(requestContext, dividendSeriesList, divisorSeriesList):
  """
  Iterates over a two lists and divides list1[0] by list2[0], list1[1] by list2[1] and so on.
  The lists need to be the same length
  """

  if len(dividendSeriesList) != len(divisorSeriesList):
    raise InputParameterError("dividendSeriesList and divisorSeriesList argument must have equal length")

  results = []

  for i in range(0, len(dividendSeriesList)):
    dividendSeries = dividendSeriesList[i]
    divisorSeries = divisorSeriesList[i]

    name = "divideSeries(%s,%s)" % (dividendSeries.name, divisorSeries.name)
    bothSeries = (dividendSeries, divisorSeries)
    step = reduce(lcm,[s.step for s in bothSeries])

    for s in bothSeries:
      s.consolidate( step // s.step )

    start = min([s.start for s in bothSeries])
    end = max([s.end for s in bothSeries])
    end -= (end - start) % step

    values = ( safe.safeDiv(v1,v2) for v1,v2 in izip_longest(*bothSeries) )

    quotientSeries = TimeSeries(name, start, end, step, values, xFilesFactor=requestContext.get('xFilesFactor'))
    results.append(quotientSeries)

  return results


divideSeriesLists.group = 'Combine'
divideSeriesLists.params = [
  Param('dividendSeriesList', ParamTypes.seriesList, required=True),
  Param('divisorSeriesList', ParamTypes.seriesList, required=True),
]


def divideSeries(requestContext, dividendSeriesList, divisorSeries):
  """
  Takes a dividend metric and a divisor metric and draws the division result.
  A constant may *not* be passed. To divide by a constant, use the scale()
  function (which is essentially a multiplication operation) and use the inverse
  of the dividend. (Division by 8 = multiplication by 1/8 or 0.125)

  Example:

  .. code-block:: none

    &target=divideSeries(Series.dividends,Series.divisors)


  """
  if len(divisorSeries) == 0:
    for series in dividendSeriesList:
      series.name = "divideSeries(%s,MISSING)" % series.name
      series.pathExpression = series.name
      for i in range(len(series)):
        series[i] = None
    return dividendSeriesList
  if len(divisorSeries) > 1:
    raise InputParameterError("divideSeries second argument must reference exactly 1 series (got {0})".format(len(divisorSeries)))

  divisorSeries = divisorSeries[0]
  results = []

  for dividendSeries in dividendSeriesList:
    name = "divideSeries(%s,%s)" % (dividendSeries.name, divisorSeries.name)
    bothSeries = (dividendSeries, divisorSeries)
    step = reduce(lcm,[s.step for s in bothSeries])

    for s in bothSeries:
      s.consolidate( step // s.step )

    start = min([s.start for s in bothSeries])
    end = max([s.end for s in bothSeries])
    end -= (end - start) % step

    values = ( safe.safeDiv(v1,v2) for v1,v2 in izip_longest(*bothSeries) )

    quotientSeries = TimeSeries(name, start, end, step, values, xFilesFactor=requestContext.get('xFilesFactor'))
    results.append(quotientSeries)

  return results


divideSeries.group = 'Combine'
divideSeries.params = [
  Param('dividendSeriesList', ParamTypes.seriesList, required=True),
  Param('divisorSeries', ParamTypes.seriesList, required=True),
]


def multiplySeries(requestContext, *seriesLists):
  """
  Takes two or more series and multiplies their points. A constant may not be
  used. To multiply by a constant, use the scale() function.

  Example:

  .. code-block:: none

    &target=multiplySeries(Series.dividends,Series.divisors)

  This is an alias for :py:func:`aggregate <aggregate>` with aggregation ``multiply``.
  """
  # special handling for legacy multiplySeries behavior with a single series
  if len(seriesLists) == 1 and len(seriesLists[0]) == 1:
    return seriesLists[0]

  return aggregate(requestContext, seriesLists, 'multiply')


multiplySeries.group = 'Combine'
multiplySeries.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]
multiplySeries.aggregator = True


def multiplySeriesLists(requestContext, seriesListFirstPos, seriesListSecondPos):
  """
  Iterates over a two lists and subtracts series lists 2 through n from series 1
  list1[0] to list2[0], list1[1] to list2[1] and so on.
  The lists will need to be the same length

  Example:

  .. code-block:: none

    &target=multiplySeriesLists(mining.{carbon,graphite,diamond}.extracted,mining.{carbon,graphite,diamond}.shipped)

  An example above would be the same as running :py:func:`multiplySeries <multiplySeries>` for each member of the list:

  .. code-block:: none

    ?target=multiplySeries(mining.carbon.extracted,mining.carbon.shipped)
    &target=multiplySeries(mining.graphite.extracted,mining.graphite.shipped)
    &target=multiplySeries(mining.diamond.extracted,mining.diamond.shipped)

  This is an alias for :py:func:`aggregateSeriesLists <aggregateSeriesLists>` with aggregation ``multiply``.
  """
  return aggregateSeriesLists(requestContext, seriesListFirstPos, seriesListSecondPos, 'multiply')


multiplySeriesLists.group = 'Combine'
multiplySeriesLists.params = [
  Param('seriesListFirstPos', ParamTypes.seriesList, required=True),
  Param('seriesListSecondPos', ParamTypes.seriesList, required=True),
]
multiplySeriesLists.aggregator = True


def weightedAverage(requestContext, seriesListAvg, seriesListWeight, *nodes):
  """
  Takes a series of average values and a series of weights and
  produces a weighted average for all values.
  The corresponding values should share one or more zero-indexed nodes and/or tags.

  Example:

  .. code-block:: none

    &target=weightedAverage(*.transactions.mean,*.transactions.count,0)

  Each node may be an integer referencing a node in the series name or a string identifying a tag.
  """
  sortedSeries={}

  if len(seriesListAvg) != len(seriesListWeight):
    raise InputParameterError('weightedAverage must receive the same number of series for seriesListAvg and seriesListWeight but received respectively %d and %d' % (len(seriesListAvg), len(seriesListWeight)))

  for seriesAvg, seriesWeight in izip_longest(seriesListAvg , seriesListWeight):
    key = aggKey(seriesAvg, nodes)

    if key not in sortedSeries:
      sortedSeries[key]={}
    sortedSeries[key]['avg']=seriesAvg

    key = aggKey(seriesWeight, nodes)

    if key not in sortedSeries:
      sortedSeries[key]={}
    sortedSeries[key]['weight']=seriesWeight

  productList = []

  for key in sortedSeries.keys():
    if 'weight' not in sortedSeries[key]:
      continue
    if 'avg' not in sortedSeries[key]:
      continue

    seriesWeight = sortedSeries[key]['weight']
    seriesAvg = sortedSeries[key]['avg']

    productValues = [ safe.safeMul(val1, val2) for val1,val2 in izip_longest(seriesAvg,seriesWeight) ]
    name='product(%s,%s)' % (seriesWeight.name, seriesAvg.name)
    productSeries = TimeSeries(name,seriesAvg.start,seriesAvg.end,seriesAvg.step,productValues,xFilesFactor=requestContext.get('xFilesFactor'))
    productList.append(productSeries)

  if not productList:
    return []

  sumProducts=sumSeries(requestContext, productList)[0]
  sumWeights=sumSeries(requestContext, seriesListWeight)[0]

  resultValues = [ safe.safeDiv(val1, val2) for val1,val2 in izip_longest(sumProducts,sumWeights) ]
  name = "weightedAverage(%s, %s, %s)" % (','.join(sorted(set(s.pathExpression for s in seriesListAvg))) ,','.join(sorted(set(s.pathExpression for s in seriesListWeight))), ','.join(map(str,nodes)))
  resultSeries = TimeSeries(name,sumProducts.start,sumProducts.end,sumProducts.step,resultValues,xFilesFactor=requestContext.get('xFilesFactor'))
  return [resultSeries]


weightedAverage.group = 'Combine'
weightedAverage.params = [
  Param('seriesListAvg', ParamTypes.seriesList, required=True),
  Param('seriesListWeight', ParamTypes.seriesList, required=True),
  Param('nodes', ParamTypes.nodeOrTag, multiple=True),
]

intOrIntervalSuggestions = [5, 7, 10, '1min', '5min', '10min', '30min', '1hour']


def movingWindow(requestContext, seriesList, windowSize, func='average', xFilesFactor=None):
  """
  Graphs a moving window function of a metric (or metrics) over a fixed number of
  past points, or a time interval.

  Takes one metric or a wildcard seriesList, a number N of datapoints
  or a quoted string with a length of time like '1hour' or '5min' (See ``from /
  until`` in the :doc:`Render API <render_api>` for examples of time formats), a function to apply to the points
  in the window to produce the output, and an xFilesFactor value to specify how many points in the
  window must be non-null for the output to be considered valid. Graphs the
  output of the function for the preceeding datapoints for each point on the graph.

  Example:

  .. code-block:: none

    &target=movingWindow(Server.instance01.threads.busy,10)
    &target=movingWindow(Server.instance*.threads.idle,'5min','median',0.5)

  .. note::

    `xFilesFactor` follows the same semantics as in Whisper storage schemas.  Setting it to 0 (the
    default) means that only a single value in a given interval needs to be non-null, setting it to
    1 means that all values in the interval must be non-null.  A setting of 0.5 means that at least
    half the values in the interval must be non-null.
  """
  if not seriesList:
    return []

  if isinstance(windowSize, six.string_types):
    delta = parseTimeOffset(windowSize)
    previewSeconds = abs(delta.seconds + (delta.days * 86400))
  else:
    previewSeconds = max([s.step for s in seriesList]) * int(windowSize)

  consolidateFunc = getAggFunc(func)

  # ignore original data and pull new, including our preview
  # data from earlier is needed to calculate the early results
  newContext = requestContext.copy()
  newContext['prefetch'] = {}
  newContext['startTime'] = requestContext['startTime'] -  timedelta(seconds=previewSeconds)
  previewList = evaluateTarget(newContext, requestContext['args'][0])
  result = []

  tagName = 'moving' + func.capitalize()

  for series in previewList:
    if isinstance(windowSize, six.string_types):
      newName = '%s(%s,"%s")' % (tagName, series.name, windowSize)
      windowPoints = previewSeconds // series.step
    else:
      newName = '%s(%s,%s)' % (tagName, series.name, windowSize)
      windowPoints = int(windowSize)

    series.tags[tagName] = windowSize
    newSeries = series.copy(name=newName, start=series.start + previewSeconds, values=[])

    effectiveXFF = xFilesFactor if xFilesFactor is not None else series.xFilesFactor

    for i in range(windowPoints, len(series)):
      nonNull = [v for v in series[i - windowPoints:i] if v is not None]

      if nonNull and xff(len(nonNull), windowPoints, effectiveXFF):
        val = consolidateFunc(nonNull)
      else:
        val = None
      newSeries.append(val)

    result.append(newSeries)

  return result


movingWindow.group = 'Calculate'
movingWindow.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('windowSize', ParamTypes.intOrInterval, required=True, suggestions=intOrIntervalSuggestions),
  Param('func', ParamTypes.aggFunc, default='average'),
  Param('xFilesFactor', ParamTypes.float),
]


def exponentialMovingAverage(requestContext, seriesList, windowSize):
  """
  Takes a series of values and a window size and produces an exponential moving
  average utilizing the following formula:

  .. code-block:: none

    ema(current) = constant * (Current Value) + (1 - constant) * ema(previous)

  The Constant is calculated as:

  .. code-block:: none

    constant = 2 / (windowSize + 1)

  The first period EMA uses a simple moving average for its value.

  Example:

  .. code-block:: none

    &target=exponentialMovingAverage(*.transactions.count, 10)
    &target=exponentialMovingAverage(*.transactions.count, '-10s')

  """
  # EMA = C * (current_value) + (1 - C) + EMA
  # C = 2 / (windowSize + 1)

  # The following was copied from movingAverage, and altered for ema
  if not seriesList:
    return []
  # set previewSeconds and constant based on windowSize string or integer
  if isinstance(windowSize, six.string_types):
    delta = parseTimeOffset(windowSize)
    previewSeconds = abs(delta.seconds + (delta.days * 86400))
    constant = (float(2) / (int(previewSeconds) + 1))
  else:
    previewSeconds = max([s.step for s in seriesList]) * int(windowSize)
    constant = (float(2) / (int(windowSize) + 1))

  # ignore original data and pull new, including our preview
  # data from earlier is needed to calculate the early results
  newContext = requestContext.copy()
  newContext['prefetch'] = {}
  newContext['startTime'] = requestContext['startTime'] -  timedelta(seconds=previewSeconds)
  previewList = evaluateTarget(newContext, requestContext['args'][0])
  result = []

  for series in previewList:
    if isinstance(windowSize, six.string_types):
      newName = 'exponentialMovingAverage(%s,"%s")' % (series.name, windowSize)
      windowPoints = previewSeconds // series.step
    else:
      newName = "exponentialMovingAverage(%s,%s)" % (series.name, windowSize)
      windowPoints = int(windowSize)

    series.tags['exponentialMovingAverage'] = windowSize
    newSeries = series.copy(name=newName, start=series.start + previewSeconds, values=[])

    ema = safe.safeAvg(series[:windowPoints]) or 0
    newSeries.append(round(ema, 6))

    for i in range(windowPoints, len(series)):
      if series[i] is not None:
        ema = constant * series[i] + (1 - constant) * ema
        newSeries.append(round(ema, 6))
      else:
        newSeries.append(None)

    result.append(newSeries)

  return result


exponentialMovingAverage.group = 'Calculate'
exponentialMovingAverage.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('windowSize', ParamTypes.intOrInterval, required=True, suggestions=intOrIntervalSuggestions),
]


def movingMedian(requestContext, seriesList, windowSize, xFilesFactor=None):
  """
  Graphs the moving median of a metric (or metrics) over a fixed number of
  past points, or a time interval.

  Takes one metric or a wildcard seriesList followed by a number N of datapoints
  or a quoted string with a length of time like '1hour' or '5min' (See ``from /
  until`` in the :doc:`Render API <render_api>` for examples of time formats), and an xFilesFactor value to specify
  how many points in the window must be non-null for the output to be considered valid. Graphs the
  median of the preceeding datapoints for each point on the graph.

  Example:

  .. code-block:: none

    &target=movingMedian(Server.instance01.threads.busy,10)
    &target=movingMedian(Server.instance*.threads.idle,'5min')

  """
  return movingWindow(requestContext, seriesList, windowSize, 'median', xFilesFactor)


movingMedian.group = 'Calculate'
movingMedian.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('windowSize', ParamTypes.intOrInterval, required=True, suggestions=intOrIntervalSuggestions),
  Param('xFilesFactor', ParamTypes.float),
]


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
    series.tags['scale'] = factor
    series.name = "scale(%s,%g)" % (series.name,float(factor))
    series.pathExpression = series.name
    for i,value in enumerate(series):
      series[i] = safe.safeMul(value,factor)
  return seriesList


scale.group = 'Transform'
scale.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('factor', ParamTypes.float, required=True),
]


def scaleToSeconds(requestContext, seriesList, seconds):
  """
  Takes one metric or a wildcard seriesList and returns "value per seconds" where
  seconds is a last argument to this functions.

  Useful in conjunction with derivative or integral function if you want
  to normalize its result to a known resolution for arbitrary retentions
  """

  for series in seriesList:
    series.tags['scaleToSeconds'] = seconds
    series.name = "scaleToSeconds(%s,%d)" % (series.name,seconds)
    series.pathExpression = series.name
    factor = seconds / series.step

    for i,value in enumerate(series):
      if value is not None:
        # Division long by float cause OverflowError
        try:
          series[i] = round(value * factor, 6)
        except OverflowError:
          series[i] = (value // series.step) * seconds

  return seriesList


scaleToSeconds.group = 'Transform'
scaleToSeconds.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('seconds', ParamTypes.float, required=True),
]


def exp(requestContext, seriesList):
    """
    Raise e to the power of the datapoint,
    where e = 2.718281... is the base of natural logarithms.

    Example:

    .. code-block:: none

        &target=exp(Server.instance01.threads.busy)

    """
    for series in seriesList:
        series.tags['exp'] = 'e'
        series.name = "exp(%s)" % (series.name)
        series.pathExpression = series.name
        for i, value in enumerate(series):
            series[i] = safe.safeExp(value)

    return seriesList


exp.group = 'Transform'
exp.params = [
    Param('seriesList', ParamTypes.seriesList, required=True),
]


def add(requestContext, seriesList, constant):
    """
    Takes one metric or a wildcard seriesList followed by a constant, and adds the
    constant to each datapoint. Also works for negative numbers.

    Example:

    .. code-block:: none

      &target=add(Server.instance01.threads.busy, 10)
      &target=add(Server.instance*.threads.busy, 10)

    """
    for series in seriesList:
        series.tags['add'] = constant
        series.name = "add(%s,%d)" % (series.name, constant)
        series.pathExpression = series.name
        for i, value in enumerate(series):
            try:
                series[i] = value + constant
            except TypeError:
                series[i] = None

    return seriesList


add.group = 'Transform'
add.params = [
    Param('seriesList', ParamTypes.seriesList, required=True),
    Param('constant', ParamTypes.float, required=True),
]


def sigmoid(requestContext, seriesList):
    """
    Takes one metric or a wildcard seriesList and applies the sigmoid
    function `1 / (1 + exp(-x))` to each datapoint.

    Example:

    .. code-block:: none

      &target=sigmoid(Server.instance01.threads.busy)
      &target=sigmoid(Server.instance*.threads.busy)

    """
    for series in seriesList:
        series.tags['sigmoid'] = 'sigmoid'
        series.name = "sigmoid(%s)" % series.name
        series.pathExpression = series.name
        for i, value in enumerate(series):
            try:
                log.info(value)
                series[i] = 1 / (1 + safe.safeExp(-value))
            except (TypeError, ValueError, ZeroDivisionError):
                series[i] = None

    return seriesList


sigmoid.group = 'Transform'
sigmoid.params = [
    Param('seriesList', ParamTypes.seriesList, required=True),
]


def logit(requestContext, seriesList):
    """
    Takes one metric or a wildcard seriesList and applies the logit
    function `log(x / (1 - x))` to each datapoint.

    Example:

    .. code-block:: none

      &target=logit(Server.instance01.threads.busy)
      &target=logit(Server.instance*.threads.busy)

    """
    for series in seriesList:
        series.tags['logit'] = 'logit'
        series.name = "logit(%s)" % series.name
        series.pathExpression = series.name
        for i, value in enumerate(series):
            try:
                series[i] = math.log(value / (1 - value))
            except (TypeError, ValueError, ZeroDivisionError):
                series[i] = None

    return seriesList


logit.group = 'Transform'
logit.params = [
    Param('seriesList', ParamTypes.seriesList, required=True),
]


def pow(requestContext, seriesList, factor):
  """
  Takes one metric or a wildcard seriesList followed by a constant, and raises the datapoint
  by the power of the constant provided at each point.

  Example:

  .. code-block:: none

    &target=pow(Server.instance01.threads.busy,10)
    &target=pow(Server.instance*.threads.busy,10)

  """
  for series in seriesList:
    series.tags['pow'] = factor
    series.name = "pow(%s,%g)" % (series.name, float(factor))
    series.pathExpression = series.name
    for i,value in enumerate(series):
      series[i] = safe.safePow(value, factor)
  return seriesList


pow.group = 'Transform'
pow.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('factor', ParamTypes.float, required=True),
]


def powSeries(requestContext, *seriesLists):
  """
  Takes two or more series and pows their points. A constant line may be
  used.

  Example:

  .. code-block:: none

    &target=powSeries(Server.instance01.app.requests, Server.instance01.app.replies)


  """

  try:
    (seriesList, start, end, step) = normalize(seriesLists)
  except NormalizeEmptyResultError:
    return []
  name = "powSeries(%s)" % ','.join([s.name for s in seriesList])
  values = []
  for row in izip_longest(*seriesList):
    first = True
    tmpVal = None
    for element in row:
      # If it is a first iteration - tmpVal needs to be element
      if first:
        tmpVal = element
        first = False
      else:
        tmpVal = safe.safePow(tmpVal, element)
    values.append(tmpVal)
  series = TimeSeries(name,start,end,step,values,xFilesFactor=requestContext.get('xFilesFactor'))
  return [series]


powSeries.group = 'Combine'
powSeries.params = [
  Param('seriesList', ParamTypes.seriesList, required=True, multiple=True),
]
powSeries.aggregator = True


def squareRoot(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList, and computes the square root of each datapoint.

  Example:

  .. code-block:: none

    &target=squareRoot(Server.instance01.threads.busy)

  """
  for series in seriesList:
    series.tags['squareRoot'] = 1
    series.name = "squareRoot(%s)" % (series.name)
    series.pathExpression = series.name
    for i,value in enumerate(series):
      series[i] = safe.safePow(value, 0.5)
  return seriesList


squareRoot.group = 'Transform'
squareRoot.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def invert(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList, and inverts each datapoint (i.e. 1/x).

  Example:

  .. code-block:: none

    &target=invert(Server.instance01.threads.busy)

  """
  for series in seriesList:
    series.tags['invert'] = 1
    series.name = "invert(%s)" % (series.name)
    series.pathExpression = series.name
    for i,value in enumerate(series):
        series[i] = safe.safePow(value, -1)
  return seriesList


invert.group = 'Transform'
invert.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


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
    series.tags['absolute'] = 1
    series.name = "absolute(%s)" % (series.name)
    series.pathExpression = series.name
    for i,value in enumerate(series):
      series[i] = safe.safeAbs(value)
  return seriesList


absolute.group = 'Transform'
absolute.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def offset(requestContext, seriesList, factor):
  """
  Takes one metric or a wildcard seriesList followed by a constant, and adds the constant to
  each datapoint.

  Example:

  .. code-block:: none

    &target=offset(Server.instance01.threads.busy,10)

  """
  for series in seriesList:
    series.tags['offset'] = factor
    series.name = "offset(%s,%g)" % (series.name,float(factor))
    series.pathExpression = series.name
    for i,value in enumerate(series):
      if value is not None:
        series[i] = value + factor
  return seriesList


offset.group = 'Transform'
offset.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('factor', ParamTypes.float, required=True),
]


def offsetToZero(requestContext, seriesList):
  """
  Offsets a metric or wildcard seriesList by subtracting the minimum
  value in the series from each datapoint.

  Useful to compare different series where the values in each series
  may be higher or lower on average but you're only interested in the
  relative difference.

  An example use case is for comparing different round trip time
  results. When measuring RTT (like pinging a server), different
  devices may come back with consistently different results due to
  network latency which will be different depending on how many
  network hops between the probe and the device. To compare different
  devices in the same graph, the network latency to each has to be
  factored out of the results. This is a shortcut that takes the
  fastest response (lowest number in the series) and sets that to zero
  and then offsets all of the other datapoints in that series by that
  amount. This makes the assumption that the lowest response is the
  fastest the device can respond, of course the more datapoints that
  are in the series the more accurate this assumption is.

  Example:

  .. code-block:: none

    &target=offsetToZero(Server.instance01.responseTime)
    &target=offsetToZero(Server.instance*.responseTime)

  """
  for series in seriesList:
    minimum = safe.safeMin(series)
    series.tags['offsetToZero'] = minimum
    series.name = "offsetToZero(%s)" % (series.name)
    series.pathExpression = series.name
    for i,value in enumerate(series):
      if value is not None:
        series[i] = value - minimum
  return seriesList


offsetToZero.group = 'Transform'
offsetToZero.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def roundFunction(requestContext, seriesList, precision=None):
  """
  Takes one metric or a wildcard seriesList optionally followed by a precision, and rounds each
  datapoint to the specified precision.

  Example:

  .. code-block:: none

    &target=round(Server.instance01.threads.busy)
    &target=round(Server.instance01.threads.busy,2)

  """
  for series in seriesList:
    series.tags['round'] = precision or 0
    if precision is None:
      series.name = "round(%s)" % (series.name)
    else:
      series.name = "round(%s,%g)" % (series.name,int(precision))
    series.pathExpression = series.name
    for i,value in enumerate(series):
      if value is not None:
        series[i] = round(value, precision or 0)
  return seriesList


roundFunction.group = 'Transform'
roundFunction.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('precision', ParamTypes.integer, default=0),
]


def movingAverage(requestContext, seriesList, windowSize, xFilesFactor=None):
  """
  Graphs the moving average of a metric (or metrics) over a fixed number of
  past points, or a time interval.

  Takes one metric or a wildcard seriesList followed by a number N of datapoints
  or a quoted string with a length of time like '1hour' or '5min' (See ``from /
  until`` in the :doc:`Render API <render_api>` for examples of time formats), and an xFilesFactor value to specify
  how many points in the window must be non-null for the output to be considered valid. Graphs the
  average of the preceeding datapoints for each point on the graph.

  Example:

  .. code-block:: none

    &target=movingAverage(Server.instance01.threads.busy,10)
    &target=movingAverage(Server.instance*.threads.idle,'5min')

  """
  return movingWindow(requestContext, seriesList, windowSize, 'average', xFilesFactor)


movingAverage.group = 'Calculate'
movingAverage.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('windowSize', ParamTypes.intOrInterval, required=True, suggestions=intOrIntervalSuggestions),
  Param('xFilesFactor', ParamTypes.float),
]


def movingSum(requestContext, seriesList, windowSize, xFilesFactor=None):
  """
  Graphs the moving sum of a metric (or metrics) over a fixed number of
  past points, or a time interval.

  Takes one metric or a wildcard seriesList followed by a number N of datapoints
  or a quoted string with a length of time like '1hour' or '5min' (See ``from /
  until`` in the :doc:`Render API <render_api>` for examples of time formats), and an xFilesFactor value to specify
  how many points in the window must be non-null for the output to be considered valid. Graphs the
  sum of the preceeding datapoints for each point on the graph.

  Example:

  .. code-block:: none

    &target=movingSum(Server.instance01.requests,10)
    &target=movingSum(Server.instance*.errors,'5min')

  """
  return movingWindow(requestContext, seriesList, windowSize, 'sum', xFilesFactor)


movingSum.group = 'Calculate'
movingSum.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('windowSize', ParamTypes.intOrInterval, required=True, suggestions=intOrIntervalSuggestions),
  Param('xFilesFactor', ParamTypes.float),
]


def movingMin(requestContext, seriesList, windowSize, xFilesFactor=None):
  """
  Graphs the moving minimum of a metric (or metrics) over a fixed number of
  past points, or a time interval.

  Takes one metric or a wildcard seriesList followed by a number N of datapoints
  or a quoted string with a length of time like '1hour' or '5min' (See ``from /
  until`` in the :doc:`Render API <render_api>` for examples of time formats), and an xFilesFactor value to specify
  how many points in the window must be non-null for the output to be considered valid. Graphs the
  minimum of the preceeding datapoints for each point on the graph.

  Example:

  .. code-block:: none

    &target=movingMin(Server.instance01.requests,10)
    &target=movingMin(Server.instance*.errors,'5min')

  """
  return movingWindow(requestContext, seriesList, windowSize, 'min', xFilesFactor)


movingMin.group = 'Calculate'
movingMin.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('windowSize', ParamTypes.intOrInterval, required=True, suggestions=intOrIntervalSuggestions),
  Param('xFilesFactor', ParamTypes.float),
]


def movingMax(requestContext, seriesList, windowSize, xFilesFactor=None):
  """
  Graphs the moving maximum of a metric (or metrics) over a fixed number of
  past points, or a time interval.

  Takes one metric or a wildcard seriesList followed by a number N of datapoints
  or a quoted string with a length of time like '1hour' or '5min' (See ``from /
  until`` in the :doc:`Render API <render_api>` for examples of time formats), and an xFilesFactor value to specify
  how many points in the window must be non-null for the output to be considered valid. Graphs the
  maximum of the preceeding datapoints for each point on the graph.

  Example:

  .. code-block:: none

    &target=movingMax(Server.instance01.requests,10)
    &target=movingMax(Server.instance*.errors,'5min')

  """
  return movingWindow(requestContext, seriesList, windowSize, 'max', xFilesFactor)


movingMax.group = 'Calculate'
movingMax.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('windowSize', ParamTypes.intOrInterval, required=True, suggestions=intOrIntervalSuggestions),
  Param('xFilesFactor', ParamTypes.float),
]


def cumulative(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.

  When a graph is drawn where width of the graph size in pixels is smaller than
  the number of datapoints to be graphed, Graphite consolidates the values to
  to prevent line overlap. The cumulative() function changes the consolidation
  function from the default of 'average' to 'sum'. This is especially useful in
  sales graphs, where fractional values make no sense and a 'sum' of consolidated
  values is appropriate.

  Alias for :func:`consolidateBy(series, 'sum') <graphite.render.functions.consolidateBy>`

  .. code-block:: none

    &target=cumulative(Sales.widgets.largeBlue)

  """
  return consolidateBy(requestContext, seriesList, 'sum')


cumulative.group = 'Special'
cumulative.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def consolidateBy(requestContext, seriesList, consolidationFunc):
  """
  Takes one metric or a wildcard seriesList and a consolidation function name.

  Valid function names are 'sum', 'average'/'avg', 'min', 'max', 'first' & 'last'.

  When a graph is drawn where width of the graph size in pixels is smaller than
  the number of datapoints to be graphed, Graphite consolidates the values to
  to prevent line overlap. The consolidateBy() function changes the consolidation
  function from the default of 'average' to one of 'sum', 'max', 'min', 'first', or 'last'.
  This is especially useful in sales graphs, where fractional values make no sense and a 'sum'
  of consolidated values is appropriate.

  .. code-block:: none

    &target=consolidateBy(Sales.widgets.largeBlue, 'sum')
    &target=consolidateBy(Servers.web01.sda1.free_space, 'max')

  """
  for series in seriesList:
    # datalib will throw an exception, so it's not necessary to validate here
    series.consolidationFunc = consolidationFunc
    series.tags['consolidateBy'] = consolidationFunc
    series.name = 'consolidateBy(%s,"%s")' % (series.name, series.consolidationFunc)
    series.pathExpression = series.name
  return seriesList


consolidateBy.group = 'Special'
consolidateBy.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('consolidationFunc', ParamTypes.string, required=True, options=['sum', 'average', 'avg', 'avg_zero', 'min', 'max', 'first', 'last']),
]


def setXFilesFactor(requestContext, seriesList, xFilesFactor):
  """
  Short form: xFilesFactor()

  Takes one metric or a wildcard seriesList and an xFilesFactor value between 0 and 1

  When a series needs to be consolidated, this sets the fraction of values in an interval that must
  not be null for the consolidation to be considered valid.  If there are not enough values then
  None will be returned for that interval.

  .. code-block:: none

    &target=xFilesFactor(Sales.widgets.largeBlue, 0.5)
    &target=Servers.web01.sda1.free_space|consolidateBy('max')|xFilesFactor(0.5)

  The `xFilesFactor` set via this function is used as the default for all functions that accept an
  `xFilesFactor` parameter, all functions that aggregate data across multiple series and/or
  intervals, and `maxDataPoints <render_api.html#maxdatapoints>`_ consolidation.

  A default for the entire render request can also be set using the
  `xFilesFactor <render_api.html#xfilesfactor>`_ query parameter.

  .. note::

    `xFilesFactor` follows the same semantics as in Whisper storage schemas.  Setting it to 0 (the
    default) means that only a single value in a given interval needs to be non-null, setting it to
    1 means that all values in the interval must be non-null.  A setting of 0.5 means that at least
    half the values in the interval must be non-null.
  """
  requestContext['xFilesFactor'] = xFilesFactor
  for series in seriesList:
    series.xFilesFactor = xFilesFactor
    series.tags['xFilesFactor'] = xFilesFactor
  return seriesList


setXFilesFactor.group = 'Special'
setXFilesFactor.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('xFilesFactor', ParamTypes.float, required=True),
]


def derivative(requestContext, seriesList):
  """
  This is the opposite of the integral function.  This is useful for taking a
  running total metric and calculating the delta between subsequent data points.

  This function does not normalize for periods of time, as a true derivative would.
  Instead see the perSecond() function to calculate a rate of change over time.

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
    series.tags['derivative'] = 1
    newName = "derivative(%s)" % series.name
    newSeries = series.copy(name=newName, values=newValues)
    results.append(newSeries)
  return results


derivative.group = 'Transform'
derivative.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def perSecond(requestContext, seriesList, maxValue=None, minValue=None):
  """
  NonNegativeDerivative adjusted for the series time interval
  This is useful for taking a running total metric and showing how many requests
  per second were handled.

  The optional ``minValue`` and ``maxValue`` parameters have the same
  meaning as in ``nonNegativeDerivative``.

  Example:

  .. code-block:: none

    &target=perSecond(company.server.application01.ifconfig.TXPackets)

  Each time you run ifconfig, the RX and TXPackets are higher (assuming there
  is network traffic.) By applying the perSecond function, you can get an
  idea of the packets per second sent or received, even though you're only
  recording the total.
  """
  results = []
  for series in seriesList:
    newValues = []
    prev = None
    step = series.step

    for val in series:
      delta, prev = _nonNegativeDelta(val, prev, maxValue, minValue)

      if delta is not None:
        # Division long by float cause OverflowError
        try:
          newValues.append(round(delta / step, 6))
        except OverflowError:
          newValues.append(delta // step)
      else:
        newValues.append(None)

    series.tags['perSecond'] = 1
    newName = "perSecond(%s)" % series.name
    newSeries = series.copy(name=newName, values=newValues)
    results.append(newSeries)

  return results


perSecond.group = 'Transform'
perSecond.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('maxValue', ParamTypes.float),
  Param('minValue', ParamTypes.float),
]


def delay(requestContext, seriesList, steps):
  """
  This shifts all samples later by an integer number of steps. This can be
  used for custom derivative calculations, among other things. Note: this
  will pad the early end of the data with None for every step shifted.

  This complements other time-displacement functions such as timeShift and
  timeSlice, in that this function is indifferent about the step intervals
  being shifted.

  Example:

  .. code-block:: none

    &target=divideSeries(server.FreeSpace,delay(server.FreeSpace,1))

  This computes the change in server free space as a percentage of the previous
  free space.
  """
  results = []
  for series in seriesList:
    if steps < 0:
      newValues = series[-steps:] + [None] * min(-steps, len(series))
    else:
      newValues = [None] * min(steps, len(series)) + series[:-steps]
    series.tags['delay'] = steps
    newName = "delay(%s,%d)" % (series.name, steps)
    newSeries = series.copy(name=newName, values=newValues)
    results.append(newSeries)
  return results


delay.group = 'Transform'
delay.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('steps', ParamTypes.integer, required=True),
]


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
    series.tags['integral'] = 1
    newName = "integral(%s)" % series.name
    newSeries = series.copy(name=newName, values=newValues)
    results.append(newSeries)
  return results


integral.group = 'Transform'
integral.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def integralByInterval(requestContext, seriesList, intervalUnit):
  """
  This will do the same as integral() funcion, except resetting the total to 0
  at the given time in the parameter "from"
  Useful for finding totals per hour/day/week/..

  Example:

  .. code-block:: none

    &target=integralByInterval(company.sales.perMinute, "1d")&from=midnight-10days

  This would start at zero on the left side of the graph, adding the sales each
  minute, and show the evolution of sales per day during the last 10 days.
  """
  intervalDuration = int(abs(deltaseconds(parseTimeOffset(intervalUnit))))
  startTime = int(timestamp(requestContext['startTime']))
  results = []
  for series in seriesList:
    newValues = []
    currentTime = series.start # current time within series iteration
    current = 0.0 # current accumulated value
    for val in series:
      # reset integral value if crossing an interval boundary
      if (currentTime - startTime)//intervalDuration != (currentTime - startTime - series.step)//intervalDuration:
        current = 0.0
      if val is None:
        # keep previous value since val can be None when resetting current to 0.0
        newValues.append(current)
      else:
        current += val
        newValues.append(current)
      currentTime += series.step
    series.tags['integralByInterval'] = intervalUnit
    newName = "integralByInterval(%s,'%s')" % (series.name, intervalUnit)
    newSeries = series.copy(name=newName, values=newValues)
    results.append(newSeries)
  return results


integralByInterval.group = 'Transform'
integralByInterval.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('intervalUnit', ParamTypes.string, required=True),
]


def nonNegativeDerivative(requestContext, seriesList, maxValue=None, minValue=None):
  """
  Same as the derivative function above, but ignores datapoints that trend
  down.  Useful for counters that increase for a long time, then wrap or
  reset. (Such as if a network interface is destroyed and recreated by unloading
  and re-loading a kernel module, common with USB / WiFi cards.

  By default, a null value is returned in place of negative datapoints. When
  ``maxValue`` is supplied, the missing value is computed as if the counter
  had wrapped at ``maxValue``. When ``minValue`` is supplied, the missing
  value is computed as if the counter had wrapped to ``minValue``.

  Example:

  .. code-block:: none

    &target=nonNegativederivative(company.server.application01.ifconfig.TXPackets)

  """
  results = []

  for series in seriesList:
    newValues = []
    prev = None

    for val in series:
      delta, prev = _nonNegativeDelta(val, prev, maxValue, minValue)

      newValues.append(delta)

    series.tags['nonNegativeDerivative'] = 1
    newName = "nonNegativeDerivative(%s)" % series.name
    newSeries = series.copy(name=newName, values=newValues)
    results.append(newSeries)

  return results


nonNegativeDerivative.group = 'Transform'
nonNegativeDerivative.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('maxValue', ParamTypes.float),
  Param('minValue', ParamTypes.float),
]


def _nonNegativeDelta(val, prev, maxValue, minValue):
  # ignore values larger than maxValue
  if maxValue is not None and val > maxValue:
    return None, None
  if minValue is not None and val < minValue:
    return None, None

  # first reading
  if None in (prev, val):
    return None, val

  # counter increased, use the difference
  if val >= prev:
    return val - prev, val

  # counter wrapped and we have maxValue (and optionally minValue)
  # calculate delta based on maxValue + 1 + val - prev - minValue
  if maxValue is not None:
    return maxValue + 1 + val - prev - (minValue or 0), val
  # counter wrapped and we have maxValue
  # calculate delta based on val - minValue
  if minValue is not None:
    return val - minValue, val

  # counter wrapped or reset and we don't have minValue/maxValue
  # just use None
  return None, val


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
    totalStack = []
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
      series.tags['stacked'] = stackName
      newName = "stacked(%s)" % series.name
    else:
      newName = series.name

    newSeries = series.copy(name=newName, values=newValues)
    newSeries.options['stacked'] = True
    results.append(newSeries)
  requestContext['totalStack'][stackName] = totalStack
  return results


stacked.group = 'Graph'
stacked.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('stack', ParamTypes.string),
]


def areaBetween(requestContext, seriesList):
  """
  Draws the vertical area in between the two series in seriesList. Useful for
  visualizing a range such as the minimum and maximum latency for a service.

  areaBetween expects **exactly one argument** that results in exactly two series
  (see example below). The order of the lower and higher values series does not
  matter. The visualization only works when used in conjunction with
  ``areaMode=stacked``.

  Most likely use case is to provide a band within which another metric should
  move. In such case applying an ``alpha()``, as in the second example, gives
  best visual results.

  Example:

  .. code-block:: none

    &target=areaBetween(service.latency.{min,max})&areaMode=stacked

    &target=alpha(areaBetween(service.latency.{min,max}),0.3)&areaMode=stacked

  If for instance, you need to build a seriesList, you should use the ``group``
  function, like so:

  .. code-block:: none

    &target=areaBetween(group(minSeries(a.*.min),maxSeries(a.*.max)))
  """
  assert len(seriesList) == 2, "areaBetween series argument must reference *exactly* 2 series"
  lower = seriesList[0]
  upper = seriesList[1]

  lower.options['stacked'] = True
  lower.options['invisible'] = True

  upper.options['stacked'] = True

  upper.tags['areaBetween'] = 1
  lower.tags = upper.tags
  lower.name = upper.name = "areaBetween(%s)" % upper.pathExpression
  return seriesList


areaBetween.group = 'Graph'
areaBetween.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def aliasSub(requestContext, seriesList, search, replace):
  r"""
  Runs series names through a regex search/replace.

  .. code-block:: none

    &target=aliasSub(ip.*TCP*,"^.*TCP(\d+)","\1")
  """
  try:
    seriesList.name = re.sub(search, replace, seriesList.name)
  except AttributeError:
    for series in seriesList:
      series.name = re.sub(search, replace, series.name)
  return seriesList


aliasSub.group = 'Alias'
aliasSub.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('search', ParamTypes.string, required=True),
  Param('replace', ParamTypes.string, required=True),
]


def aliasQuery(requestContext, seriesList, search, replace, newName):
  r"""
  Performs a query to alias the metrics in seriesList.

  .. code-block:: none

    &target=aliasQuery(channel.power.*,"channel\.power\.([0-9]+)","channel.frequency.\1", "Channel %d MHz")

  The series in seriesList will be aliased by first translating the series names using
  the search & replace parameters, then using the last value of the resulting series
  to construct the alias using sprintf-style syntax.
  """
  for series in seriesList:
    newQuery = re.sub(search, replace, series.name)
    newContext = requestContext.copy()
    newContext['prefetch'] = {}
    newSeriesList = evaluateTarget(newContext, newQuery)
    if newSeriesList is None or len(newSeriesList) == 0:
      raise InputParameterError('No series found with query: ' + newQuery)
    current = safe.safeLast(newSeriesList[0])
    if current is None:
      raise InputParameterError('Cannot get last value of series: ' + newSeriesList[0])
    series.name = newName % current
  return seriesList


aliasQuery.group = 'Alias'
aliasQuery.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('search', ParamTypes.string, required=True),
  Param('replace', ParamTypes.string, required=True),
  Param('newName', ParamTypes.string, required=True),
]


def alias(requestContext, seriesList, newName):
  """
  Takes one metric or a wildcard seriesList and a string in quotes.
  Prints the string instead of the metric name in the legend.

  .. code-block:: none

    &target=alias(Sales.widgets.largeBlue,"Large Blue Widgets")

  """
  try:
    seriesList.name = newName
  except AttributeError:
    for series in seriesList:
      series.name = newName
  return seriesList


alias.group = 'Alias'
alias.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('newName', ParamTypes.string, required=True),
]


def cactiStyle(requestContext, seriesList, system=None, units=None):
  """
  Takes a series list and modifies the aliases to provide column aligned
  output with Current, Max, and Min values in the style of cacti. Optionally
  takes a "system" value to apply unit formatting in the same style as the
  Y-axis, or a "unit" string to append an arbitrary unit suffix.

  .. code-block:: none

    &target=cactiStyle(ganglia.*.net.bytes_out,"si")
    &target=cactiStyle(ganglia.*.net.bytes_out,"si","b")

  A possible value for ``system`` is ``si``, which would express your values in
  multiples of a thousand. A second option is to use ``binary`` which will
  instead express your values in multiples of 1024 (useful for network devices).

  Column alignment of the Current, Max, Min values works under two conditions:
  you use a monospace font such as terminus and use a single cactiStyle call, as
  separate cactiStyle calls are not aware of each other. In case you have
  different targets for which you would like to have cactiStyle to line up, you
  can use ``group()`` to combine them before applying cactiStyle, such as:

  .. code-block:: none

    &target=cactiStyle(group(metricA,metricB))

  """
  if 0 == len(seriesList):
      return seriesList
  if system:
      if units:
          fmt = lambda x:"%.2f %s" % format_units(x,system=system,units=units)
      else:
          fmt = lambda x:"%.2f%s" % format_units(x,system=system)
  else:
      if units:
          fmt = lambda x: "%.2f %s" % (x, units)
      else:
          fmt = lambda x: "%.2f" % x

  nameLen = max([0] + [len(getattr(series,"name")) for series in seriesList])
  lastLen = max([0] + [len(fmt(int(safe.safeLast(series) or 3))) for series in seriesList]) + 3
  maxLen = max([0] + [len(fmt(int(safe.safeMax(series) or 3))) for series in seriesList]) + 3
  minLen = max([0] + [len(fmt(int(safe.safeMin(series) or 3))) for series in seriesList]) + 3
  for series in seriesList:
      last = safe.safeLast(series)
      maximum = safe.safeMax(series)
      minimum = safe.safeMin(series)
      if last is None:
        last = NAN
      else:
        last = fmt(float(last))

      if maximum is None:
        maximum = NAN
      else:
        maximum = fmt(float(maximum))
      if minimum is None:
        minimum = NAN
      else:
        minimum = fmt(float(minimum))

      series.name = "%*s Current:%*s Max:%*s Min:%*s " % \
          (-nameLen, series.name,
           -lastLen, last,
           -maxLen, maximum,
           -minLen, minimum)
  return seriesList


cactiStyle.group = 'Special'
cactiStyle.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('system', ParamTypes.string, options=['si', 'binary']),
  Param('units', ParamTypes.string),
]


def _getFirstPathExpression(name):
  """Returns the first metric path in an expression."""
  tokens = grammar.parseString(name)
  pathExpression = None
  while pathExpression is None:
    if tokens.pathExpression:
      pathExpression = tokens.pathExpression
    elif tokens.expression:
      tokens = tokens.expression
    elif tokens.call:
      tokens = tokens.call.args[0]
    else:
      break
  return pathExpression


def aliasByNode(requestContext, seriesList, *nodes):
  """
  Takes a seriesList and applies an alias derived from one or more "node"
  portion/s of the target name or tags. Node indices are 0 indexed.

  .. code-block:: none

    &target=aliasByNode(ganglia.*.cpu.load5,1)

  Each node may be an integer referencing a node in the series name or a string identifying a tag.

  .. code-block:: none

    &target=seriesByTag("name=~cpu.load.*", "server=~server[1-9]+", "datacenter=dc1")|aliasByNode("datacenter", "server", 1)

    # will produce output series like
    # dc1.server1.load5, dc1.server2.load5, dc1.server1.load10, dc1.server2.load10
  """
  for series in seriesList:
    series.name = aggKey(series, nodes)
  return seriesList


aliasByNode.group = 'Alias'
aliasByNode.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('nodes', ParamTypes.nodeOrTag, required=True, multiple=True),
]


def aliasByMetric(requestContext, seriesList):
  """
  Takes a seriesList and applies an alias derived from the base metric name.

  .. code-block:: none

    &target=aliasByMetric(carbon.agents.graphite.creates)

  """
  return substr(requestContext, seriesList, -1, 0)


aliasByMetric.group = 'Alias'
aliasByMetric.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


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
  system = None
  if valueTypes[-1] in ('si', 'binary'):
    system = valueTypes[-1]
    valueTypes = valueTypes[:-1]
  for valueType in valueTypes:
    try:
      valueFunc = getAggFunc(valueType)
    except InputParameterError:
      valueFunc = lambda s: '(?)'
    if system is None:
      for series in seriesList:
        series.name += " (%s: %s)" % (valueType, valueFunc(series))
    else:
      for series in seriesList:
        value = valueFunc(series)
        formatted = None
        if isinstance(value, six.string_types):
          formatted = value
        elif value is not None:
          formatted = "%.2f%s" % format_units(value, system=system)
        series.name = "%-20s%-5s%-10s" % (series.name, valueType, formatted)
  return seriesList


legendValue.group = 'Alias'
legendValue.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('valuesTypes', ParamTypes.string, multiple=True, options=ParamTypeAggFunc.getAllValidAggFuncs() + ['si', 'binary']),
]


def alpha(requestContext, seriesList, alpha):
  """
  Assigns the given alpha transparency setting to the series. Takes a float value between 0 and 1.
  """
  for series in seriesList:
    series.options['alpha'] = alpha
  return seriesList


alpha.group = 'Graph'
alpha.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('alpha', ParamTypes.float, required=True),
]


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


color.group = 'Graph'
color.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('theColor', ParamTypes.string, required=True),
]


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


substr.group = 'Special'
substr.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('start', ParamTypes.node, default=0),
  Param('stop', ParamTypes.node, default=0),
]


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
    series.tags['log'] = base
    newName = "log(%s, %s)" % (series.name, base)
    newSeries = series.copy(name=newName, values=newValues)
    results.append(newSeries)
  return results


logarithm.group = 'Transform'
logarithm.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('base', ParamTypes.integer, default=10),
]

operatorFuncs = {
  '=': (lambda val, threshold: val is not None and val == threshold),
  '!=': (lambda val, threshold: val is None or val != threshold),
  '>': (lambda val, threshold: val is not None and val > threshold),
  '>=': (lambda val, threshold: val is not None and val >= threshold),
  '<': (lambda val, threshold: val is None or val < threshold),
  '<=': (lambda val, threshold: val is None or val <= threshold),
}


def filterSeries(requestContext, seriesList, func, operator, threshold):
  """
  Takes one metric or a wildcard seriesList followed by a consolidation function, an operator and a threshold.
  Draws only the metrics which match the filter expression.

  Example:

  .. code-block:: none

    &target=filterSeries(system.interface.eth*.packetsSent, 'max', '>', 1000)

  This would only display interfaces which has a peak throughput higher than 1000 packets/min.

  Supported aggregation functions: ``average``, ``median``, ``sum``, ``min``,
  ``max``, ``diff``, ``stddev``, ``range``, ``multiply`` & ``last``.

  Supported operators: ``=``, ``!=``, ``>``, ``>=``, ``<`` & ``<=``.
  """
  consolidationFunc = getAggFunc(func)

  if operator not in operatorFuncs:
    raise InputParameterError('Unsupported operator: %s' % (operator))
  operatorFunc = operatorFuncs[operator]

  # if seriesList is empty then just short-circuit
  if not seriesList:
    return []

  return [series for series in seriesList if operatorFunc(consolidationFunc(series), threshold)]


filterSeries.group = 'Filter Series'
filterSeries.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('func', ParamTypes.aggFunc, required=True),
  Param('operator', ParamTypes.string, required=True, options=sorted(operatorFuncs.keys())),
  Param('threshold', ParamTypes.float, required=True),
]


def maximumAbove(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant n.
  Draws only the metrics with a maximum value above n.

  Example:

  .. code-block:: none

    &target=maximumAbove(system.interface.eth*.packetsSent,1000)

  This would only display interfaces which sent more than 1000 packets/min.
  """
  return filterSeries(requestContext, seriesList, 'max', '>', n)


maximumAbove.group = 'Filter Series'
maximumAbove.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def minimumAbove(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant n.
  Draws only the metrics with a minimum value above n.

  Example:

  .. code-block:: none

    &target=minimumAbove(system.interface.eth*.packetsSent,1000)

  This would only display interfaces which sent more than 1000 packets/min.
  """
  return filterSeries(requestContext, seriesList, 'min', '>', n)


minimumAbove.group = 'Filter Series'
minimumAbove.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def maximumBelow(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant n.
  Draws only the metrics with a maximum value below n.

  Example:

  .. code-block:: none

    &target=maximumBelow(system.interface.eth*.packetsSent,1000)

  This would only display interfaces which sent less than 1000 packets/min.
  """
  return filterSeries(requestContext, seriesList, 'max', '<=', n)


maximumBelow.group = 'Filter Series'
maximumBelow.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def minimumBelow(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant n.
  Draws only the metrics with a minimum value below or equal to n.

  Example:

  .. code-block:: none

    &target=minimumBelow(system.interface.eth*.packetsSent,1000)

  This would only display interfaces which at one point sent less than 1000 packets/min.
  """
  return filterSeries(requestContext, seriesList, 'min', '<=', n)


minimumBelow.group = 'Filter Series'
minimumBelow.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def highest(requestContext, seriesList, n=1, func='average'):
  """
  Takes one metric or a wildcard seriesList followed by an integer N and an aggregation function.
  Out of all metrics passed, draws only the N metrics with the highest aggregated value over the
  time period specified.

  Example:

  .. code-block:: none

    &target=highest(server*.instance*.threads.busy,5,'max')

  Draws the 5 servers with the highest number of busy threads.
  """
  seriesList.sort(key=keyFunc(getAggFunc(func)), reverse=True)
  return seriesList[:int(n)]


highest.group = 'Filter Series'
highest.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
  Param('func', ParamTypes.aggFunc, default='average'),
]


def lowest(requestContext, seriesList, n=1, func='average'):
  """
  Takes one metric or a wildcard seriesList followed by an integer N and an aggregation function.
  Out of all metrics passed, draws only the N metrics with the lowest aggregated value over the
  time period specified.

  Example:

  .. code-block:: none

    &target=lowest(server*.instance*.threads.busy,5,'min')

  Draws the 5 servers with the lowest number of busy threads.
  """
  seriesList.sort(key=keyFunc(getAggFunc(func)))
  return seriesList[:int(n)]


lowest.group = 'Filter Series'
lowest.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
  Param('func', ParamTypes.aggFunc, default='average'),
]


def highestCurrent(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the N metrics with the highest value
  at the end of the time period specified.

  Example:

  .. code-block:: none

    &target=highestCurrent(server*.instance*.threads.busy,5)

  Draws the 5 servers with the highest busy threads.

  This is an alias for :py:func:`highest <highest>` with aggregation ``current``.
  """
  return highest(requestContext, seriesList, n, 'current')


highestCurrent.group = 'Filter Series'
highestCurrent.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
]


def highestMax(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.

  Out of all metrics passed, draws only the N metrics with the highest maximum
  value in the time period specified.

  Example:

  .. code-block:: none

    &target=highestMax(server*.instance*.threads.busy,5)

  Draws the top 5 servers who have had the most busy threads during the time
  period specified.

  This is an alias for :py:func:`highest <highest>` with aggregation ``max``.
  """
  return highest(requestContext, seriesList, n, 'max')


highestMax.group = 'Filter Series'
highestMax.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
]


def lowestCurrent(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the N metrics with the lowest value at
  the end of the time period specified.

  Example:

  .. code-block:: none

    &target=lowestCurrent(server*.instance*.threads.busy,5)

  Draws the 5 servers with the least busy threads right now.

  This is an alias for :py:func:`lowest <lowest>` with aggregation ``current``.
  """
  return lowest(requestContext, seriesList, n, 'current')


lowestCurrent.group = 'Filter Series'
lowestCurrent.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
]


def currentAbove(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant N.
  Out of all metrics passed, draws only the  metrics whose value is above N
  at the end of the time period specified.

  Example:

  .. code-block:: none

    &target=currentAbove(server*.instance*.threads.busy,50)

  Draws the servers with more than 50 busy threads.

  """
  return filterSeries(requestContext, seriesList, 'last', '>', n)


currentAbove.group = 'Filter Series'
currentAbove.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def currentBelow(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant N.
  Out of all metrics passed, draws only the  metrics whose value is below N
  at the end of the time period specified.

  Example:

  .. code-block:: none

    &target=currentBelow(server*.instance*.threads.busy,3)

  Draws the servers with less than 3 busy threads.

  """
  return filterSeries(requestContext, seriesList, 'last', '<=', n)


currentBelow.group = 'Filter Series'
currentBelow.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def highestAverage(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the top N metrics with the highest
  average value for the time period specified.

  Example:

  .. code-block:: none

    &target=highestAverage(server*.instance*.threads.busy,5)

  Draws the top 5 servers with the highest average value.

  This is an alias for :py:func:`highest <highest>` with aggregation ``average``.
  """
  return highest(requestContext, seriesList, n, 'average')


highestAverage.group = 'Filter Series'
highestAverage.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
]


def lowestAverage(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Out of all metrics passed, draws only the bottom N metrics with the lowest
  average value for the time period specified.

  Example:

  .. code-block:: none

    &target=lowestAverage(server*.instance*.threads.busy,5)

  Draws the bottom 5 servers with the lowest average value.

  This is an alias for :py:func:`lowest <lowest>` with aggregation ``average``.
  """
  return lowest(requestContext, seriesList, n, 'average')


lowestAverage.group = 'Filter Series'
lowestAverage.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
]


def averageAbove(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant N.
  Out of all metrics passed, draws only the metrics with an average value
  above N for the time period specified.

  Example:

  .. code-block:: none

    &target=averageAbove(server*.instance*.threads.busy,25)

  Draws the servers with average values above 25.
  """
  return filterSeries(requestContext, seriesList, 'average', '>', n)


averageAbove.group = 'Filter Series'
averageAbove.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def averageBelow(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by a constant N.
  Out of all metrics passed, draws only the metrics with an average value
  below N for the time period specified.

  Example:

  .. code-block:: none

    &target=averageBelow(server*.instance*.threads.busy,25)

  Draws the servers with average values below 25.
  """
  return filterSeries(requestContext, seriesList, 'average', '<=', n)


averageBelow.group = 'Filter Series'
averageBelow.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def _getPercentile(points, n, interpolate=False):
  """
  Percentile is calculated using the method outlined in the NIST Engineering
  Statistics Handbook:
  http://www.itl.nist.gov/div898/handbook/prc/section2/prc252.htm
  """
  sortedPoints = sorted([ p for p in points if p is not None])
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
    s_copy = s.copy(values=sorted( [item for item in s if item is not None] ))
    if not s_copy:
      continue  # Skip this series because it is empty.

    perc_val = _getPercentile(s_copy, n)
    if perc_val is not None:
      s_copy.tags['nPercentile'] = n
      name = 'nPercentile(%s, %g)' % (s_copy.name, n)
      point_count = int((s.end - s.start)/s.step)
      perc_series = s_copy.copy(name=name, values=[perc_val] * point_count)
      results.append(perc_series)
  return results


nPercentile.group = 'Calculate'
nPercentile.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def averageOutsidePercentile(requestContext, seriesList, n):
  """
  Removes series lying inside an average percentile interval
  """
  averages = [safe.safeAvg(s) for s in seriesList]

  if n < 50:
    n = 100 - n

  lowPercentile = _getPercentile(averages, 100 - n)
  highPercentile = _getPercentile(averages, n)

  return [s for s in seriesList if not lowPercentile < safe.safeAvg(s) < highPercentile]


averageOutsidePercentile.group = 'Filter Series'
averageOutsidePercentile.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def removeBetweenPercentile(requestContext, seriesList, n):
  """
  Removes series that do not have an value lying in the x-percentile of all the values at a moment
  """
  if n < 50:
    n = 100 - n

  transposed = list(zip(*seriesList))

  lowPercentiles = [_getPercentile(col, 100-n) for col in transposed]
  highPercentiles = [_getPercentile(col, n) for col in transposed]

  return [l for l in seriesList if sum([not lowPercentiles[val_i] < val < highPercentiles[val_i]
    for (val_i, val) in enumerate(l)]) > 0]


removeBetweenPercentile.group = 'Filter Series'
removeBetweenPercentile.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def removeAbovePercentile(requestContext, seriesList, n):
  """
  Removes data above the nth percentile from the series or list of series provided.
  Values above this percentile are assigned a value of None.
  """
  for s in seriesList:
    s.name = 'removeAbovePercentile(%s, %g)' % (s.name, n)
    s.pathExpression = s.name
    try:
      percentile = nPercentile(requestContext, [s], n)[0][0]
    except IndexError:
      continue
    for (index, val) in enumerate(s):
      if val is not None and val > percentile:
        s[index] = None

  return seriesList


removeAbovePercentile.group = 'Filter Data'
removeAbovePercentile.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def removeAboveValue(requestContext, seriesList, n):
  """
  Removes data above the given threshold from the series or list of series provided.
  Values above this threshold are assigned a value of None.
  """
  for s in seriesList:
    s.name = 'removeAboveValue(%s, %g)' % (s.name, n)
    s.pathExpression = s.name
    for (index, val) in enumerate(s):
      if val is not None and val > n:
        s[index] = None

  return seriesList


removeAboveValue.group = 'Filter Data'
removeAboveValue.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def removeBelowPercentile(requestContext, seriesList, n):
  """
  Removes data below the nth percentile from the series or list of series provided.
  Values below this percentile are assigned a value of None.
  """
  for s in seriesList:
    s.name = 'removeBelowPercentile(%s, %g)' % (s.name, n)
    s.pathExpression = s.name
    try:
      percentile = nPercentile(requestContext, [s], n)[0][0]
    except IndexError:
      continue
    for (index, val) in enumerate(s):
      if val is None or val < percentile:
        s[index] = None

  return seriesList


removeBelowPercentile.group = 'Filter Data'
removeBelowPercentile.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


def removeBelowValue(requestContext, seriesList, n):
  """
  Removes data below the given threshold from the series or list of series provided.
  Values below this threshold are assigned a value of None.
  """
  for s in seriesList:
    s.name = 'removeBelowValue(%s, %g)' % (s.name, n)
    s.pathExpression = s.name
    for (index, val) in enumerate(s):
      if val is None or val < n:
        s[index] = None

  return seriesList


removeBelowValue.group = 'Filter Data'
removeBelowValue.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.float, required=True),
]


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


limit.group = 'Filter Series'
limit.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
]


def sortBy(requestContext, seriesList, func='average', reverse=False):
  """
  Takes one metric or a wildcard seriesList followed by an aggregation function and an
  optional ``reverse`` parameter.

  Returns the metrics sorted according to the specified function.

  Example:

  .. code-block:: none

    &target=sortBy(server*.instance*.threads.busy,'max')

  Draws the servers in ascending order by maximum.
  """
  seriesList.sort(key=keyFunc(getAggFunc(func)), reverse=reverse)
  return seriesList


sortBy.group = 'Sorting'
sortBy.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('func', ParamTypes.aggFunc, default='average'),
  Param('reverse', ParamTypes.boolean, default=False),
]


def sortByName(requestContext, seriesList, natural=False, reverse=False):
  """
  Takes one metric or a wildcard seriesList.
  Sorts the list of metrics by the metric name using either alphabetical order or natural sorting.
  Natural sorting allows names containing numbers to be sorted more naturally, e.g:
  - Alphabetical sorting: server1, server11, server12, server2
  - Natural sorting: server1, server2, server11, server12
  """
  def natSortKey(series):
    return re.sub(r"(\d+)", lambda x: "{0:010}".format(int(x.group(0))), series.name)

  if natural:
    seriesList.sort(key=natSortKey, reverse=reverse)
  else:
    seriesList.sort(key=lambda x: x.name, reverse=reverse)

  return seriesList


sortByName.group = 'Sorting'
sortByName.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('natural', ParamTypes.boolean, default=False),
  Param('reverse', ParamTypes.boolean, default=False),
]


def sortByTotal(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.

  Sorts the list of metrics in descending order by the sum of values across the time period
  specified.
  """
  return sortBy(requestContext, seriesList, 'sum', reverse=True)


sortByTotal.group = 'Sorting'
sortByTotal.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def sortByMaxima(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.

  Sorts the list of metrics in descending order by the maximum value across the time period
  specified.  Useful with the &areaMode=all parameter, to keep the
  lowest value lines visible.

  Example:

  .. code-block:: none

    &target=sortByMaxima(server*.instance*.memory.free)

  """
  seriesList.sort(key=keyFunc(safe.safeMax), reverse=True)
  return seriesList


sortByMaxima.group = 'Sorting'
sortByMaxima.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def sortByMinima(requestContext, seriesList):
  """
  Takes one metric or a wildcard seriesList.

  Sorts the list of metrics by the lowest value across the time period
  specified, including only series that have a maximum value greater than 0.

  Example:

  .. code-block:: none

    &target=sortByMinima(server*.instance*.memory.free)

  """
  newSeries = [series for series in seriesList if safe.safeMax(series, default=0) > 0]
  newSeries.sort(key=keyFunc(safe.safeMin))
  return newSeries


sortByMinima.group = 'Sorting'
sortByMinima.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


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
  newNames = []

  for series in seriesList:
    newname = re.sub(search, replace, series.name)
    if max(series) > value:
      newNames.append(newname)

  if not newNames:
    return []

  newContext = requestContext.copy()
  newContext['prefetched'] = {}
  newSeries = evaluateTarget(newContext, 'group(%s)' % ','.join(newNames))

  return [n for n in newSeries if n is not None and len(n) > 0]


useSeriesAbove.group = 'Filter Series'
useSeriesAbove.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('value', ParamTypes.float, required=True),
  Param('search', ParamTypes.string, required=True),
  Param('replace', ParamTypes.string, required=True),
]


def fallbackSeries(requestContext, seriesList, fallback):
    """
    Takes a wildcard seriesList, and a second fallback metric.
    If the wildcard does not match any series, draws the fallback metric.

    Example:

    .. code-block:: none

      &target=fallbackSeries(server*.requests_per_second, constantLine(0))

    Draws a 0 line when server metric does not exist.

    """
    if len(seriesList) > 0:
        return seriesList
    else:
        return fallback


fallbackSeries.group = 'Special'
fallbackSeries.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('fallback', ParamTypes.seriesList, required=True),
]


def mostDeviant(requestContext, seriesList, n):
  """
  Takes one metric or a wildcard seriesList followed by an integer N.
  Draws the N most deviant metrics.
  To find the deviants, the standard deviation (sigma) of each series
  is taken and ranked. The top N standard deviations are returned.

    Example:

  .. code-block:: none

    &target=mostDeviant(server*.instance*.memory.free, 5)

  Draws the 5 instances furthest from the average memory free.

  """

  deviants = []
  for series in seriesList:
    mean = safe.safeAvg(series)
    if mean is None: continue
    square_sum = sum([ (value - mean) ** 2 for value in series if value is not None ])
    sigma = safe.safeDiv(square_sum, safe.safeLen(series))
    if sigma is None: continue
    deviants.append( (sigma, series) )
  deviants.sort(key=keyFunc(lambda i: i[0]), reverse=True) #sort by sigma
  return [ series for (_, series) in deviants ][:n] #return the n most deviant series


mostDeviant.group = 'Filter Series'
mostDeviant.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('n', ParamTypes.integer, required=True),
]


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
    series.tags['stdev'] = points
    name = "stdev(%s,%d)" % (series.name, int(points))
    stdevSeries = series.copy(name=name, values=[])

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

      if validPoints > 0 and float(validPoints)/points >= windowTolerance:
        try:
          deviation = math.sqrt(validPoints * currentSumOfSquares - currentSum**2)/validPoints
        except ValueError:
          deviation = None
        stdevSeries.append(deviation)
      else:
        stdevSeries.append(None)

    seriesList[seriesIndex] = stdevSeries

  return seriesList


stdev.group = 'Calculate'
stdev.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('points', ParamTypes.integer, required=True),
  Param('windowTolerance', ParamTypes.float, default=0.1),
]


def secondYAxis(requestContext, seriesList):
  """
  Graph the series on the secondary Y axis.
  """
  for series in seriesList:
    series.options['secondYAxis'] = True
    series.tags['secondYAxis'] = 1
    series.name= 'secondYAxis(%s)' % series.name
  return seriesList


secondYAxis.group = 'Graph'
secondYAxis.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


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


def holtWintersAnalysis(series, seasonality='1d'):
  alpha = gamma = 0.1
  beta = 0.0035
  # season is currently one day
  seasonality_time = parseTimeOffset(seasonality)
  season_length = (seasonality_time.seconds + (seasonality_time.days * 86400)) // series.step
  intercept = 0
  slope = 0
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
  forecastTags = series.tags
  forecastTags['holtWintersForecast'] = 1
  forecastName = "holtWintersForecast(%s)" % series.name
  forecastSeries = TimeSeries(forecastName, series.start, series.end
    , series.step, predictions, tags=forecastTags, xFilesFactor=series.xFilesFactor)

  # make the new deviation series
  deviationTags = series.tags
  deviationTags['holtWintersDeviation'] = 1
  deviationName = "holtWintersDeviation(%s)" % series.name
  deviationSeries = TimeSeries(deviationName, series.start, series.end
          , series.step, deviations, tags=deviationTags, xFilesFactor=series.xFilesFactor)

  results = {
      'predictions': forecastSeries,
      'deviations' : deviationSeries,
      'intercepts' : intercepts,
      'slopes'     : slopes,
      'seasonals'  : seasonals,
  }
  return results


def holtWintersForecast(requestContext, seriesList, bootstrapInterval='7d', seasonality='1d'):
  """
  Performs a Holt-Winters forecast using the series as input data. Data from
  `bootstrapInterval` (one week by default) previous to the series is used to bootstrap the initial forecast.
  """
  bootstrap = parseTimeOffset(bootstrapInterval)
  previewSeconds = bootstrap.seconds + (bootstrap.days * 86400)

  # ignore original data and pull new, including our preview
  newContext = requestContext.copy()
  newContext['prefetch'] = {}
  newContext['startTime'] = requestContext['startTime'] -  timedelta(seconds=previewSeconds)
  previewList = evaluateTarget(newContext, requestContext['args'][0])
  results = []
  for series in previewList:
    analysis = holtWintersAnalysis(series, seasonality)
    predictions = analysis['predictions']
    windowPoints = previewSeconds // predictions.step
    series.tags['holtWintersForecast'] = 1
    forecastName = "holtWintersForecast(%s)" % series.name
    result = TimeSeries(forecastName, predictions.start + previewSeconds, predictions.end,
                        predictions.step, predictions[windowPoints:], tags=series.tags,
                        xFilesFactor=series.xFilesFactor)
    results.append(result)
  return results


holtWintersForecast.group = 'Calculate'
holtWintersForecast.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('bootstrapInterval', ParamTypes.interval, default='7d', suggestions=['7d', '30d']),
  Param('seasonality', ParamTypes.interval, default='1d', suggestions=['1d', '7d']),
]


def holtWintersConfidenceBands(requestContext, seriesList, delta=3, bootstrapInterval='7d', seasonality='1d'):
  """
  Performs a Holt-Winters forecast using the series as input data and plots
  upper and lower bands with the predicted forecast deviations.
  """
  bootstrap = parseTimeOffset(bootstrapInterval)
  previewSeconds = bootstrap.seconds + (bootstrap.days * 86400)

  # ignore original data and pull new, including our preview
  newContext = requestContext.copy()
  newContext['prefetch'] = {}
  newContext['startTime'] = requestContext['startTime'] -  timedelta(seconds=previewSeconds)
  previewList = evaluateTarget(newContext, requestContext['args'][0])
  results = []
  for series in previewList:
    analysis = holtWintersAnalysis(series, seasonality)
    data = analysis['predictions']
    windowPoints = previewSeconds // data.step
    forecast = TimeSeries(data.name, data.start + previewSeconds, data.end, data.step, data[windowPoints:], xFilesFactor=series.xFilesFactor)
    forecast.pathExpression = data.pathExpression

    data = analysis['deviations']
    windowPoints = previewSeconds // data.step
    deviation = TimeSeries(data.name, data.start + previewSeconds, data.end, data.step, data[windowPoints:], xFilesFactor=series.xFilesFactor)
    deviation.pathExpression = data.pathExpression

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

    upperTags = series.tags
    upperTags['holtWintersConfidenceUpper'] = 1
    upperName = "holtWintersConfidenceUpper(%s)" % series.name

    lowerTags = series.tags
    lowerTags['holtWintersConfidenceLower'] = 1
    lowerName = "holtWintersConfidenceLower(%s)" % series.name

    upperSeries = TimeSeries(upperName, forecast.start, forecast.end
            , forecast.step, upperBand, tags=upperTags, xFilesFactor=series.xFilesFactor)
    lowerSeries = TimeSeries(lowerName, forecast.start, forecast.end
            , forecast.step, lowerBand, tags=lowerTags, xFilesFactor=series.xFilesFactor)
    upperSeries.pathExpression = series.pathExpression
    lowerSeries.pathExpression = series.pathExpression
    results.append(lowerSeries)
    results.append(upperSeries)
  return results


holtWintersConfidenceBands.group = 'Calculate'
holtWintersConfidenceBands.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('delta', ParamTypes.integer, default=3),
  Param('bootstrapInterval', ParamTypes.interval, default='7d', suggestions=['7d', '30d']),
  Param('seasonality', ParamTypes.interval, default='1d', suggestions=['1d', '7d']),
]


def holtWintersAberration(requestContext, seriesList, delta=3, bootstrapInterval='7d', seasonality='1d'):
  """
  Performs a Holt-Winters forecast using the series as input data and plots the
  positive or negative deviation of the series data from the forecast.
  """
  results = []
  confidenceBands = holtWintersConfidenceBands(requestContext, seriesList, delta, bootstrapInterval, seasonality)
  confidenceBands = {s.name: s for s in confidenceBands}

  for series in seriesList:
    lowerBand = confidenceBands['holtWintersConfidenceLower(%s)' % series.name]
    upperBand = confidenceBands['holtWintersConfidenceUpper(%s)' % series.name]
    aberration = list()
    for i, actual in enumerate(series):
      if series[i] is None:
        aberration.append(0)
      elif upperBand[i] is not None and series[i] > upperBand[i]:
        aberration.append(series[i] - upperBand[i])
      elif lowerBand[i] is not None and series[i] < lowerBand[i]:
        aberration.append(series[i] - lowerBand[i])
      else:
        aberration.append(0)

    series.tags['holtWintersAberration'] = 1
    newName = "holtWintersAberration(%s)" % series.name
    results.append(TimeSeries(newName, series.start, series.end
            , series.step, aberration, tags=series.tags, xFilesFactor=series.xFilesFactor))
  return results


holtWintersAberration.group = 'Calculate'
holtWintersAberration.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('delta', ParamTypes.integer, default=3),
  Param('bootstrapInterval', ParamTypes.interval, default='7d', suggestions=['7d', '30d']),
  Param('seasonality', ParamTypes.interval, default='1d', suggestions=['1d', '7d']),
]


def holtWintersConfidenceArea(requestContext, seriesList, delta=3, bootstrapInterval='7d', seasonality='1d'):
  """
  Performs a Holt-Winters forecast using the series as input data and plots the
  area between the upper and lower bands of the predicted forecast deviations.
  """
  bands = holtWintersConfidenceBands(requestContext, seriesList, delta, bootstrapInterval, seasonality)
  results = areaBetween(requestContext, bands)
  for series in results:
    if 'areaBetween' in series.tags:
      del series.tags['areaBetween']
    series.tags['holtWintersConfidenceArea'] = 1
    series.name = series.name.replace('areaBetween', 'holtWintersConfidenceArea')
    series.pathExpression = series.name
  return results


holtWintersConfidenceArea.group = 'Calculate'
holtWintersConfidenceArea.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('delta', ParamTypes.integer, default=3),
  Param('bootstrapInterval', ParamTypes.interval, default='7d', suggestions=['7d', '30d']),
  Param('seasonality', ParamTypes.interval, default='1d', suggestions=['1d', '7d']),
]


def _linearRegressionAnalysis(series):
  """
  Returns factor and offset of linear regression function by least squares method.
  """
  n = safe.safeLen(series)
  sumI = sum([i for i,v in enumerate(series) if v is not None])
  sumV = sum([v for i,v in enumerate(series) if v is not None])
  sumII = sum([i*i for i,v in enumerate(series) if v is not None])
  sumIV = sum([i*v for i,v in enumerate(series) if v is not None])
  denominator = float(n*sumII - sumI*sumI)
  if denominator == 0:
    return None
  else:
    factor = (n * sumIV - sumI * sumV) / denominator / series.step
    offset = (sumII * sumV - sumIV * sumI) / denominator - factor * series.start
    return factor, offset


def linearRegression(requestContext, seriesList, startSourceAt=None, endSourceAt=None):
  """
  Graphs the linear regression function by least squares method.

  Takes one metric or a wildcard seriesList, followed by a quoted string with the
  time to start the line and another quoted string with the time to end the line.
  The start and end times are inclusive (default range is from to until). See
  ``from / until`` in the :doc:`Render API <render_api>` for examples of time formats. Datapoints
  in the range is used to regression.

  Example:

  .. code-block:: none

    &target=linearRegression(Server.instance01.threads.busy, '-1d')
    &target=linearRegression(Server.instance*.threads.busy, "00:00 20140101","11:59 20140630")
  """
  results = []
  sourceContext = requestContext.copy()
  sourceContext['prefetch'] = {}
  if startSourceAt is not None: sourceContext['startTime'] = parseATTime(startSourceAt)
  if endSourceAt is not None: sourceContext['endTime'] = parseATTime(endSourceAt)

  sourceList = evaluateTarget(sourceContext, requestContext['args'][0])

  for source,series in zip(sourceList, seriesList):
    series.tags['linearRegressions'] = '%s, %s' % (
      int(time.mktime(sourceContext['startTime'].timetuple())),
      int(time.mktime(sourceContext['endTime'].timetuple()))
    )
    newName = 'linearRegression(%s, %s, %s)' % (
      series.name,
      int(time.mktime(sourceContext['startTime'].timetuple())),
      int(time.mktime(sourceContext['endTime'].timetuple()))
    )
    forecast = _linearRegressionAnalysis(source)
    if forecast is None:
      continue
    factor, offset = forecast
    values = [ offset + (series.start + i * series.step) * factor for i in range(len(series)) ]
    newSeries = TimeSeries(newName, series.start, series.end, series.step, values, tags=series.tags, xFilesFactor=series.xFilesFactor)
    newSeries.pathExpression = newSeries.name
    results.append(newSeries)
  return results


linearRegression.group = 'Calculate'
linearRegression.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('startSourceAt', ParamTypes.date),
  Param('endSourceAt', ParamTypes.date),
]


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
    series.tags['drawAsInfinite'] = 1
    series.name = 'drawAsInfinite(%s)' % series.name
  return seriesList


drawAsInfinite.group = 'Graph'
drawAsInfinite.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


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


lineWidth.group = 'Graph'
lineWidth.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('width', ParamTypes.float, required=True),
]


def dashed(requestContext, seriesList, dashLength=5):
  """
  Takes one metric or a wildcard seriesList, followed by a float F.

  Draw the selected metrics with a dotted line with segments of length F
  If omitted, the default length of the segments is 5.0

  Example:

  .. code-block:: none

    &target=dashed(server01.instance01.memory.free,2.5)

  """
  for series in seriesList:
    series.tags['dashed'] = dashLength
    series.name = 'dashed(%s, %g)' % (series.name, dashLength)
    series.options['dashed'] = dashLength
  return seriesList


dashed.group = 'Graph'
dashed.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('dashLength', ParamTypes.integer, default=5),
]


def timeStack(requestContext, seriesList, timeShiftUnit='1d', timeShiftStart=0, timeShiftEnd=7):
  """
  Takes one metric or a wildcard seriesList, followed by a quoted string with the
  length of time (See ``from / until`` in the :doc:`Render API <render_api>` for examples of time formats).
  Also takes a start multiplier and end multiplier for the length of time

  create a seriesList which is composed the original metric series stacked with time shifts
  starting time shifts from the start multiplier through the end multiplier

  Useful for looking at history, or feeding into averageSeries or stddevSeries.

  Example:

  .. code-block:: none

    &target=timeStack(Sales.widgets.largeBlue,"1d",0,7)    # create a series for today and each of the previous 7 days

  """
  # Default to negative. parseTimeOffset defaults to +
  if timeShiftUnit[0].isdigit():
    timeShiftUnit = '-' + timeShiftUnit
  delta = parseTimeOffset(timeShiftUnit)

  if len(seriesList) < 1:
    return []
  series = seriesList[0]

  results = []
  timeShiftStartint = int(timeShiftStart)
  timeShiftEndint = int(timeShiftEnd)

  for shft in range(timeShiftStartint,timeShiftEndint):
    myContext = requestContext.copy()
    myContext['prefetch'] = {}
    innerDelta = delta * shft
    myContext['startTime'] = requestContext['startTime'] + innerDelta
    myContext['endTime'] = requestContext['endTime'] + innerDelta
    for shiftedSeries in evaluateTarget(myContext, requestContext['args'][0]):
      shiftedSeries.tags['timeShiftUnit'] = timeShiftUnit
      shiftedSeries.tags['timeShift'] = shft
      shiftedSeries.name = 'timeShift(%s, %s, %s)' % (shiftedSeries.name, timeShiftUnit,shft)
      shiftedSeries.pathExpression = shiftedSeries.name
      shiftedSeries.start = series.start
      shiftedSeries.end = series.end
      results.append(shiftedSeries)

  return results


timeStack.group = 'Transform'
timeStack.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('timeShiftUnit', ParamTypes.interval, default='1d', suggestions=['1h', '6h', '12h', '1d', '2d', '7d', '14d', '30d']),
  Param('timeShiftStart', ParamTypes.integer, default=0),
  Param('timeShiftEnd', ParamTypes.integer, default=7),
]


def timeShift(requestContext, seriesList, timeShift, resetEnd=True, alignDST=False):
  """
  Takes one metric or a wildcard seriesList, followed by a quoted string with the
  length of time (See ``from / until`` in the :doc:`Render API <render_api>` for examples of time formats).

  Draws the selected metrics shifted in time. If no sign is given, a minus sign ( - ) is
  implied which will shift the metric back in time. If a plus sign ( + ) is given, the
  metric will be shifted forward in time.

  Will reset the end date range automatically to the end of the base stat unless
  resetEnd is False. Example case is when you timeshift to last week and have the graph
  date range set to include a time in the future, will limit this timeshift to pretend
  ending at the current time. If resetEnd is False, will instead draw full range including
  future time.

  Because time is shifted by a fixed number of seconds, comparing a time period with DST to
  a time period without DST, and vice-versa, will result in an apparent misalignment. For
  example, 8am might be overlaid with 7am. To compensate for this, use the alignDST option.

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
  myContext['prefetch'] = {}
  myContext['startTime'] = requestContext['startTime'] + delta
  myContext['endTime'] = requestContext['endTime'] + delta

  if alignDST:
    def localDST(dt):
      return time.localtime(time.mktime(dt.timetuple())).tm_isdst

    reqStartDST = localDST(requestContext['startTime'])
    reqEndDST   = localDST(requestContext['endTime'])
    myStartDST  = localDST(myContext['startTime'])
    myEndDST    = localDST(myContext['endTime'])

    dstOffset = timedelta(hours=0)
    # If the requestContext is entirely in DST, and we are entirely NOT in DST
    if ((reqStartDST and reqEndDST) and (not myStartDST and not myEndDST)):
        dstOffset = timedelta(hours=1)
    # Or if the requestContext is entirely NOT in DST, and we are entirely in DST
    elif ((not reqStartDST and not reqEndDST) and (myStartDST and myEndDST)):
        dstOffset = timedelta(hours=-1)
    # Otherwise, we don't do anything, because it would be visually confusing
    myContext['startTime'] += dstOffset
    myContext['endTime'] += dstOffset

  results = []
  if len(seriesList) < 1:
    return []
  series = seriesList[0]

  for shiftedSeries in evaluateTarget(myContext, requestContext['args'][0]):
    shiftedSeries.tags['timeShift'] = timeShift
    shiftedSeries.name = 'timeShift(%s, "%s")' % (shiftedSeries.name, timeShift)
    if resetEnd:
      shiftedSeries.end = series.end
    else:
      shiftedSeries.end = shiftedSeries.end - shiftedSeries.start + series.start
    shiftedSeries.start = series.start
    results.append(shiftedSeries)

  return results


timeShift.group = 'Transform'
timeShift.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('timeShift', ParamTypes.interval, required=True, suggestions=['1h', '6h', '12h', '1d', '2d', '7d', '14d', '30d']),
  Param('resetEnd', ParamTypes.boolean, default=True),
  Param('alignDst', ParamTypes.boolean, default=False),
]


def timeSlice(requestContext, seriesList, startSliceAt, endSliceAt="now"):
  """
  Takes one metric or a wildcard metric, followed by a quoted string with the
  time to start the line and another quoted string with the time to end the line.
  The start and end times are inclusive. See ``from / until`` in the :doc:`Render API <render_api>`
  for examples of time formats.

  Useful for filtering out a part of a series of data from a wider range of
  data.

  Example:

  .. code-block:: none

    &target=timeSlice(network.core.port1,"00:00 20140101","11:59 20140630")
    &target=timeSlice(network.core.port1,"12:00 20140630","now")

  """

  results = []
  start = time.mktime(parseATTime(startSliceAt).timetuple())
  end = time.mktime(parseATTime(endSliceAt).timetuple())

  for slicedSeries in seriesList:
    slicedSeries.tags['timeSliceStart'] = int(start)
    slicedSeries.tags['timeSliceEnd'] = int(end)
    slicedSeries.name = 'timeSlice(%s, %s, %s)' % (slicedSeries.name, int(start), int(end))

    curr = time.mktime(requestContext["startTime"].timetuple())
    for i, v in enumerate(slicedSeries):
      if v is None or curr < start or curr > end:
        slicedSeries[i] = None
      curr += slicedSeries.step

    results.append(slicedSeries)

  return results


timeSlice.group = 'Transform'
timeSlice.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('startSliceAt', ParamTypes.date, required=True),
  Param('endSliceAt', ParamTypes.date, default='now'),
]


def constantLine(requestContext, value):
  """
  Takes a float F.

  Draws a horizontal line at value F across the graph.

  Example:

  .. code-block:: none

    &target=constantLine(123.456)

  """
  name = "constantLine(%s)" % str(value)
  start = int(epoch( requestContext['startTime'] ) )
  end = int(epoch( requestContext['endTime'] ) )
  step = int((end - start) / 2.0)
  series = TimeSeries(str(value), start, end, step, [value, value, value], xFilesFactor=requestContext.get('xFilesFactor'))
  series.pathExpression = name
  return [series]


constantLine.group = 'Special'
constantLine.params = [
  Param('value', ParamTypes.float, required=True),
]


def aggregateLine(requestContext, seriesList, func='average', keepStep=False):
  """
  Takes a metric or wildcard seriesList and draws a horizontal line
  based on the function applied to each series.

  If the optional keepStep parameter is set to True, the result will
  have the same time period and step as the source series.

  Note: By default, the graphite renderer consolidates data points by
  averaging data points over time. If you are using the 'min' or 'max'
  function for aggregateLine, this can cause an unusual gap in the
  line drawn by this function and the data itself. To fix this, you
  should use the consolidateBy() function with the same function
  argument you are using for aggregateLine. This will ensure that the
  proper data points are retained and the graph should line up
  correctly.

  Example:

  .. code-block:: none

    &target=aggregateLine(server01.connections.total, 'avg')
    &target=aggregateLine(server*.connections.total, 'avg')

  """
  aggFunc = getAggFunc(func)

  results = []
  for series in seriesList:
    value = aggFunc(series)
    if value is not None:
        name = 'aggregateLine(%s, %g)' % (series.name, value)
    else:
        name = 'aggregateLine(%s, None)' % (series.name)

    if keepStep:
      aggSeries = series.copy(name=name, values=[value] * len(series))
    else:
      [aggSeries] = constantLine(requestContext, value)
      aggSeries.name = name
      aggSeries.pathExpression = name

    results.append(aggSeries)
  return results


aggregateLine.group = 'Calculate'
aggregateLine.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('func', ParamTypes.aggFunc, default='average'),
  Param('keepStep', ParamTypes.boolean, default=False),
]


def verticalLine(requestContext, ts, label=None, color=None):
  """
  Takes a timestamp string ts.

  Draws a vertical line at the designated timestamp with optional
  'label' and 'color'. Supported timestamp formats include both
  relative (e.g. -3h) and absolute (e.g. 16:00_20110501) strings,
  such as those used with ``from`` and ``until`` parameters. When
  set, the 'label' will appear in the graph legend.

  Note: Any timestamps defined outside the requested range will
  raise a 'ValueError' exception.

  Example:

  .. code-block:: none

    &target=verticalLine("12:3420131108","event","blue")
    &target=verticalLine("16:00_20110501","event")
    &target=verticalLine("-5mins")

  """
  ts = int(timestamp( parseATTime(ts, requestContext['tzinfo']) ))
  start = int(timestamp( requestContext['startTime'] ))
  end = int(timestamp( requestContext['endTime'] ))
  if ts < start:
    raise InputParameterError("verticalLine(): timestamp %s exists before start of range" % ts)
  elif ts > end:
    raise InputParameterError("verticalLine(): timestamp %s exists after end of range" % ts)
  start = end = ts
  step = 1.0
  series = TimeSeries(label, start, end, step, [1.0, 1.0], xFilesFactor=requestContext.get('xFilesFactor'))
  series.options['drawAsInfinite'] = True
  if color:
    series.color = color
  return [series]


verticalLine.group = 'Graph'
verticalLine.params = [
  Param('ts', ParamTypes.date, required=True),
  Param('label', ParamTypes.string),
  Param('color', ParamTypes.string),
]


def threshold(requestContext, value, label=None, color=None):
  """
  Takes a float F, followed by a label (in double quotes) and a color.
  (See ``bgcolor`` in the :doc:`Render API <render_api>` for valid color names & formats.)

  Draws a horizontal line at value F across the graph.

  Example:

  .. code-block:: none

    &target=threshold(123.456, "omgwtfbbq", "red")

  """
  series = constantLine(requestContext, value)[0]
  if label:
    series.name = label
  if color:
    series.color = color
  return [series]


threshold.group = 'Graph'
threshold.params = [
  Param('value', ParamTypes.float, required=True),
  Param('label', ParamTypes.string),
  Param('color', ParamTypes.string),
]


def transformNull(requestContext, seriesList, default=0, referenceSeries=None):
  """
  Takes a metric or wildcard seriesList and replaces null values with the value
  specified by `default`.  The value 0 used if not specified.  The optional
  referenceSeries, if specified, is a metric or wildcard series list that governs
  which time intervals nulls should be replaced.  If specified, nulls are replaced
  only in intervals where a non-null is found for the same interval in any of
  referenceSeries.  This method compliments the drawNullAsZero function in
  graphical mode, but also works in text-only mode.

  Example:

  .. code-block:: none

    &target=transformNull(webapp.pages.*.views,-1)

  This would take any page that didn't have values and supply negative 1 as a default.
  Any other numeric value may be used as well.
  """
  def transform(v, d):
    if v is None: return d
    else: return v

  if referenceSeries:
    defaults = [default if any(v is not None for v in x) else None for x in izip_longest(*referenceSeries)]
  else:
    defaults = None

  for series in seriesList:
    series.tags['transformNull'] = default
    if referenceSeries:
      series.tags['referenceSeries'] = 1
    if referenceSeries:
      series.name = "transformNull(%s,%g,referenceSeries)" % (series.name, default)
    else:
      series.name = "transformNull(%s,%g)" % (series.name, default)
    series.pathExpression = series.name
    if defaults:
      values = [transform(v, d) for v, d in izip_longest(series, defaults)]
    else:
      values = [transform(v, default) for v in series]
    series.extend(values)
    del series[:len(values)]
  return seriesList


transformNull.group = 'Transform'
transformNull.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('default', ParamTypes.float, default=0),
  Param('referenceSeries', ParamTypes.seriesList),
]


def isNonNull(requestContext, seriesList):
  """
  Takes a metric or wildcard seriesList and counts up the number of non-null
  values.  This is useful for understanding the number of metrics that have data
  at a given point in time (i.e. to count which servers are alive).

  Example:

  .. code-block:: none

    &target=isNonNull(webapp.pages.*.views)

  Returns a seriesList where 1 is specified for non-null values, and
  0 is specified for null values.
  """

  def transform(v):
    if v is None: return 0
    else: return 1

  for series in seriesList:
    series.tags['isNonNull'] = 1
    series.name = "isNonNull(%s)" % (series.name)
    series.pathExpression = series.name
    values = [transform(v) for v in series]
    series.extend(values)
    del series[:len(values)]
  return seriesList


isNonNull.group = 'Transform'
isNonNull.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def identity(requestContext, name):
  """
  Identity function:
  Returns datapoints where the value equals the timestamp of the datapoint.
  Useful when you have another series where the value is a timestamp, and
  you want to compare it to the time of the datapoint, to render an age

  Example:

  .. code-block:: none

    &target=identity("The.time.series")

  This would create a series named "The.time.series" that contains points where
  x(t) == t.
  """
  step = 60
  start = int(epoch(requestContext["startTime"]))
  end = int(epoch(requestContext["endTime"]))
  values = list(range(start, end, step))
  series = TimeSeries(name, start, end, step, values, xFilesFactor=requestContext.get('xFilesFactor'))
  series.pathExpression = 'identity("%s")' % name

  return [series]


identity.group = 'Calculate'
identity.params = [
  Param('name', ParamTypes.string, required=True),
]


def countSeries(requestContext, *seriesLists):
  """
  Draws a horizontal line representing the number of nodes found in the seriesList.

  .. code-block:: none

    &target=countSeries(carbon.agents.*.*)

  """
  if seriesLists:
    (seriesList,start,end,step) = normalize(seriesLists)
    name = "countSeries(%s)" % formatPathExpressions(seriesList)
    values = ( int(len(row)) for row in izip_longest(*seriesList) )
    series = TimeSeries(name,start,end,step,values, xFilesFactor=requestContext.get('xFilesFactor'))
    series.pathExpression = name
  else:
    series = constantLine(requestContext, 0).pop()
    series.pathExpression = "countSeries()"

  return [series]


countSeries.group = 'Combine'
countSeries.params = [
  Param('seriesLists', ParamTypes.seriesList, multiple=True),
]
countSeries.aggregator = True


def group(requestContext, *seriesLists):
  """
  Takes an arbitrary number of seriesLists and adds them to a single seriesList. This is used
  to pass multiple seriesLists to a function which only takes one
  """
  seriesGroup = []
  for s in seriesLists:
    seriesGroup.extend(s)

  return seriesGroup


group.group = 'Combine'
group.params = [
  Param('seriesLists', ParamTypes.seriesList, multiple=True),
]


def mapSeries(requestContext, seriesList, *mapNodes):
  """
  Short form: ``map()``

  Takes a seriesList and maps it to a list of seriesList. Each seriesList has the
  given mapNodes in common.

  .. note:: This function is not very useful alone. It should be used with :py:func:`reduceSeries`

  .. code-block:: none

    mapSeries(servers.*.cpu.*,1) =>

      [
        servers.server1.cpu.*,
        servers.server2.cpu.*,
        ...
        servers.serverN.cpu.*
      ]

  Each node may be an integer referencing a node in the series name or a string identifying a tag.
  """
  metaSeries = {}
  keys = []
  for series in seriesList:
    key = aggKey(series, mapNodes)
    if key not in metaSeries:
      metaSeries[key] = [series]
      keys.append(key)
    else:
      metaSeries[key].append(series)
  return [ metaSeries[k] for k in keys ]


mapSeries.group = 'Combine'
mapSeries.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('mapNodes', ParamTypes.nodeOrTag, required=True, multiple=True),
]


def reduceSeries(requestContext, seriesLists, reduceFunction, reduceNode, *reduceMatchers):
  """
  Short form: ``reduce()``

  Takes a list of seriesLists and reduces it to a list of series by means of the reduceFunction.

  Reduction is performed by matching the reduceNode in each series against the list of
  reduceMatchers. Then each series is passed to the reduceFunction as arguments in the order
  given by reduceMatchers. The reduceFunction should yield a single series.

  The resulting list of series are aliased so that they can easily be nested in other functions.

  **Example**: Map/Reduce asPercent(bytes_used,total_bytes) for each server

  Assume that metrics in the form below exist:

  .. code-block:: none

       servers.server1.disk.bytes_used
       servers.server1.disk.total_bytes
       servers.server2.disk.bytes_used
       servers.server2.disk.total_bytes
       servers.server3.disk.bytes_used
       servers.server3.disk.total_bytes
       ...
       servers.serverN.disk.bytes_used
       servers.serverN.disk.total_bytes

  To get the percentage of disk used for each server:

  .. code-block:: none

      reduceSeries(mapSeries(servers.*.disk.*,1),"asPercent",3,"bytes_used","total_bytes") =>

        alias(asPercent(servers.server1.disk.bytes_used,servers.server1.disk.total_bytes),"servers.server1.disk.reduce.asPercent"),
        alias(asPercent(servers.server2.disk.bytes_used,servers.server2.disk.total_bytes),"servers.server2.disk.reduce.asPercent"),
        alias(asPercent(servers.server3.disk.bytes_used,servers.server3.disk.total_bytes),"servers.server3.disk.reduce.asPercent"),
        ...
        alias(asPercent(servers.serverN.disk.bytes_used,servers.serverN.disk.total_bytes),"servers.serverN.disk.reduce.asPercent")

  In other words, we will get back the following metrics::

      servers.server1.disk.reduce.asPercent
      servers.server2.disk.reduce.asPercent
      servers.server3.disk.reduce.asPercent
      ...
      servers.serverN.disk.reduce.asPercent

  .. seealso:: :py:func:`mapSeries`

  """
  metaSeries = {}
  keys = []
  for seriesList in seriesLists:
    for series in seriesList:
      nodes = series.name.split('.')
      node = nodes[reduceNode]
      reduceSeriesName = '.'.join(nodes[0:reduceNode]) + '.reduce.' + reduceFunction
      if node in reduceMatchers:
        if reduceSeriesName not in metaSeries:
          metaSeries[reduceSeriesName] = [None] * len(reduceMatchers)
          keys.append(reduceSeriesName)
        i = reduceMatchers.index(node)
        metaSeries[reduceSeriesName][i] = series
  for key in keys:
    metaSeries[key] = SeriesFunction(reduceFunction)(requestContext,*[[l] for l in metaSeries[key]])[0]
    metaSeries[key].name = key
  return [ metaSeries[key] for key in keys ]


reduceSeries.group = 'Combine'
reduceSeries.params = [
  Param('seriesLists', ParamTypes.seriesLists, required=True),
  Param('reduceFunction', ParamTypes.string, required=True),
  Param('reduceNode', ParamTypes.node, required=True),
  Param('reduceMatchers', ParamTypes.string, required=True, multiple=True),
]


def applyByNode(requestContext, seriesList, nodeNum, templateFunction, newName=None):
  """
  Takes a seriesList and applies some complicated function (described by a string), replacing templates with unique
  prefixes of keys from the seriesList (the key is all nodes up to the index given as `nodeNum`).

  If the `newName` parameter is provided, the name of the resulting series will be given by that parameter, with any
  "%" characters replaced by the unique prefix.

  Example:

  .. code-block:: none

    &target=applyByNode(servers.*.disk.bytes_free,1,"divideSeries(%.disk.bytes_free,sumSeries(%.disk.bytes_*))")

  Would find all series which match `servers.*.disk.bytes_free`, then trim them down to unique series up to the node
  given by nodeNum, then fill them into the template function provided (replacing % by the prefixes).

  Additional Examples:

  Given keys of

  - `stats.counts.haproxy.web.2XX`
  - `stats.counts.haproxy.web.3XX`
  - `stats.counts.haproxy.web.5XX`
  - `stats.counts.haproxy.microservice.2XX`
  - `stats.counts.haproxy.microservice.3XX`
  - `stats.counts.haproxy.microservice.5XX`

  The following will return the rate of 5XX's per service:

  .. code-block:: none

    applyByNode(stats.counts.haproxy.*.*XX, 3, "asPercent(%.5XX, sumSeries(%.*XX))", "%.pct_5XX")

  The output series would have keys `stats.counts.haproxy.web.pct_5XX` and `stats.counts.haproxy.microservice.pct_5XX`.
  """
  prefixes = set()
  for series in seriesList:
    prefix = '.'.join(series.name.split('.')[:nodeNum + 1])
    prefixes.add(prefix)
  results = []
  newContext = requestContext.copy()
  newContext['prefetch'] = {}
  for prefix in sorted(prefixes):
    for resultSeries in evaluateTarget(newContext, templateFunction.replace('%', prefix)):
      if newName:
        resultSeries.name = newName.replace('%', prefix)
      resultSeries.pathExpression = prefix
      resultSeries.start = series.start
      resultSeries.end = series.end
      results.append(resultSeries)
  return results


applyByNode.group = 'Combine'
applyByNode.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('nodeNum', ParamTypes.node, required=True),
  Param('templateFunction', ParamTypes.string, required=True),
  Param('newName', ParamTypes.string),
]


def groupByNode(requestContext, seriesList, nodeNum, callback='average'):
  """
  Takes a serieslist and maps a callback to subgroups within as defined by a common node

  .. code-block:: none

    &target=groupByNode(ganglia.by-function.*.*.cpu.load5,2,"sumSeries")

  Would return multiple series which are each the result of applying the "sumSeries" function
  to groups joined on the second node (0 indexed) resulting in a list of targets like

  .. code-block:: none

    sumSeries(ganglia.by-function.server1.*.cpu.load5),sumSeries(ganglia.by-function.server2.*.cpu.load5),...

  Node may be an integer referencing a node in the series name or a string identifying a tag.

  This is an alias for using :py:func:`groupByNodes <groupByNodes>` with a single node.
  """
  return groupByNodes(requestContext, seriesList, callback, nodeNum)


groupByNode.group = 'Combine'
groupByNode.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('nodeNum', ParamTypes.nodeOrTag, required=True),
  Param('callback', ParamTypes.aggOrSeriesFunc, default='average'),
]


def groupByNodes(requestContext, seriesList, callback, *nodes):
  """
  Takes a serieslist and maps a callback to subgroups within as defined by multiple nodes

  .. code-block:: none

    &target=groupByNodes(ganglia.server*.*.cpu.load*,"sum",1,4)

  Would return multiple series which are each the result of applying the "sum" aggregation
  to groups joined on the nodes' list (0 indexed) resulting in a list of targets like

  .. code-block:: none

    sumSeries(ganglia.server1.*.cpu.load5),sumSeries(ganglia.server1.*.cpu.load10),sumSeries(ganglia.server1.*.cpu.load15),sumSeries(ganglia.server2.*.cpu.load5),sumSeries(ganglia.server2.*.cpu.load10),sumSeries(ganglia.server2.*.cpu.load15),...

  This function can be used with all aggregation functions supported by
  :py:func:`aggregate <aggregate>`: ``average``, ``median``, ``sum``, ``min``, ``max``, ``diff``,
  ``stddev``, ``range`` & ``multiply``.

  Each node may be an integer referencing a node in the series name or a string identifying a tag.

  .. code-block:: none

    &target=seriesByTag("name=~cpu.load.*", "server=~server[1-9]+", "datacenter=~dc[1-9]+")|groupByNodes("average", "datacenter", 1)

    # will produce output series like
    # dc1.load5, dc2.load5, dc1.load10, dc2.load10

  This complements :py:func:`aggregateWithWildcards <aggregateWithWildcards>` which takes a list of wildcard nodes.
  """
  metaSeries = {}
  keys = []
  for series in seriesList:
    key = aggKey(series, nodes)
    if key not in metaSeries:
      metaSeries[key] = [series]
      keys.append(key)
    else:
      metaSeries[key].append(series)
  for key in metaSeries.keys():
    if callback in SeriesFunctions:
      metaSeries[key] = SeriesFunctions[callback](requestContext, metaSeries[key])[0]
    else:
      metaSeries[key] = aggregate(requestContext, metaSeries[key], callback)[0]
    metaSeries[key].name = key
  return [ metaSeries[key] for key in keys ]


groupByNodes.group = 'Combine'
groupByNodes.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('callback', ParamTypes.aggOrSeriesFunc, required=True),
  Param('nodes', ParamTypes.nodeOrTag, multiple=True),
]


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


exclude.group = 'Filter Series'
exclude.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('pattern', ParamTypes.string, required=True),
]


def grep(requestContext, seriesList, pattern):
  """
  Takes a metric or a wildcard seriesList, followed by a regular expression
  in double quotes.  Excludes metrics that don't match the regular expression.

  Example:

  .. code-block:: none

    &target=grep(servers*.instance*.threads.busy,"server02")
  """
  regex = re.compile(pattern)
  return [s for s in seriesList if regex.search(s.name)]


grep.group = 'Filter Series'
grep.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('pattern', ParamTypes.string, required=True),
]


def smartSummarize(requestContext, seriesList, intervalString, func='sum', alignTo=None):
  """
  Smarter version of summarize.

  The alignToFrom boolean parameter has been replaced by alignTo and no longer has any effect.
  Alignment can be to years, months, weeks, days, hours, and minutes.

  This function can be used with aggregation functions ``average``, ``median``, ``sum``, ``min``,
  ``max``, ``diff``, ``stddev``, ``count``, ``range``, ``multiply`` & ``last``.
  """
  if isinstance(alignTo, bool):
    log.info("Deprecated parameter 'alignToFrom' is being ignored.")
  else:
    # Adjust the start time aligning it according to interval unit
    if alignTo is not None:
      alignToUnit = getUnitString(alignTo)
      requestContext = requestContext.copy()
      requestContext['prefetch'] = {}
      s = requestContext['startTime']
      if alignToUnit == YEARS_STRING:
          requestContext['startTime'] = datetime(s.year, 1, 1, tzinfo = s.tzinfo)
      elif alignToUnit == MONTHS_STRING:
          requestContext['startTime'] = datetime(s.year, s.month, 1, tzinfo = s.tzinfo)
      elif alignToUnit == WEEKS_STRING:
          isoWeekDayToAlignTo = 1 if alignTo[-1].isalpha() else int(alignTo[-1])
          daysTosubtract = s.isoweekday() - isoWeekDayToAlignTo
          if daysTosubtract < 0: daysTosubtract += 7
          requestContext['startTime'] = datetime(s.year, s.month, s.day, tzinfo = s.tzinfo) - timedelta(days = daysTosubtract)
      elif alignToUnit == DAYS_STRING:
          requestContext['startTime'] = datetime(s.year, s.month, s.day, tzinfo = s.tzinfo)
      elif alignToUnit == HOURS_STRING:
          requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour, tzinfo = s.tzinfo)
      elif alignToUnit == MINUTES_STRING:
          requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour, s.minute, tzinfo = s.tzinfo)
      elif alignToUnit == SECONDS_STRING:
        requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour, s.minute, s.second, tzinfo = s.tzinfo)

      # Ignore the originally fetched data and pull new using the modified requestContext
      seriesList = evaluateTarget(requestContext, requestContext['args'][0])

  results = []
  delta = parseTimeOffset(intervalString)
  interval = delta.seconds + (delta.days * 86400)

  for series in seriesList:
    (newValues, alignedEnd) = _summarizeValues(series, func, interval)

    series.tags['smartSummarize'] = intervalString
    series.tags['smartSummarizeFunction'] = func
    newName = "smartSummarize(%s, \"%s\", \"%s\")" % (series.name, intervalString, func)
    newSeries = series.copy(name=newName, end=alignedEnd, step=interval, values=newValues)
    results.append(newSeries)

  return results


smartSummarize.group = 'Transform'
smartSummarize.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('intervalString', ParamTypes.interval, required=True, suggestions=['10min', '1h', '1d']),
  Param('func', ParamTypes.aggFunc, default='sum'),

  # the options True and False are only part of this list for backwards
  # compatibility and get ignored if specified
  Param('alignTo', ParamTypes.string, options=[None, YEARS_STRING, MONTHS_STRING, WEEKS_STRING, DAYS_STRING, HOURS_STRING, MINUTES_STRING, SECONDS_STRING, True, False]),
]


def summarize(requestContext, seriesList, intervalString, func='sum', alignToFrom=False):
  """
  Summarize the data into interval buckets of a certain size.

  By default, the contents of each interval bucket are summed together. This is
  useful for counters where each increment represents a discrete event and
  retrieving a "per X" value requires summing all the events in that interval.

  Specifying 'average' instead will return the mean for each bucket, which can be more
  useful when the value is a gauge that represents a certain value in time.

  This function can be used with aggregation functions ``average``, ``median``, ``sum``, ``min``,
  ``max``, ``diff``, ``stddev``, ``count``, ``range``, ``multiply`` & ``last``.

  By default, buckets are calculated by rounding to the nearest interval. This
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
    if alignToFrom:
      newStart = series.start
      newEnd = series.end
    else:
      newStart = series.start - (series.start % interval)
      newEnd = series.end - (series.end % interval) + interval

    (newValues, alignedEnd) = _summarizeValues(series, func, interval, newStart, newEnd)

    if alignToFrom:
      newEnd = alignedEnd

    series.tags['summarize'] = intervalString
    series.tags['summarizeFunction'] = func
    newName = "summarize(%s, \"%s\", \"%s\"%s)" % (series.name, intervalString, func, alignToFrom and ", true" or "")
    newSeries = series.copy(name=newName, start=newStart, end=newEnd, step=interval, values=newValues)
    results.append(newSeries)

  return results


summarize.group = 'Transform'
summarize.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('intervalString', ParamTypes.interval, required=True, suggestions=['10min', '1h', '1d']),
  Param('func', ParamTypes.aggFunc, default='sum'),
  Param('alignToFrom', ParamTypes.boolean, default=False),
]


def _summarizeValues(series, func, interval, newStart=None, newEnd=None):
  if newStart is None:
    newStart = series.start
  if newEnd is None:
    newEnd = series.end

  aggFunc = getAggFunc(func)

  timestamps = list(range( int(series.start), int(series.end), int(series.step)))
  datapoints = list(series)
  intervalPoints = interval / series.step

  i = 0
  numPoints = min(len(timestamps), len(datapoints))

  newValues = []
  timestamp_ = newStart
  while timestamp_ < newEnd:
    s = i
    nonNull = 0

    while i < numPoints and timestamps[i] < timestamp_ + interval:
      if timestamps[i] <= timestamp_:
        s = i
      if timestamps[i] >= timestamp_ and datapoints[i] is not None:
        nonNull += 1
      i += 1

    if xff(nonNull, intervalPoints, series.xFilesFactor):
      newValues.append(aggFunc(datapoints[s:i]))
    else:
      newValues.append(None)

    timestamp_ += interval

  return (newValues, timestamp_)


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
    requestContext['prefetch'] = {}
    s = requestContext['startTime']
    if interval >= DAY:
      requestContext['startTime'] = datetime(s.year, s.month, s.day, tzinfo = s.tzinfo)
    elif interval >= HOUR:
      requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour, tzinfo = s.tzinfo)
    elif interval >= MINUTE:
      requestContext['startTime'] = datetime(s.year, s.month, s.day, s.hour, s.minute, tzinfo = s.tzinfo)

    # Ignore the originally fetched data and pull new using
    # the modified requestContext.
    seriesList = evaluateTarget(requestContext, requestContext['args'][0])
    for series in seriesList:
      intervalCount = int((series.end - series.start) // interval)
      series.end = series.start + (intervalCount * interval) + interval

  for series in seriesList:
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

    series.tags['hitcount'] = intervalString
    newName = 'hitcount(%s, "%s"%s)' % (series.name, intervalString, alignToInterval and ", true" or "")
    newSeries = series.copy(name=newName, start=newStart, step=interval, values=newValues)
    results.append(newSeries)

  return results


hitcount.group = 'Transform'
hitcount.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('intervalString', ParamTypes.interval, required=True, suggestions=['10min', '1h', '1d']),
  Param('alignToInterval', ParamTypes.boolean, default=False),
]


def timeFunction(requestContext, name, step=60):
  """
  Short Alias: time()

  Just returns the timestamp for each X value. T

  Example:

  .. code-block:: none

    &target=time("The.time.series")

  This would create a series named "The.time.series" that contains in Y the same
  value (in seconds) as X.
  Accepts optional second argument as 'step' parameter (default step is 60 sec)

  """
  # TODO: align both startTime and endTime when creating the TimeSeries.
  delta = timedelta(seconds=step)
  when = requestContext["startTime"]
  values = []

  while when < requestContext["endTime"]:
    values.append(time.mktime(when.timetuple()))
    when += delta

  series = TimeSeries(name,
            int(time.mktime(requestContext["startTime"].timetuple())),
            int(time.mktime(requestContext["endTime"].timetuple())),
            step, values, xFilesFactor=requestContext.get('xFilesFactor'))

  return [series]


timeFunction.group = 'Transform'
timeFunction.params = [
  Param('name', ParamTypes.string, required=True),
  Param('step', ParamTypes.integer, default=60),
]


def sinFunction(requestContext, name, amplitude=1, step=60):
  """
  Short Alias: sin()

  Just returns the sine of the current time. The optional amplitude parameter
  changes the amplitude of the wave.

  Example:

  .. code-block:: none

    &target=sin("The.time.series", 2)

  This would create a series named "The.time.series" that contains sin(x)*2.
  Accepts optional second argument as 'amplitude' parameter (default amplitude is 1)
  Accepts optional third argument as 'step' parameter (default step is 60 sec)
  """
  delta = timedelta(seconds=step)
  when = requestContext["startTime"]
  values = []

  while when < requestContext["endTime"]:
    values.append(math.sin(time.mktime(when.timetuple()))*amplitude)
    when += delta

  return [TimeSeries(name,
            int(epoch(requestContext["startTime"])),
            int(epoch(requestContext["endTime"])),
            step, values, xFilesFactor=requestContext.get('xFilesFactor'))]


sinFunction.group = 'Transform'
sinFunction.params = [
  Param('name', ParamTypes.string, required=True),
  Param('amplitude', ParamTypes.integer, default=1),
  Param('step', ParamTypes.integer, default=60),
]


def removeEmptySeries(requestContext, seriesList, xFilesFactor=None):
  """
  Takes one metric or a wildcard seriesList.
  Out of all metrics passed, draws only the metrics with not empty data

  Example:

  .. code-block:: none

    &target=removeEmptySeries(server*.instance*.threads.busy)

  Draws only live servers with not empty data.

  `xFilesFactor` follows the same semantics as in Whisper storage schemas.  Setting it to 0 (the
  default) means that only a single value in the series needs to be non-null for it to be
  considered non-empty, setting it to 1 means that all values in the series must be non-null.
  A setting of 0.5 means that at least half the values in the series must be non-null.
  """
  xFilesFactor = xFilesFactor if xFilesFactor is not None else 0
  return [ series for series in seriesList if xffValues(series, xFilesFactor) ]


removeEmptySeries.group = 'Filter Series'
removeEmptySeries.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('xFilesFactor', ParamTypes.float),
]


def unique(requestContext, *seriesLists):
  """
  Takes an arbitrary number of seriesLists and returns unique series, filtered by name.

  Example:

  .. code-block:: none

    &target=unique(mostDeviant(server.*.disk_free,5),lowestCurrent(server.*.disk_free,5))

  Draws servers with low disk space, and servers with highly deviant disk space, but never the same series twice.

  """
  newList = []
  seenNames = set()
  for seriesList in seriesLists:
    for series in seriesList:
      if series.name not in seenNames:
        seenNames.add(series.name)
        newList.append(series)
  return newList


unique.group = 'Filter Series'
unique.params = [
  Param('seriesLists', ParamTypes.seriesList, required=True, multiple=True),
]


def randomWalkFunction(requestContext, name, step=60):
  """
  Short Alias: randomWalk()

  Returns a random walk starting at 0. This is great for testing when there is
  no real data in whisper.

  Example:

  .. code-block:: none

    &target=randomWalk("The.time.series")

  This would create a series named "The.time.series" that contains points where
  x(t) == x(t-1)+random()-0.5, and x(0) == 0.
  Accepts optional second argument as 'step' parameter (default step is 60 sec)
  """
  delta = timedelta(seconds=step)
  when = requestContext["startTime"]
  values = []
  current = 0
  while when < requestContext["endTime"]:
    values.append(current)
    current += random.random() - 0.5
    when += delta

  return [TimeSeries(name,
            int(epoch(requestContext["startTime"])),
            int(epoch(requestContext["endTime"])),
            step, values, xFilesFactor=requestContext.get('xFilesFactor'))]


randomWalkFunction.group = 'Special'
randomWalkFunction.params = [
  Param('name', ParamTypes.string, required=True),
  Param('step', ParamTypes.integer, default=60),
]


def seriesByTag(requestContext, *tagExpressions):
  """
  Returns a SeriesList of series matching all the specified tag expressions.

  Example:

  .. code-block:: none

    &target=seriesByTag("tag1=value1","tag2!=value2")

  Returns a seriesList of all series that have tag1 set to value1, AND do not have tag2 set to value2.

  Tags specifiers are strings, and may have the following formats:

  .. code-block:: none

    tag=spec    tag value exactly matches spec
    tag!=spec   tag value does not exactly match spec
    tag=~value  tag value matches the regular expression spec
    tag!=~spec  tag value does not match the regular expression spec

  Any tag spec that matches an empty value is considered to match series that don't have that tag.

  At least one tag spec must require a non-empty value.

  Regular expression conditions are treated as being anchored at the start of the value.

  See :ref:`querying tagged series <querying-tagged-series>` for more detail.
  """
  # the handling of seriesByTag is implemented in STORE.fetch


seriesByTag.group = 'Special'
seriesByTag.params = [
  Param('tagExpressions', ParamTypes.string, required=True, multiple=True),
]


def groupByTags(requestContext, seriesList, callback, *tags):
  """
  Takes a serieslist and maps a callback to subgroups within as defined by multiple tags

  .. code-block:: none

    &target=seriesByTag("name=cpu")|groupByTags("average","dc")

  Would return multiple series which are each the result of applying the "averageSeries" function
  to groups joined on the specified tags resulting in a list of targets like

  .. code-block :: none

    averageSeries(seriesByTag("name=cpu","dc=dc1")),averageSeries(seriesByTag("name=cpu","dc=dc2")),...

  This function can be used with all aggregation functions supported by
  :py:func:`aggregate <aggregate>`: ``average`` (or ``avg``), ``avg_zero``,
  ``median``, ``sum`` (or ``total``), ``min``, ``max``, ``diff``, ``stddev``, ``count``,
  ``range`` (or ``rangeOf``) , ``multiply`` & ``last`` (or ``current``).
  """
  if STORE.tagdb is None:
    log.info('groupByTags called but no TagDB configured')
    return []

  if not tags:
    raise InputParameterError("groupByTags(): no tags specified")

  # if all series have the same "name" tag use that for results, otherwise use the callback
  # if we're grouping by name, then the name is always used (see below)
  if 'name' not in tags:
    names = set([series.tags['name'] for series in seriesList])
    name = list(names)[0] if len(names) == 1 else callback

  keys = []
  metaSeries = {}
  for series in seriesList:
    # key is the metric path for the new series
    if 'name' not in tags:
      key = ';'.join([name] + sorted([tag + '=' + series.tags.get(tag, '') for tag in tags]))
    else:
      key = ';'.join([series.tags['name']] + sorted([tag + '=' + series.tags.get(tag, '') for tag in tags if tag != 'name']))

    if key not in metaSeries:
      metaSeries[key] = [series]
      keys.append(key)
    else:
      metaSeries[key].append(series)

  for key in keys:
    if callback in SeriesFunctions:
      metaSeries[key] = SeriesFunctions[callback](requestContext, metaSeries[key])[0]
    else:
      metaSeries[key] = aggregate(requestContext, metaSeries[key], callback)[0]
    metaSeries[key].name = key
    metaSeries[key].pathExpression = key
    metaSeries[key].tags = STORE.tagdb.parse(key).tags

  return [metaSeries[key] for key in keys]


groupByTags.group = 'Combine'
groupByTags.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('callback', ParamTypes.aggOrSeriesFunc, required=True),
  Param('tags', ParamTypes.tag, required=True, multiple=True),
]


def aliasByTags(requestContext, seriesList, *tags):
  """
  Takes a seriesList and applies an alias derived from one or more tags and/or nodes

  .. code-block:: none

    &target=seriesByTag("name=cpu")|aliasByTags("server","name")

  This is an alias for :py:func:`aliasByNode <aliasByNode>`.
  """
  return aliasByNode(requestContext, seriesList, *tags)


aliasByTags.group = 'Alias'
aliasByTags.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
  Param('tags', ParamTypes.nodeOrTag, required=True, multiple=True),
]


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
  step = 1
  name = "events(\"" + "\", \"".join(tags) + "\")"
  if tags == ("*",):
    tags = None

  start_timestamp = epoch(requestContext["startTime"])
  start_timestamp = start_timestamp - start_timestamp % step
  end_timestamp = epoch(requestContext["endTime"])
  end_timestamp = end_timestamp - end_timestamp % step
  points = (end_timestamp - start_timestamp) // step

  events = models.Event.find_events(epoch_to_dt(start_timestamp),
                                    epoch_to_dt(end_timestamp),
                                    tags=tags)

  values = [None] * points
  for event in events:
    event_timestamp = epoch(event.when)
    value_offset = (event_timestamp - start_timestamp) // step

    if values[value_offset] is None:
      values[value_offset] = 1
    else:
      values[value_offset] += 1

  result_series = TimeSeries(name, start_timestamp, end_timestamp, step, values, 'sum', xFilesFactor=requestContext.get('xFilesFactor'))
  return [result_series]


events.group = 'Special'
events.params = [
  Param('tags', ParamTypes.string, required=True, multiple=True),
]


def minMax(requestContext, seriesList):
  """
  Applies the popular min max normalization technique, which takes
  each point and applies the following normalization transformation
  to it: normalized = (point - min) / (max - min).

  Example:

  .. code-block:: none

    &target=minMax(Server.instance01.threads.busy)

  """

  for series in seriesList:
    series.name = "minMax(%s)" % (series.name)
    series.pathExpression = series.name
    min_val = safe.safeMin(series, default=0.0)
    max_val = safe.safeMax(series, default=0.0)
    for i, val in enumerate(series):
      if series[i] is not None:
        try:
          series[i] = float(val - min_val) / (max_val - min_val)
        except ZeroDivisionError:
          series[i] = 0.0
  return seriesList


minMax.group = 'Transform'
minMax.params = [
  Param('seriesList', ParamTypes.seriesList, required=True),
]


def pieAverage(requestContext, series):
  """Return the average"""
  return safe.safeDiv(safe.safeSum(series), safe.safeLen(series))


pieAverage.group = 'Pie'
pieAverage.params = [
  Param('series', ParamTypes.series, required=True),
]


def pieMaximum(requestContext, series):
  """Return the maximum"""
  return safe.safeMax(series)


pieMaximum.group = 'Pie'
pieMaximum.params = [
  Param('series', ParamTypes.series, required=True),
]


def pieMinimum(requestContext, series):
  """Return the minimum"""
  return safe.safeMin(series)


pieMinimum.group = 'Pie'
pieMinimum.params = [
  Param('series', ParamTypes.series, required=True),
]

PieFunctions = {
  'average': pieAverage,
  'maximum': pieMaximum,
  'minimum': pieMinimum,
}

SeriesFunctions = {
  # Combine functions
  'aggregate': aggregate,
  'aggregateSeriesLists': aggregateSeriesLists,
  'aggregateWithWildcards': aggregateWithWildcards,
  'applyByNode': applyByNode,
  'asPercent': asPercent,
  'averageSeries': averageSeries,
  'averageSeriesWithWildcards': averageSeriesWithWildcards,
  'avg': averageSeries,
  'countSeries': countSeries,
  'diffSeries': diffSeries,
  'diffSeriesLists': diffSeriesLists,
  'divideSeries': divideSeries,
  'divideSeriesLists': divideSeriesLists,
  'group': group,
  'groupByNode': groupByNode,
  'groupByNodes' : groupByNodes,
  'groupByTags': groupByTags,
  'isNonNull': isNonNull,
  'map': mapSeries,
  'mapSeries': mapSeries,
  'maxSeries': maxSeries,
  'minSeries': minSeries,
  'multiplySeries': multiplySeries,
  'multiplySeriesLists': multiplySeriesLists,
  'multiplySeriesWithWildcards': multiplySeriesWithWildcards,
  'pct': asPercent,
  'percentileOfSeries': percentileOfSeries,
  'rangeOfSeries': rangeOfSeries,
  'reduce': reduceSeries,
  'reduceSeries': reduceSeries,
  'stddevSeries': stddevSeries,
  'sum': sumSeries,
  'sumSeries': sumSeries,
  'sumSeriesLists': sumSeriesLists,
  'sumSeriesWithWildcards': sumSeriesWithWildcards,
  'weightedAverage': weightedAverage,

  # Transform functions
  'add': add,
  'absolute': absolute,
  'delay': delay,
  'derivative': derivative,
  'exp': exp,
  'hitcount': hitcount,
  'integral': integral,
  'integralByInterval' : integralByInterval,
  'interpolate': interpolate,
  'invert': invert,
  'keepLastValue': keepLastValue,
  'log': logarithm,
  'logit': logit,
  'minMax': minMax,
  'nonNegativeDerivative': nonNegativeDerivative,
  'offset': offset,
  'offsetToZero': offsetToZero,
  'perSecond': perSecond,
  'pow': pow,
  'powSeries': powSeries,
  'round': roundFunction,
  'scale': scale,
  'scaleToSeconds': scaleToSeconds,
  'sigmoid': sigmoid,
  'smartSummarize': smartSummarize,
  'squareRoot': squareRoot,
  'summarize': summarize,
  'timeShift': timeShift,
  'timeSlice': timeSlice,
  'timeStack': timeStack,
  'transformNull': transformNull,

  # Calculate functions
  'aggregateLine': aggregateLine,
  'exponentialMovingAverage': exponentialMovingAverage,
  'holtWintersAberration': holtWintersAberration,
  'holtWintersConfidenceArea': holtWintersConfidenceArea,
  'holtWintersConfidenceBands': holtWintersConfidenceBands,
  'holtWintersForecast': holtWintersForecast,
  'linearRegression': linearRegression,
  'movingAverage': movingAverage,
  'movingMax': movingMax,
  'movingMedian': movingMedian,
  'movingMin': movingMin,
  'movingSum': movingSum,
  'movingWindow': movingWindow,
  'nPercentile': nPercentile,
  'stdev': stdev,

  # Series Filter functions
  'averageAbove': averageAbove,
  'averageBelow': averageBelow,
  'averageOutsidePercentile': averageOutsidePercentile,
  'currentAbove': currentAbove,
  'currentBelow': currentBelow,
  'exclude': exclude,
  'filterSeries': filterSeries,
  'grep': grep,
  'highest': highest,
  'highestAverage': highestAverage,
  'highestCurrent': highestCurrent,
  'highestMax': highestMax,
  'limit': limit,
  'lowest': lowest,
  'lowestAverage': lowestAverage,
  'lowestCurrent': lowestCurrent,
  'maximumAbove': maximumAbove,
  'maximumBelow': maximumBelow,
  'minimumAbove': minimumAbove,
  'minimumBelow': minimumBelow,
  'mostDeviant': mostDeviant,
  'removeBetweenPercentile': removeBetweenPercentile,
  'removeEmptySeries': removeEmptySeries,
  'unique': unique,
  'useSeriesAbove': useSeriesAbove,

  # Data Filter functions
  'removeAbovePercentile': removeAbovePercentile,
  'removeAboveValue': removeAboveValue,
  'removeBelowPercentile': removeBelowPercentile,
  'removeBelowValue': removeBelowValue,

  # Sorting functions
  'sortBy': sortBy,
  'sortByMaxima': sortByMaxima,
  'sortByMinima': sortByMinima,
  'sortByName': sortByName,
  'sortByTotal': sortByTotal,

  # Alias functions
  'alias': alias,
  'aliasByMetric': aliasByMetric,
  'aliasByNode': aliasByNode,
  'aliasByTags': aliasByTags,
  'aliasQuery': aliasQuery,
  'aliasSub': aliasSub,
  'legendValue': legendValue,

  # Graph functions
  'alpha': alpha,
  'areaBetween': areaBetween,
  'color': color,
  'dashed': dashed,
  'drawAsInfinite': drawAsInfinite,
  'lineWidth': lineWidth,
  'secondYAxis': secondYAxis,
  'stacked': stacked,
  'threshold': threshold,
  'verticalLine' : verticalLine,

  # Special functions
  'cactiStyle': cactiStyle,
  'changed': changed,
  'consolidateBy': consolidateBy,
  'constantLine': constantLine,
  'events': events,
  'cumulative': cumulative,
  'fallbackSeries': fallbackSeries,
  'identity': identity,
  "randomWalk": randomWalkFunction,
  "randomWalkFunction": randomWalkFunction,
  'setXFilesFactor': setXFilesFactor,
  "sin": sinFunction,
  "sinFunction": sinFunction,
  'seriesByTag': seriesByTag,
  'substr': substr,
  'time': timeFunction,
  'timeFunction': timeFunction,
  'xFilesFactor': setXFilesFactor,
}


ParamTypes.aggOrSeriesFunc.setSeriesFuncs(SeriesFunctions)
