#!/usr/bin/env python

import sys, os
import whisper
from optparse import OptionParser

option_parser = OptionParser(
    usage='%%prog path <%s>' % '|'.join(whisper.aggregationMethods))

(options, args) = option_parser.parse_args()

if len(args) < 2:
  option_parser.print_usage()
  sys.exit(1)

path = args[0]
aggregationMethod = args[1]

oldAggregationMethod = whisper.setAggregationMethod(path, aggregationMethod)

print 'Updated aggregation method: %s (%s -> %s)' % (path,oldAggregationMethod,aggregationMethod)
