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

import sys, os, time, struct, socket, traceback, cPickle
from select import select
from utils import logify


logify("log/cache.log")
print 'carbon-cache started with pid %d' % os.getpid()

inPipeFD = int(sys.argv[1])
inPipe = os.fdopen(inPipeFD,'r',1)
print 'established input pipe, fd=%d' % inPipeFD

outPipeFD = int(sys.argv[2])
outPipe = os.fdopen(outPipeFD,'w',1)
print 'established output pipe, fd=%d' % outPipeFD

stats = {
  'cacheQueries' : 0,
}

hostname = socket.gethostname()
prefix = 'carbon.agents.%s.cache.' % hostname.replace('.','_')


class QueueCache(dict):
  def __init__(self):
    dict.__init__(self)
    self.cacheLimit = 1000000 #I really need to make a config file for this crap...
    self.cacheSize = 0
    self.queuesBySize = []
    self.lastResort = time.time()

  def isFull(self):
    return self.cacheSize > self.cacheLimit

  def isEmpty(self):
    return not self

  def enqueue(self,name,point):
    try:
      queue = self.pop(name)
    except KeyError:
      queue = []
    queue.append(point)
    self[name] = queue
    self.cacheSize += 1

  def popQueue(self):
    #Try and pop the biggest queue we still have
    points = None
    for name in self.queuesBySize:
      try:
        points = self.pop(name)
        self.cacheSize -= len(points)
        break
      except KeyError:
        pass
    #If we couldn't find a queue, we must fall back to resorting because self.queuesBySize may differ from self.keys()
    if not points or (time.time() - self.lastResort) > 120:
      print 'Resorting %d cache queues by size...' % len(self)
      t = time.time()
      orderedItems = sorted(self.items(),key=lambda p: len(p[1]),reverse=True)
      self.queuesBySize = (name for (name,myPoints) in orderedItems)
      self.lastResort = time.time()
      print 'Sorted %d cache queues in %.3f seconds' % (len(self),self.lastResort - t)
      if not points: #We couldn't find a queue
        if orderedItems: #But there's still something in the cache
          #print 'Recursing popQueue...'
          return self.popQueue()
        else: #popQueue shouldn't ever get called when the cache is empty!
          raise Exception("popQueue called but cache is empty!")
    return (name,points)


def doCheckpoint():
  global nextCheckpoint
  now = nextCheckpoint - 60
  nextCheckpoint += 60
  print 'doCheckpoint() now=%d stats=%s' % (now,stats)
  #Write our performance statistics
  point = "%d:%%f" % now
  cache.enqueue(prefix+'queries', point % stats['cacheQueries'] )
  cache.enqueue(prefix+'queues', point % len(cache) )
  cache.enqueue(prefix+'size', point % cache.cacheSize )
  toWrite.add(outPipe) #Select for writability when we know we have data
  #Reset values
  stats['cacheQueries'] = 0


cache = QueueCache()

cqListener = socket.socket()
cqListener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
cqListener.bind( ('',7002) )
cqListener.listen(5)
cqClients = {}
print 'Cache query listener socket ready'

thisMinute = int(round(( time.time() - (time.time() % 60) ))) #only use exact minutes to avoid drift
nextCheckpoint = thisMinute + 60

pipeReadBuffer = ""
pipeWriteBuffer = ""
toRead = set([inPipe,cqListener])
toWrite = set([outPipe])

while True:
  try:
    wait = nextCheckpoint - time.time()
    if wait < 0:
      doCheckpoint()
      continue

    readable,writable = select(toRead,toWrite,[],wait)[:2]
    if not readable and not writable:
      doCheckpoint()
      continue

    #Handle pipe I/O
    if inPipe in readable and not cache.isFull():
      readable.remove(inPipe) #so we can assume remaining readables are CQ clients
      pipeReadBuffer += os.read(inPipeFD,65536)
      lines = pipeReadBuffer.split('\n')
      pipeReadBuffer = lines.pop()
      #print 'Read %d lines from input pipe' % len(lines)
      for line in lines:
        try:
          name,point = line.strip().split(' ',1)
        except:
          print 'Ignoring malformed line: %s' % line
          traceback.print_exc()
          continue
        cache.enqueue(name,point)
        toWrite.add(outPipe) #Select for writability when we know we have data

    if outPipe in writable and cache.isEmpty(): #Ready to write but we have no data
      toWrite.remove(outPipe) #Stop selecting it to prevent a busyloop
      writable.remove(outPipe) #Prevent popQueue() on this iteration

    if outPipe in writable:
      name,pointList = cache.popQueue()
      points = ','.join(pointList)
      pipeWriteBuffer += "%s %s\n" % (name,points)
      written = os.write(outPipeFD,pipeWriteBuffer)
      #print 'Wrote %d bytes to persister pipe' % written
      pipeWriteBuffer = pipeWriteBuffer[written:]
      writable.remove(outPipe) #so we can assume remaining writables are CQ clients

    #Handle cache query requests
    if cqListener in readable:
      readable.remove(cqListener) #so we can assume remaining readables are CQ clients
      newsock,addr = cqListener.accept()
      cqClients[newsock] = (addr,"","") #read/write buffers
      toRead.add(newsock)

    for sock in readable:
      addr,readBuf,writeBuf = cqClients[sock]
      try:
        pkt = sock.recv(65536)
        assert pkt
        readBuf += pkt
        if readBuf.endswith('\x00'): #received a full query
          query = readBuf[:-1]
          result = cache.get(query,[])
          print 'CacheQuery[%s:%d] for %s found %d points' % (addr+(query,len(result)))
          stats['cacheQueries'] += 1
          writeBuf = cPickle.dumps(result) + '\x00'
          toRead.remove(sock)
          toWrite.add(sock)
        cqClients[sock] = (addr,readBuf,writeBuf)
      except:
        print 'CacheQuery[%s:%d] connection failed' % addr
        traceback.print_exc()
        toRead.discard(sock)
        toWrite.discard(sock)
        del cqClients[sock]

    for sock in writable:
      addr,readBuf,writeBuf = cqClients[sock]
      try:
        written = sock.send(writeBuf)
        assert written
        writeBuf = writeBuf[written:]
        if writeBuf: #still more to send
          cqClients[sock] = (addr,readBuf,writeBuf)
        else: #finished sending the result, succesfully
          toWrite.remove(sock)
          toRead.add(sock) #ready to receive another query
          cqClients[sock] = (addr,"","") #reset our buffers
      except:
        print 'CacheQuery[%s:%d] connection failed' % addr
        traceback.print_exc()
        toWrite.discard(sock)
        del cqClients[sock]
  except:
    print 'Exception caught in main loop, sleeping for 1 second...'
    traceback.print_exc()
    time.sleep(1)
