#!/usr/bin/python

import os, time
from ConfigParser import SafeConfigParser

from pyped import PypeConsumer
from cloud import agentCloud
from agent import AgentRelay

from twisted.application import internet, service
from twisted.internet import task

try:
  import psyco
  psyco.full()
except: pass

application = service.Application("carbon-relay")

#Process our config
parser = SafeConfigParser()
assert parser.read("servers.conf"), "Unable to read servers.conf!"
pypeHosts = []
agentHosts = []
for host in parser.get('servers','pypes').split(','):
  server,port = host.strip().split(':')
  pypeHosts.append( (server,int(port)) )

for host in parser.get('servers','agents').split(','):
  server,port = host.strip().split(':')
  agentHosts.append( (server,int(port)) )

#Create our connection factories and listeners
pypes = []
for host,port in pypeHosts:
  pype = PypeConsumer(host,port)
  pypes.append(pype)
  pype.client.setServiceParent( service.IServiceCollection(application) )

for host,port in agentHosts:
  relay = AgentRelay(host,port)
  agentCloud.registerRelay(relay)
  relay.client.setServiceParent( service.IServiceCollection(application) )

#Statistic calculation
rateCalculationFrequency = 60.0

def calcStats():
  now = int( time.time() )
  for pype in pypes:
    agentCloud.input( 'carbon.pypes.%s.consumedMessages' % pype.simpleName, "%d:%d" % (now,pype.consumedMessages) )
    agentCloud.input( 'carbon.pypes.%s.logicalMessages' % pype.simpleName, "%d:%d" % (now,pype.logicalMessages) )
    pype.consumedMessages = 0
    pype.logicalMessages = 0

rates = task.LoopingCall(calcStats)
rates.start(rateCalculationFrequency)
