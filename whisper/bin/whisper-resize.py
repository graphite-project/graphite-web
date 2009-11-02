#!/usr/bin/env python

import sys, os, time, traceback
import whisper
from optparse import OptionParser

now = int( time.time() )

option_parser = OptionParser(usage='''%prog path secondsPerPoint:pointsToStore [secondsPerPoint:pointsToStore]* ''')
option_parser.add_option('--xFilesFactor', default=None, type='float', help="Change the xFilesFactor")
option_parser.add_option('--force', default=False, action='store_true', help="Perform a destructive change")
option_parser.add_option('--newfile', default=None, action='store', help="Create a new database file without removing the existing one")

(options, args) = option_parser.parse_args()

if len(args) < 2:
  option_parser.print_usage()
  sys.exit(1)

path = args[0]
new_archives = [ tuple( map(int,archive_str.split(':')) ) for archive_str in args[1:] ]

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
