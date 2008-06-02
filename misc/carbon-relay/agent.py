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

import struct
from twisted.internet.protocol import ReconnectingClientFactory, Protocol
from twisted.internet.defer import Deferred
from twisted.application import internet

class AgentRelay:
  def __init__(self,host,port):
    self.host = host
    self.port = int(port)
    self.factory = AgentConnectionFactory(self)
    self.client = internet.TCPClient(self.host, self.port, self.factory)
    self.producer = None
    self.protocol = None

  def write(self,data):
    assert self.protocol, "No protocol connected!"
    self.protocol.write(data)

  def registerProducer(self,producer):
    self.producer = producer


class AgentConnectionFactory(ReconnectingClientFactory):
  def __init__(self,relay):
    self.relay = relay
    self.initialDelay = 5.0
    self.factor = 1.5
    self.maxDelay = 30.0
    self.clients = set()

  def buildProtocol(self,addr):
    print 'AgentConnectionFactory building new AgentProtocol'
    p = AgentProtocol(self.relay)
    p.factory = self
    return p


class AgentProtocol(Protocol):
  def __init__(self,relay):
    self.relay = relay

  def connectionMade(self):
    self.transport.setTcpKeepAlive(True)
    self.peer = self.transport.getPeer()
    self.relay.protocol = self #dangerous? maybe. stupid? probably. works? yes.
    self.factory.resetDelay()
    self.factory.clients.add(self)
    self.transport.registerProducer( self.relay.producer, streaming=False )

  def connectionLost(self,reason):
    self.factory.clients.discard(self)

  def write(self,data):
    lines = [' '.join(p) for p in data]
    #print 'Sending %d lines to agent %s' % (len(lines),self.peer.host)
    buffer = '\n'.join(lines) + '\n'
    self.transport.write(buffer)
