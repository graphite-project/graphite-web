#!/usr/bin/env python

import sys, os, time
import rrdtool
import whisper
from optparse import OptionParser

now = int( time.time() )

option_parser = OptionParser(usage='''%prog rrd_path''')
option_parser.add_option('--xFilesFactor', default=0.5, type='float')

(options, args) = option_parser.parse_args()

if len(args) < 1:
  option_parser.print_usage()
  sys.exit(1)

rrd_path = args[0]

rrd_info = rrdtool.info(rrd_path)

secondsPerPDP = rrd_info['step']

archives = []
for rra in rrd_info['rra']:
  secondsPerPoint = secondsPerPDP * rra['pdp_per_row']
  pointsToStore = rra['rows']
  archives.append( (secondsPerPoint,pointsToStore) )

for datasource,ds_info in rrd_info['ds'].items():
  path = rrd_path.replace('.rrd','_%s.wsp' % datasource)
  whisper.create(path, archives, xFilesFactor=options.xFilesFactor)
  size = os.stat(path).st_size
  print 'Created: %s (%d bytes)' % (path,size)

  print 'Migrating data'
  for rra in rrd_info['rra']:
    pointsToStore = rra['rows']
    secondsPerPoint = secondsPerPDP * rra['pdp_per_row']
    retention = secondsPerPoint * pointsToStore
    startTime = str(now - retention)
    endTime = str(now)
    (timeInfo,columns,rows) = rrdtool.fetch(rrd_path, 'AVERAGE', '-r', str(secondsPerPoint), '-s', startTime, '-e', endTime)
    rows.pop() #remove the last datapoint because RRD sometimes gives funky values
    i = list(columns).index(datasource)
    values = [row[i] for row in rows]
    timestamps = list(range(*timeInfo))
    datapoints = zip(timestamps,values)
    datapoints = filter(lambda p: p[1] is not None, datapoints)
    print ' migrating %d datapoints...' % len(datapoints)
    whisper.update_many(path, datapoints)
