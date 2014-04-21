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

import math
import sys
from datetime import datetime, timedelta

INFINITY = float('inf')

# Set a flag to indicate whether the '%l' option can be used safely.
# On Windows, in particular the %l option in strftime is not supported.
#(It is not one of the documented Python formatters).
try:
    datetime.now().strftime("%a %l%p")
    percent_l_supported = True
except ValueError:
    e = sys.exc_info()[1]
    percent_l_supported = False

UnitSystems = {
  'binary': (
    ('Pi', 1024.0**5),
    ('Ti', 1024.0**4),
    ('Gi', 1024.0**3),
    ('Mi', 1024.0**2),
    ('Ki', 1024.0   )),
  'si': (
    ('P', 1000.0**5),
    ('T', 1000.0**4),
    ('G', 1000.0**3),
    ('M', 1000.0**2),
    ('K', 1000.0   )),
  'none' : [],
}


#Convience functions
def closest(number,neighbors):
  distance = None
  closestNeighbor = None
  for neighbor in neighbors:
    d = abs(neighbor - number)
    if distance is None or d < distance:
      distance = d
      closestNeighbor = neighbor
  return closestNeighbor


def frange(start,end,step):
  f = start
  while f <= end:
    yield f
    f += step
    # Protect against rounding errors on very small float ranges
    if f == start:
      yield end
      return


def toSeconds(t):
  return (t.days * 86400) + t.seconds


def safeMin(args):
  args = [arg for arg in args if arg not in (None, INFINITY)]
  if args:
    return min(args)


def safeMax(args):
  args = [arg for arg in args if arg not in (None, INFINITY)]
  if args:
    return max(args)


def safeSum(values):
  return sum([v for v in values if v not in (None, INFINITY)])


def any(args):
  for arg in args:
    if arg:
      return True
  return False


def sort_stacked(series_list):
  stacked = [s for s in series_list if 'stacked' in s.options]
  not_stacked = [s for s in series_list if 'stacked' not in s.options]
  return stacked + not_stacked

def format_units(v, step=None, system="si"):
  """Format the given value in standardized units.

  ``system`` is either 'binary' or 'si'

  For more info, see:
    http://en.wikipedia.org/wiki/SI_prefix
    http://en.wikipedia.org/wiki/Binary_prefix
  """

  if step is None:
    condition = lambda size: abs(v) >= size
  else:
    condition = lambda size: abs(v) >= size and step >= size

  for prefix, size in UnitSystems[system]:
    if condition(size):
      v2 = v / size
      if (v2 - math.floor(v2)) < 0.00000000001 and v > 1:
        v2 = math.floor(v2)
      return v2, prefix

  if (v - math.floor(v)) < 0.00000000001 and v > 1 :
    v = math.floor(v)
  return v, ""


def find_x_times(start_dt, unit, step):
  if unit == SEC:
    dt = start_dt.replace(second=start_dt.second - (start_dt.second % step))
    x_delta = timedelta(seconds=step)

  elif unit == MIN:
    dt = start_dt.replace(second=0, minute=start_dt.minute - (start_dt.minute % step))
    x_delta = timedelta(minutes=step)

  elif unit == HOUR:
    dt = start_dt.replace(second=0, minute=0, hour=start_dt.hour - (start_dt.hour % step))
    x_delta = timedelta(hours=step)

  elif unit == DAY:
    dt = start_dt.replace(second=0, minute=0, hour=0)
    x_delta = timedelta(days=step)

  else:
    raise ValueError("Invalid unit: %s" % unit)

  while dt < start_dt:
    dt += x_delta

  return (dt, x_delta)


def logrange(base, scale_min, scale_max):
  current = scale_min
  if scale_min > 0:
      current = math.floor(math.log(scale_min, base))
  factor = current
  while current < scale_max:
     current = math.pow(base, factor)
     yield current
     factor += 1
