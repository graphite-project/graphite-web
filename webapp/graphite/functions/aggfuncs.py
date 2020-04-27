from graphite.errors import InputParameterError
from graphite.functions import safe


aggFuncs = {
  'average': safe.safeAvg,
  'avg_zero': safe.safeAvgZero,
  'median': safe.safeMedian,
  'sum': safe.safeSum,
  'min': safe.safeMin,
  'max': safe.safeMax,
  'diff': safe.safeDiff,
  'stddev': safe.safeStdDev,
  'count': safe.safeLen,
  'range': lambda row: safe.safeSubtract(safe.safeMax(row), safe.safeMin(row)),
  'multiply': lambda row: safe.safeMul(*row),
  'last': safe.safeLast,
}


aggFuncAliases = {
  'rangeOf': aggFuncs['range'],
  'avg': aggFuncs['average'],
  'total': aggFuncs['sum'],
  'current': aggFuncs['last'],
}


def getAggFunc(func, rawFunc=None):
    if func in aggFuncs:
        return aggFuncs[func]
    if func in aggFuncAliases:
        return aggFuncAliases[func]
    raise InputParameterError('Unsupported aggregation function: %s' % (rawFunc or func))
