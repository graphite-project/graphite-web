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

import pytz
from datetime import datetime, timedelta, datetime as datetimetype
from django.conf import settings

months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
weekdays = ['sun','mon','tue','wed','thu','fri','sat']
SECONDS_STRING = 'seconds'
MINUTES_STRING = 'minutes'
HOURS_STRING = 'hours'
DAYS_STRING = 'days'
WEEKS_STRING = 'weeks'
MONTHS_STRING = 'months'
YEARS_STRING = 'years'


def parseATTime(s, tzinfo=None, now=None):
    if tzinfo is None:
        tzinfo = pytz.timezone(settings.TIME_ZONE)
    if isinstance(s, datetimetype):
        if s.tzinfo:
            return s.astimezone(tzinfo)
        return tzinfo.localize(s)

    s = s.strip().lower().replace('_','').replace(',','').replace(' ','')
    if s.isdigit():
        if len(s) == 8 and int(s[:4]) > 1900 and int(s[4:6]) < 13 and int(s[6:]) < 32:
            pass  # Fall back because its not a timestamp, its YYYYMMDD form
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

    return tzinfo.normalize(parseTimeReference(ref, tzinfo, now) + parseTimeOffset(offset))


def parseTimeReference(ref, tzinfo=None, now=None):
    if tzinfo is None:
        tzinfo = pytz.timezone(settings.TIME_ZONE)
    if isinstance(ref, datetimetype):
        if ref.tzinfo:
            return ref.astimezone(tzinfo)
        return tzinfo.localize(ref)

    if now is None:
        now = datetime.now(tzinfo)
    else:
        now = parseATTime(now, tzinfo)

    if not ref or ref == 'now':
        return now

    rawRef = ref

    # Time-of-day reference
    i = ref.find(':')
    hour,minute = 0,0
    if 0 < i < 3:
        hour = int( ref[:i] )
        minute = int( ref[i+1:i+3] )
        ref = ref[i+3:]
        if ref[:2] == 'am':
            ref = ref[2:]
        elif ref[:2] == 'pm':
            hour = (hour + 12) % 24
            ref = ref[2:]

    # Xam or XXam
    i = ref.find('am')
    if 0 < i < 3:
        hour = int( ref[:i] )
        ref = ref[i+2:]

    # Xpm or XXpm
    i = ref.find('pm')
    if 0 < i < 3:
        hour = (int( ref[:i] ) + 12) % 24
        ref = ref[i+2:]

    if ref.startswith('noon'):
        hour,minute = 12,0
        ref = ref[4:]
    elif ref.startswith('midnight'):
        hour,minute = 0,0
        ref = ref[8:]
    elif ref.startswith('teatime'):
        hour,minute = 16,0
        ref = ref[7:]

    refDate = now.replace(hour=hour,minute=minute,second=0,microsecond=0,tzinfo=None)

    # Day reference
    if ref in ('yesterday','today','tomorrow'):  # yesterday, today, tomorrow
        if ref == 'yesterday':
            refDate -= timedelta(days=1)
        elif ref == 'tomorrow':
            refDate += timedelta(days=1)

    elif ref.count('/') == 2:  # MM/DD/YY[YY]
        m,d,y = map(int,ref.split('/'))
        if y < 1900:
            y += 1900
        if y < 1970:
            y += 100
        refDate = datetime(year=y,month=m,day=d,hour=hour,minute=minute)

    elif len(ref) == 8 and ref.isdigit():  # YYYYMMDD
        refDate = datetime(year=int(ref[:4]), month=int(ref[4:6]), day=int(ref[6:8]), hour=hour, minute=minute)

    elif ref[:3] in months:  # MonthName DayOfMonth
        d = None
        if ref[-2:].isdigit():
            d = int(ref[-2:])
        elif ref[-1:].isdigit():
            d = int(ref[-1:])
        else:
            raise Exception("Day of month required after month name")
        refDate = datetime(year=refDate.year, month=months.index(ref[:3]) + 1, day=d, hour=hour, minute=minute)

    elif ref[:3] in weekdays:  # DayOfWeek (Monday, etc)
        todayDayName = refDate.strftime("%a").lower()[:3]
        today = weekdays.index( todayDayName )
        twoWeeks = weekdays * 2
        dayOffset = today - twoWeeks.index(ref[:3])
        if dayOffset < 0:
            dayOffset += 7
        refDate -= timedelta(days=dayOffset)

    elif ref:
        raise ValueError("Unknown day reference: %s" % rawRef)

    return tzinfo.localize(refDate)


def parseTimeOffset(offset):
    if not offset:
        return timedelta()

    t = timedelta()

    if offset[0].isdigit():
        sign = 1
    else:
        try:
            sign = { '+' : 1, '-' : -1 }[offset[0]]
        except KeyError:
            raise KeyError('Invalid offset: %s' % offset)
        offset = offset[1:]

    while offset:
        i = 1
        while offset[:i].isdigit() and i <= len(offset):
            i += 1
        num = int(offset[:i-1])
        offset = offset[i-1:]
        i = 1
        while offset[:i].isalpha() and i <= len(offset):
            i += 1
        unit = offset[:i-1]
        offset = offset[i-1:]
        unitString = getUnitString(unit)
        if unitString == MONTHS_STRING:
            unitString = DAYS_STRING
            num = num * 30
        if unitString == YEARS_STRING:
            unitString = DAYS_STRING
            num = num * 365
        t += timedelta(**{ unitString : sign * num})

    return t


def getUnitString(s):
    if s.startswith('s'): return SECONDS_STRING
    if s.startswith('min'): return MINUTES_STRING
    if s.startswith('h'): return HOURS_STRING
    if s.startswith('d'): return DAYS_STRING
    if s.startswith('w'): return WEEKS_STRING
    if s.startswith('mon'): return MONTHS_STRING
    if s.startswith('y'): return YEARS_STRING
    raise ValueError("Invalid offset unit '%s'" % s)
