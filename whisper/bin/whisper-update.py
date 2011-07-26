#!/usr/bin/env python

import sys, time
import whisper
from optparse import OptionParser

now = int( time.time() )

option_parser = OptionParser(
    usage='''%prog [options] path timestamp:value [timestamp:value]*''')

(options, args) = option_parser.parse_args()

if len(args) < 2:
  option_parser.print_usage()
  sys.exit(1)

path = args[0]
datapoint_strings = args[1:]
datapoint_strings = [point.replace('N:', '%d:' % now)
                     for point in datapoint_strings]
datapoints = [tuple(point.split(':')) for point in datapoint_strings]

if len(datapoints) == 1:
  timestamp,value = datapoints[0]
  whisper.update(path, value, timestamp)
else:
  print datapoints
  whisper.update_many(path, datapoints)
