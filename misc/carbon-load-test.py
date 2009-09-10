#!/usr/bin/env python

import sys, os, time
from socket import socket
from random import random, choice


try:
  host = sys.argv[1]
  port = int(sys.argv[2])
  mpm = int(sys.argv[3])
except:
  print 'Usage: %s host port metrics-per-minute' % os.path.basename(sys.argv[0])
  sys.exit(1)

s = socket()
s.connect( (host,port) )

now = int( time.time() )
now -= now % 60

while True:
  start = time.time()
  count = 0
  for i in xrange(0, mpm):
    r = choice( (42,43) )
    metric = 'TEST%d.%d' % (r,i)
    value = random()
    s.sendall('%s %s %s\n' % (metric, value, now))
    count += 1

  print 'sent %d metrics in %.3f seconds' % (count, time.time() - start)

  now += 60

  diff = now - time.time()
  if diff > 0:
    print "sleeping for %d seconds" % diff
    time.sleep(diff)
