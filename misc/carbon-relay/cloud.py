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

from twisted.internet.defer import Deferred


class AgentCloud:
  def __init__(self):
    self.relayQueues = {}
    self.busyDefer = None

  def input(self,key,value):
    queue = self.getQueue(key)
    if queue:
      queue.enqueue(key,value)
      if self.busyDefer:
        d = self.busyDefer
        self.busyDefer = None
        d.callback(0)
    else:
      if self.busyDefer: return self.busyDefer
      print 'All agents are busy, please hold the line and the next available representative will be with you shortly.'
      self.busyDefer = Deferred()
      return self.busyDefer

  def registerRelay(self,relay):
    queue = QueueProducer(relay)
    relay.registerProducer(queue)
    self.relayQueues[relay] = queue

  def getQueue(self,key):
    relays = self.relayQueues.keys()
    while relays:
      relay = relays[ hash(key) % len(relays) ]
      queue = self.relayQueues[relay]
      if queue.isFull():
        relays.remove(relay)
      else:
        return queue


class QueueProducer:
  def __init__(self,consumer):
    self.consumer = consumer
    self.queue = []
    self.maxSize = 100000
    self.produceSize = 25
    self.emptyDefer = None

  def isFull(self):
    return len(self.queue) >= self.maxSize

  def enqueue(self,key,value):
    self.queue.append( (key,value) )
    if self.emptyDefer:
      self.emptyDefer.callback(0)
      self.emptyDefer = None

  def resumeProducing(self):
    if not self.queue:
      self.emptyDefer = Deferred()
      self.emptyDefer.addCallback( lambda result: self.resumeProducing() )
      return

    data = self.queue[:self.produceSize]
    self.consumer.write(data)
    self.queue = self.queue[self.produceSize:]

  def stopProducing(self):
    pass #Kind of awkward, but whatever...


agentCloud = AgentCloud() #A shared importable singleton
