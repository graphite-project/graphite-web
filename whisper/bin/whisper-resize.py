#!/usr/bin/env python

import sys, os, time, traceback
import whisper
from optparse import OptionParser

now = int( time.time() )

UnitMultipliers = {
  's' : 1,
  'm' : 60,
  'h' : 60 * 60,
  'd' : 60 * 60 * 24,
  'y' : 60 * 60 * 24 * 365,
}


def parseRetentionDef(retentionDef):
  (precision, points) = retentionDef.strip().split(':')

  if precision.isdigit():
    precisionUnit = 's'
    precision = int(precision)
  else:
    precisionUnit = precision[-1]
    precision = int( precision[:-1] )

  if points.isdigit():
    pointsUnit = None
    points = int(points)
  else:
    pointsUnit = points[-1]
    points = int( points[:-1] )

  if precisionUnit not in UnitMultipliers:
    raise ValueError("Invalid unit: '%s'" % precisionUnit)

  if pointsUnit not in UnitMultipliers and pointsUnit is not None:
    raise ValueError("Invalid unit: '%s'" % pointsUnit)

  precision = precision * UnitMultipliers[precisionUnit]

  if pointsUnit:
    points = points * UnitMultipliers[pointsUnit] / precision

  return (precision, points)


option_parser = OptionParser(usage='''%prog path precision:retention [precision:retention]*

precision and retention specify lengths of time, for example:

60:1440      60 seconds per datapoint, 1440 datapoints = 1 day of retention
15m:8        15 minutes per datapoint, 8 datapoints = 2 hours of retention
1h:7d        1 hour per datapoint, 7 days of retention
12h:2y       12 hours per datapoint, 2 years of retention
''')
option_parser.add_option('--xFilesFactor', default=None, type='float', help="Change the xFilesFactor")
option_parser.add_option('--force', default=False, action='store_true', help="Perform a destructive change")
option_parser.add_option('--newfile', default=None, action='store', help="Create a new database file without removing the existing one")
option_parser.add_option('--nobackup', action='store_true', help='Delete the .bak file after successful execution')

(options, args) = option_parser.parse_args()

if len(args) < 2:
  option_parser.print_usage()
  sys.exit(1)

path = args[0]
new_archives = [ parseRetentionDef(retentionDef) for retentionDef in args[1:] ]

info = whisper.info(path)
old_archives = info['archives']
old_archives.sort(key=lambda a: a['secondsPerPoint'], reverse=True) #sort by precision, lowest to highest

if options.xFilesFactor is None:
  xff = info['xFilesFactor']
else:
  xff = options.xFilesFactor

print 'Retrieving all data from the archives'
for archive in old_archives:
  fromTime = now - archive['retention'] + archive['secondsPerPoint']
  untilTime = now
  timeinfo,values = whisper.fetch(path, fromTime, untilTime)
  archive['data'] = (timeinfo,values)

if options.newfile is None:
  tmpfile = path + '.tmp'
  if os.path.exists(tmpfile):
    print 'Removing previous temporary database file: %s' % tmpfile
    os.unlink(tmpfile)
  newfile = tmpfile
else:
  newfile = options.newfile

print 'Creating new whisper database: %s' % newfile
whisper.create(newfile, new_archives, xFilesFactor=xff)
size = os.stat(newfile).st_size
print 'Created: %s (%d bytes)' % (newfile,size)

print 'Migrating data...'
for archive in old_archives:
  timeinfo, values = archive['data']
  datapoints = zip( range(*timeinfo), values )
  datapoints = filter(lambda p: p[1] is not None, datapoints)
  whisper.update_many(newfile, datapoints)

if options.newfile is not None:
  sys.exit(0)

backup = path + '.bak'
print 'Renaming old database to: %s' % backup
os.rename(path, backup)

try:
  print 'Renaming new database to: %s' % path
  os.rename(tmpfile, path)
except:
  traceback.print_exc()
  print '\nOperation failed, restoring backup'
  os.rename(backup, path)
  sys.exit(1)

if options.nobackup:
  print "Unlinking backup: %s" % backup
  os.unlink(backup)
