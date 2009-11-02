#!/usr/bin/env python

import sys, os
import whisper
from optparse import OptionParser

option_parser = OptionParser(usage='''%prog path secondsPerPoint:pointsToStore [secondsPerPoint:pointsToStore]* ''')
option_parser.add_option('--xFilesFactor', default=0.5, type='float')
option_parser.add_option('--overwrite', default=False, action='store_true')

(options, args) = option_parser.parse_args()

if len(args) < 2:
  option_parser.print_usage()
  sys.exit(1)

path = args[0]
archives = [ tuple( map(int,archive_str.split(':')) ) for archive_str in args[1:] ]

if options.overwrite and os.path.exists(path):
  print 'Overwriting existing file: %s' % path
  os.unlink(path)

whisper.create(path, archives, xFilesFactor=options.xFilesFactor)

size = os.stat(path).st_size
print 'Created: %s (%d bytes)' % (path,size)
