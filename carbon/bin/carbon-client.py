#!/usr/bin/env python

import imp
from optparse import OptionParser
try:
  from twisted.internet import epollreactor
  epollreactor.install()
except ImportError:
  pass

from twisted.internet import stdio, reactor
from twisted.protocols.basic import LineReceiver
from carbon.events import metricReceived
from carbon.routers import ConsistentHashingRouter
from carbon.client import CarbonClientManager
from carbon import log


option_parser = OptionParser(usage="%prog [options] <host:port:instance> <host:port:instance> ...")
option_parser.add_option('--debug', action='store_true', help="Log debug info to stdout")
option_parser.add_option('--keyfunc', help="Use a custom key function (path/to/module.py:myFunc)")

options, args = option_parser.parse_args()

if not args:
  print 'At least one host:port destination required\n'
  option_parser.print_usage()
  raise SystemExit(1)


destinations = []
for arg in args:
  parts = arg.split(':', 2)
  host = parts[0]
  port = int(parts[1])
  if len(parts) > 2:
    instance = parts[2]
  else:
    instance = None
  destinations.append( (host, port, instance) )

#TODO(chrismd) make this more configurable via options
router = ConsistentHashingRouter()
client_manager = CarbonClientManager(router)
reactor.callWhenRunning(client_manager.startService)

if options.keyfunc:
  router.setKeyFunctionFromModule(options.keyfunc)

for destination in destinations:
  client_manager.startClient(destination)

metricReceived(client_manager.sendDatapoint)

# Create a transport to read user data from
class StdinMetricsReader(LineReceiver):
  delimiter = '\n'

  def lineReceived(self, line):
    try:
      (metric, value, timestamp) = line.split()
      datapoint = (float(timestamp), float(value))
      assert datapoint[1] == datapoint[1] # filter out NaNs
      client_manager.sendDatapoint(metric, datapoint)
    except:
      log.err('Dropping invalid line: %s' % line)

  def connectionLost(self, reason):
    log.clients('stdin disconnected, sending remaining data and shutting down')
    allStopped = client_manager.stopAllClients(graceful=True)
    allStopped.addCallback(shutdown)

stdio.StandardIO( StdinMetricsReader() )

if options.debug:
  log.logToStdout()
  log.setDebugEnabled(True)

exitCode = 0
def shutdown(results):
  global exitCode
  for success, result in results:
    if not success:
      exitCode = 1
      break
  reactor.stop()

reactor.run()
raise SystemExit(exitCode)
