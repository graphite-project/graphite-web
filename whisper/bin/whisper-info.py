#!/usr/bin/env python

import sys, os
import whisper
from optparse import OptionParser

option_parser = OptionParser(usage='''%prog path [field]''')
(options, args) = option_parser.parse_args()

if len(args) < 1:
  option_parser.print_usage()
  sys.exit(1)

path = args[0]
if len(args) > 1:
  field = args[1]
else:
  field = None

info = whisper.info(path)
info['fileSize'] = os.stat(path).st_size

if field:
  if field not in info:
    print 'Unknown field "%s". Valid fields are %s' % (field, ','.join(info))
    sys.exit(1)

  print info[field]
  sys.exit(0)


archives = info.pop('archives')
for key,value in info.items():
  print '%s: %s' % (key,value)
print

for i,archive in enumerate(archives):
  print 'Archive %d' % i
  for key,value in archive.items():
    print '%s: %s' % (key,value)
  print
