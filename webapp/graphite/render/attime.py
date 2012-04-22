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

from datetime import datetime,timedelta
from time import daylight
from django.conf import settings

try: # See if there is a system installation of pytz first
  import pytz
except ImportError: # Otherwise we fall back to Graphite's bundled version
  from graphite.thirdparty import pytz


months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
weekdays = ['sun','mon','tue','wed','thu','fri','sat']

tzinfo = pytz.timezone(settings.TIME_ZONE)

def parseATTime(s):
  s = s.strip().lower().replace('_','').replace(',','').replace(' ','')
  if s.isdigit():
    if len(s) == 8 and int(s[:4]) > 1900 and int(s[4:6]) < 13 and int(s[6:]) < 32:
      pass #Fall back because its not a timestamp, its YYYYMMDD form
    else:
      return datetime.fromtimestamp(int(s),tzinfo)
  if '+' in s:
    ref,offset = s.split('+',1)
    offset = '+' + offset
  elif '-' in s:
    ref,offset = s.split('-',1)
    offset = '-' + offset
  else:
    ref,offset = s,''
  return tzinfo.localize(parseTimeReference(ref), daylight) + parseTimeOffset(offset)


def parseTimeReference(ref):
  if not ref or ref == 'now': return datetime.now()

  #Time-of-day reference
  i = ref.find(':')
  hour,min = 0,0
  if i != -1:
    hour = int( ref[:i] )
    min = int( ref[i+1:i+3] )
    ref = ref[i+3:]
    if ref[:2] == 'am': ref = ref[2:]
    elif ref[:2] == 'pm':
      hour = (hour + 12) % 24
      ref = ref[2:]
  if ref.startswith('noon'):
    hour,min = 12,0
    ref = ref[4:]
  elif ref.startswith('midnight'):
    hour,min = 0,0
    ref = ref[8:]
  elif ref.startswith('teatime'):
    hour,min = 16,0
    ref = ref[7:]

  refDate = datetime.now().replace(hour=hour,minute=min,second=0)

  #Day reference
  if ref in ('yesterday','today','tomorrow'): #yesterday, today, tomorrow
    if ref == 'yesterday':
      refDate = refDate - timedelta(days=1)
    if ref == 'tomorrow':
      refDate = refDate + timedelta(days=1)
  elif ref.count('/') == 2: #MM/DD/YY[YY]
    m,d,y = map(int,ref.split('/'))
    if y < 1900: y += 1900
    if y < 1970: y += 100
    refDate = refDate.replace(year=y)

    try: # Fix for Bug #551771
      refDate = refDate.replace(month=m)
      refDate = refDate.replace(day=d)
    except:
      refDate = refDate.replace(day=d)
      refDate = refDate.replace(month=m)

  elif len(ref) == 8 and ref.isdigit(): #YYYYMMDD
    refDate = refDate.replace(year= int(ref[:4]))

    try: # Fix for Bug #551771
      refDate = refDate.replace(month= int(ref[4:6]))
      refDate = refDate.replace(day= int(ref[6:8]))
    except:
      refDate = refDate.replace(day= int(ref[6:8]))
      refDate = refDate.replace(month= int(ref[4:6]))

  elif ref[:3] in months: #MonthName DayOfMonth
    refDate = refDate.replace(month= months.index(ref[:3]) + 1)
    if ref[-2:].isdigit():
      refDate = refDate.replace(day= int(ref[-2:]))
    elif ref[-1:].isdigit():
      refDate = refDate.replace(day= int(ref[-1:]))
    else:
      raise Exception, "Day of month required after month name"
  elif ref[:3] in weekdays: #DayOfWeek (Monday, etc)
    todayDayName = refDate.strftime("%a").lower()[:3]
    today = weekdays.index( todayDayName )
    twoWeeks = weekdays * 2
    dayOffset = today - twoWeeks.index(ref[:3])
    if dayOffset < 0: dayOffset += 7
    refDate -= timedelta(days=dayOffset)
  elif ref:
    raise Exception, "Unknown day reference"
  return refDate


def parseTimeOffset(offset):
  if not offset:
    return timedelta()

  t = timedelta()

  if offset[0].isdigit():
    sign = 1
  else:
    sign = { '+' : 1, '-' : -1 }[offset[0]]
    offset = offset[1:]

  while offset:
    i = 1
    while offset[:i].isdigit() and i <= len(offset): i += 1
    num = int(offset[:i-1])
    offset = offset[i-1:]
    i = 1
    while offset[:i].isalpha() and i <= len(offset): i += 1
    unit = offset[:i-1]
    offset = offset[i-1:]
    unitString = getUnitString(unit)
    if unitString == 'months':
      unitString = 'days'
      num = num * 30
    if unitString == 'years':
      unitString = 'days'
      num = num * 365
    t += timedelta(**{ unitString : sign * num})

  return t


def getUnitString(s):
  if s.startswith('s'): return 'seconds'
  if s.startswith('min'): return 'minutes'
  if s.startswith('h'): return 'hours'
  if s.startswith('d'): return 'days'
  if s.startswith('w'): return 'weeks'
  if s.startswith('mon'): return 'months'
  if s.startswith('y'): return 'years'
  raise Exception, "Invalid offset unit '%s'" % s
