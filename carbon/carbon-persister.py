#!/usr/bin/env python2.4
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

import sys, os, time, struct, socket, traceback
from select import select
from graphite import whisper
from schemalib import loadStorageSchemas
from utils import logify


logify("log/persister.log")
print 'carbon-persister started with pid %d' % os.getpid()

inPipeFD = int(sys.argv[1])
inPipe = os.fdopen(inPipeFD,'r',1)
print 'established input pipe, fd=%d' % inPipeFD

stats = {
  'creates' : 0,
  'updates' : 0,
  'updateTimes' : 0.0,
  'committedMessages' : 0,
  'errors' : 0,
}

schemas = loadStorageSchemas()
hostname = socket.gethostname()
prefix = 'carbon.agents.%s.' % hostname.replace('.','_')


def performUpdate(name,points):
  #print 'performUpdate(%s) %d points' % (name,len(points))
  parts = name.split('.')
  path = os.path.join('../storage/whisper',*parts) + '.wsp'
  if not os.path.exists(path):
    print 'Creating database: %s' % path
    ret = os.system("mkdir -p %s" % os.path.dirname(path))
    if ret != 0:
      print 'Failed to create directory %s' % os.path.dirname(path)
      print 'Returned %d' % ret
      stats['errors'] += 1
      return

    for schema in schemas:
      if schema.matches(name):
        print "%s matched storage schema %s" % (name,schema.name)
        break

    archives = [archive.getTuple() for archive in schema.archives]

    try:
      whisper.create( path, archives )
      stats['creates'] += 1
    except:
      print "whisper.create exception. Creation parameters: path=%s archives=%s" % (path,archives)
      raise
  t = time.time()
  whisper.update_many(path, points)
  elapsed = time.time() - t
  print 'update_many: %s %d data points took %.6f seconds' % (path,len(points),elapsed)
  stats['updates'] += 1
  stats['updateTimes'] += elapsed
  stats['committedMessages'] += len(points)


def doCheckpoint():
  global nextCheckpoint, schemas
  now = nextCheckpoint - 60
  nextCheckpoint += 60
  print 'doCheckpoint() now=%d stats=%s' % (now,stats)
  #First reload our schemas
  try:
    schemas = loadStorageSchemas()
  except:
    print 'Exception while loading storage schemas, FIX THE SCHEMA FILE!'
    traceback.print_exc()
  #Write our performance statistics
  if stats['updates'] == 0:
    avgUpdateTime = 0.0
    pointsPerUpdate = 0.0
  else:
    avgUpdateTime = stats['updateTimes'] / stats['updates'] * 1000.0
    pointsPerUpdate = float(stats['committedMessages']) / float(stats['updates'])
  performUpdate(prefix+'errors', [(now,stats['errors'])] )
  performUpdate(prefix+'creates', [(now,stats['creates'])] )
  performUpdate(prefix+'updateOperations', [(now,stats['updates'])] )
  performUpdate(prefix+'avgUpdateTime', [(now,avgUpdateTime)] )
  performUpdate(prefix+'pointsPerUpdate', [(now,pointsPerUpdate)] )
  performUpdate(prefix+'committedPoints', [(now,stats['committedMessages'])] )
  #Reset values
  stats['errors'] = 0
  stats['creates'] = 0
  stats['updates'] = 0
  stats['updateTimes'] = 0.0
  stats['committedMessages'] = 0


thisMinute = int(round(( time.time() - (time.time() % 60) ))) #only use exact minutes to avoid drift
nextCheckpoint = thisMinute + 61
readBuffer = ""

while True: #Handle the incoming data
  wait = nextCheckpoint - time.time()
  if wait < 0 or not select([inPipe],[],[],wait)[0]:
    doCheckpoint()
    continue

  readBuffer += os.read(inPipeFD,65536)
  lines = readBuffer.split('\n')
  readBuffer = lines.pop()
  #print 'Read %d lines from cache pipe' % len(lines)
  for line in lines:
    try:
      name,pointStrings = line.strip().split(' ',1)
      points = [ p.split(':',1) for p in pointStrings.split(',') ]
    except:
      print 'Ignoring malformed line...'
      continue
    try:
      performUpdate(name,points) #Write the data to disk
    except:
      print 'Failed update operation for %s, %d points' % (name,len(points))
      traceback.print_exc()
