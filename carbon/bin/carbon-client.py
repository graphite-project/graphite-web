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
from carbon.client import CarbonClientManager
from carbon.events import metricReceived
from carbon import hashing, log


option_parser = OptionParser(usage="%prog [options] <host:port:instance> <host:port:instance> ...")
option_parser.add_option('--logstdout', action='store_true', help="Log to stdout")
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

hashing.setDestinationHosts(destinations)
client_manager = CarbonClientManager()

if options.keyfunc:
  module_path, func_name = options.keyfunc.rsplit(':', 1)
  module_file = open(module_path, 'U')
  description = ('.py', 'U', imp.PY_SOURCE)
  module = imp.load_module('keyfunc_module', module_file, module_path, description)
  keyfunc = getattr(module, func_name)
  client_manager.setKeyFunction(keyfunc)

for (host, port, instance) in destinations:
  addr = (host, port)
  reactor.callWhenRunning(client_manager.startClient, addr)

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

if options.logstdout:
  log.logToStdout()

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
