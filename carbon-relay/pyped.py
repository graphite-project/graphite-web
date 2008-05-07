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

import struct, traceback
from cStringIO import StringIO
from cloud import agentCloud
from twisted.internet.protocol import ReconnectingClientFactory, Protocol
from twisted.application import internet

READY_STRING = "R"
HEADER_FORMAT = "!L"
HEADER_SIZE = struct.calcsize(HEADER_FORMAT)
READY_SIGNAL = struct.pack(HEADER_FORMAT,len(READY_STRING)) + READY_STRING
POINT_FORMAT = "!Ld"

def valid_chars_only(char):
  code = ord(char)
  return code > 31 and code < 127


class PypeConsumer:
  def __init__(self,host,port):
    self.host = host
    self.port = int(port)
    self.simpleName = ("%s_%d" % (self.host,self.port)).replace('.','_')
    self.factory = PypeConnectionFactory(self)
    self.client = internet.TCPClient(self.host, self.port, self.factory)
    self.consumedMessages = 0
    self.logicalMessages = 0


class PypeConnectionFactory(ReconnectingClientFactory):
  def __init__(self,pype):
    self.pype = pype
    self.initialDelay = 5.0
    self.factor = 1.5
    self.maxDelay = 30.0
    self.clients = set()

  def buildProtocol(self,addr):
    print 'PypeConnectionFactory: building new ConsumerProtocol'
    p = ConsumerProtocol(self.pype)
    p.factory = self
    return p


class ConsumerProtocol(Protocol):
  def __init__(self,pype):
    self.pype = pype

  def connectionMade(self):
    self.transport.setTcpKeepAlive(True)
    self.peer = self.transport.getPeer()
    self.factory.resetDelay()
    self.factory.clients.add(self)
    self.hdrBuf = ""
    self.msgBuf = ""
    self.bytesLeft = 0
    self.sendReadySignal()

  def connectionLost(self,reason):
    self.factory.clients.discard(self)

  def sendReadySignal(self):
    self.transport.write(READY_SIGNAL)

  def dataReceived(self,data):
    s = StringIO(data)
    while True:
      if self.bytesLeft:
        chunk = s.read(self.bytesLeft)
        self.msgBuf += chunk
        self.bytesLeft -= len(chunk)
        if self.bytesLeft == 0:
          self.handleMessage( self.msgBuf )
          self.hdrBuf = ""
          self.msgBuf = ""
        else:
          s.close()
          return
      remainingHeader = HEADER_SIZE - len(self.hdrBuf)
      if remainingHeader == 0:
        s.close()
        return
      hdrChunk = s.read(remainingHeader)
      if not hdrChunk: break
      self.hdrBuf += hdrChunk
      if len(self.hdrBuf) == HEADER_SIZE:
        self.bytesLeft = struct.unpack(HEADER_FORMAT,self.hdrBuf)[0]

  def handleMessage(self,message): #Should break this out into a separate handler object
    self.pype.consumedMessages += 1
    rawLines = message.split('\n')
    #print 'Consumed %d line message from %s' % (len(rawLines),self.peer.host)
    self.processSomeLines(rawLines)

  def processSomeLines(self,rawLines):
    '''Attempt to process as many lines as possible.
       If our caches fill up we defer until its got room,
       continuing where we left off until we get through them all.
    '''
    for lineNum,rawLine in enumerate(rawLines):
      try:
        line = filter(valid_chars_only, rawLine)
        if not line: continue
        (name,value,timestamp) = line.split()
        value = float(value)
        timestamp = int(float(timestamp)) # int("1.0") raises a TypeError
        pointStr = "%f %d" % (value,timestamp)
        #Try to put it in the cache, if we get back a deferred, we add a callback to resume processing later
        deferred = agentCloud.input(name,pointStr)
        if deferred:
          remainingLines = rawLines[lineNum:]
          deferred.addCallback( lambda result: self.processSomeLines(remainingLines) )
          return
        self.pype.logicalMessages += 1
      except:
        print 'ConsumerProtocol.handleMessage() invalid line: %s' % rawLine
        traceback.print_exc()
        continue

    #Only once we've gotten through all the lines are we ready for another message
    self.sendReadySignal()
