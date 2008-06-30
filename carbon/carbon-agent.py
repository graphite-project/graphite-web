#!/usr/bin/env python
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

import sys
if sys.version_info[0] != 2 or sys.version_info[1] < 4:
  print 'Python version >= 2.4 and < 3.0 is required'
  sys.exit(1)

import os, socket, time, traceback
from getopt import getopt
from signal import signal, SIGTERM
from subprocess import *
from select import select
from schemalib import loadStorageSchemas
from utils import daemonize, dropprivs, logify

debug = False
user = 'apache'
try:
  (opts,args) = getopt(sys.argv[1:],"du:h")
  assert ('-h','') not in opts
except:
  print """Usage: %s [options]

Options:
	-d		Debug mode
	-u user		Drop privileges to run as user
	-h		Display this help message
""" % os.path.basename(sys.argv[0])
  sys.exit(1)

for opt,val in opts:
  if opt == '-d':
    debug = True
  elif opt == '-u':
    user = val

if debug:
  logify()
else:
  daemonize()
  logify('log/agent.log')
  pf = open('pid/agent.pid','w')
  pf.write( str(os.getpid()) )
  pf.close()
  try: dropprivs(user)
  except: pass
print 'carbon-agent started (pid=%d)' % os.getpid()

def handleDeath(signum,frame):
  print 'Received SIGTERM, killing children'
  try:
    os.kill( cacheProcess.pid, SIGTERM )
    print 'Sent SIGTERM to carbon-cache'
    os.wait()
    print 'wait() complete'
  except OSError:
    print 'carbon-cache appears to already be dead'
  try:
    os.kill( persisterProcess.pid, SIGTERM )
    print 'Sent SIGTERM to carbon-persister'
    os.wait()
    print 'wait() complete, exitting'
  except OSError:
    print 'carbon-persister appears to already be dead'
  sys.exit(0)

signal(SIGTERM,handleDeath)

devnullr = open('/dev/null','r')
devnullw = open('/dev/null','w')

cachePipe = map( str, os.pipe() )
persisterPipe = map( str, os.pipe() )
print 'created cache pipe, fds=%s' % str(cachePipe)
print 'created persister pipe, fds=%s' % str(persisterPipe)

args = ['./carbon-cache.py',cachePipe[0],persisterPipe[1]]
cacheProcess = Popen(args,stdin=devnullr,stdout=devnullw,stderr=devnullw)
print 'carbon-cache started with pid %d' % cacheProcess.pid
pf = open('pid/cache.pid','w')
pf.write( str(cacheProcess.pid) )
pf.close()

args = ['./carbon-persister.py',persisterPipe[0]]
persisterProcess = Popen(args,stdin=devnullr,stdout=devnullw,stderr=devnullw)
print 'carbon-persister started with pid %d' % persisterProcess.pid
pf = open('pid/persister.pid','w')
pf.write( str(persisterProcess.pid) )
pf.close()

listener = socket.socket()
listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
listener.bind( ('',2003) )
listener.listen(1)
print 'listener socket ready'

clientAddrs = {}
toRead = set([listener])
readBuffers = {}
writeFD = int(cachePipe[1])

toWrite = set([writeFD])
writeBuffer = ""
writeBufferMax = 1048576

while True:
  try:
    readable,writable = select(toRead,toWrite,[])[:2]

    for sock in readable:
      if sock == listener:
        try:
          newsock,addr = listener.accept()
        except:
          traceback.print_exc()
          continue
        print 'accepted connection from %s' % str(addr)
        readBuffers[newsock] = ""
        clientAddrs[newsock] = addr
        toRead.add(newsock)
        continue

      try:
        pkt = sock.recv(65536) #Read what we can
        #print 'Received %d bytes from %s' % (len(pkt),clientAddrs[sock])
      except:
        pkt = None

      if not pkt:
        print 'lost connection from %s' % str( clientAddrs[sock] )
        del clientAddrs[sock]
        del readBuffers[sock]
        toRead.remove(sock)
        sock.close()
        continue

      readBuffers[sock] += pkt
      completeLines = readBuffers[sock].split('\n') #Break out all the complete lines
      readBuffers[sock] = completeLines.pop() #Leaving the final partial line as our buffer
      if completeLines:
        #print 'Buffering %d complete lines' % len(completeLines)
	if len(writeBuffer) < writeBufferMax:
          writeBuffer += '\n'.join(completeLines) + '\n'
          toWrite.add(writeFD) #When we know we have data, we must select writeFD
	else:
	  print '%d lines were dropped due to buffer exhaustion' % len(completeLines)

    if writable and not writeBuffer: #Can't write if there's no data
      toWrite.remove(writeFD) #Stop selecting writeFD to prevent busy looping
      continue

    if writable:
      try:
        written = os.write(writeFD,writeBuffer)
        #print 'Wrote %d bytes to cache pipe' % written
      except:
        print 'Failed to write to cache pipe, exitting'
        traceback.print_exc()
        raise SystemExit(1)
      writeBuffer = writeBuffer[written:]
  except SystemExit: raise
  except KeyboardInterrupt: raise
  except:
    print 'Uncaught exception in the main loop, sleeping for 1 second...'
    traceback.print_exc()
    time.sleep(1)
