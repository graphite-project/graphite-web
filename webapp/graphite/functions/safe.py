# make / work consistently between python 2.x and 3.x
# https://www.python.org/dev/peps/pep-0238/
from __future__ import division
from functools import reduce
import math


def safeSum(values):
    safeValues = [v for v in values if v is not None]
    if safeValues:
        return sum(safeValues)


def safeDiff(values):
    safeValues = [v for v in values if v is not None]
    if safeValues:
        values = list(map(lambda x: x*-1, safeValues[1:]))
        values.insert(0, safeValues[0])
        return sum(values)


def safeLen(values):
    return len([v for v in values if v is not None])


def safeDiv(a, b):
    if a is None: return None
    if b in (0,None): return None
    return a / b


def safeExp(a):
    try:
        return math.exp(a)
    except TypeError:
        return None


def safePow(a, b):
    if a is None or b is None:
        return None
    try:
        result = math.pow(a, b)
    except (ValueError, OverflowError):
        return None
    return result


def safeMul(*factors):
    if None in factors:
        return None

    factors = [float(x) for x in factors]
    product = reduce(lambda x,y: x*y, factors)
    return product


def safeSubtract(a,b):
    if a is None or b is None:
        return None
    return float(a) - float(b)


def safeAvg(values):
    safeValues = [v for v in values if v is not None]
    if safeValues:
        return sum(safeValues) / len(safeValues)


def safeAvgZero(values):
    if values:
        return sum([0 if v is None else v for v in values]) / len(values)


def safeMedian(values):
    safeValues = [v for v in values if v is not None]
    if safeValues:
        sortedVals = sorted(safeValues)
        mid = len(sortedVals) // 2
        if len(sortedVals) % 2 == 0:
            return float(sortedVals[mid-1] + sortedVals[mid]) / 2
        else:
            return sortedVals[mid]


def safeStdDev(a):
    sm = safeSum(a)
    ln = safeLen(a)
    avg = safeDiv(sm,ln)
    if avg is None:
        return None
    sum = 0
    safeValues = [v for v in a if v is not None]
    for val in safeValues:
        sum = sum + (val - avg) * (val - avg)
    return math.sqrt(sum/ln)


def safeLast(values):
    for v in reversed(values):
        if v is not None: return v


def safeMin(values, default=None):
    safeValues = [v for v in values if v is not None]
    if safeValues:
        return min(safeValues)
    else:
        return default


def safeMax(values, default=None):
    safeValues = [v for v in values if v is not None]
    if safeValues:
        return max(safeValues)
    else:
        return default


def safeMap(function, values):
    safeValues = [v for v in values if v is not None]
    if safeValues:
        return [function(x) for x in safeValues]


def safeAbs(value):
    if value is None:
        return None
    return abs(value)
