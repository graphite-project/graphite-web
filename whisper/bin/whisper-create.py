#!/usr/bin/env python

import sys, os
import whisper
from optparse import OptionParser

option_parser = OptionParser(
    usage='''%prog path timePerPoint:timeToStore [timePerPoint:timeToStore]*

timePerPoint and timeToStore specify lengths of time, for example:

60:1440      60 seconds per datapoint, 1440 datapoints = 1 day of retention
15m:8        15 minutes per datapoint, 8 datapoints = 2 hours of retention
1h:7d        1 hour per datapoint, 7 days of retention
12h:2y       12 hours per datapoint, 2 years of retention
''')
option_parser.add_option('--xFilesFactor', default=0.5, type='float')
option_parser.add_option('--aggregationMethod', default='average',
        type='string', help="Function to use when aggregating values (%s)" %
        ', '.join(whisper.aggregationMethods))
option_parser.add_option('--overwrite', default=False, action='store_true')

(options, args) = option_parser.parse_args()

if len(args) < 2:
  option_parser.print_usage()
  sys.exit(1)

path = args[0]
archives = [whisper.parseRetentionDef(retentionDef)
            for retentionDef in args[1:]]

if options.overwrite and os.path.exists(path):
  print 'Overwriting existing file: %s' % path
  os.unlink(path)

whisper.create(path, archives, xFilesFactor=options.xFilesFactor, aggregationMethod=options.aggregationMethod)

size = os.stat(path).st_size
print 'Created: %s (%d bytes)' % (path,size)
