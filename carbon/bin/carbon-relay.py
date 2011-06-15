#!/usr/bin/env python
"""Copyright 2009 Chris Davis

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
import os
import atexit
from os.path import basename, dirname, exists, join, isdir

program = basename( sys.argv[0] ).split('.')[0]
os.umask(022)


# Initialize twisted
try:
  from twisted.internet import epollreactor
  epollreactor.install()
except:
  pass
from twisted.internet import reactor


# Figure out where we're installed
BIN_DIR = dirname(__file__)
ROOT_DIR = dirname(BIN_DIR)
LIB_DIR = join(ROOT_DIR, 'lib')
sys.path.insert(0, LIB_DIR)


# Capture useful debug info for this commonly reported problem
try:
  import carbon
except ImportError:
  print 'Failed to import carbon, debug information follows.'
  print 'pwd=%s' % os.getcwd()
  print 'sys.path=%s' % sys.path
  print '__file__=%s' % __file__
  sys.exit(1)


# Read config (we want failures to occur before daemonizing)
from carbon.conf import (get_default_parser, parse_options,
                         read_config, settings as global_settings)


parser = get_default_parser()
parser.add_option(
    '--rules',
    default=None,
    help='Use the given relay rules file')

(options, args) = parse_options(parser)
settings = read_config(program, options, ROOT_DIR=ROOT_DIR)
global_settings.update(settings)

if options.rules is None:
    options.rules = join(settings.CONF_DIR, "relay-rules.conf")

pidfile = settings.pidfile
logdir = settings.LOG_DIR

__builtins__.program = program
action = args[0]


if action == 'stop':
  if not exists(pidfile):
    print 'Pidfile %s does not exist' % pidfile
    raise SystemExit(0)

  pf = open(pidfile, 'r')
  try:
    pid = int( pf.read().strip() )
  except:
    print 'Could not read pidfile %s' % pidfile
    raise SystemExit(1)

  print 'Deleting %s (contained pid %d)' % (pidfile, pid)
  os.unlink(pidfile)

  print 'Sending kill signal to pid %d' % pid
  os.kill(pid, 15)
  raise SystemExit(0)


elif action == 'status':
  if not exists(pidfile):
    print '%s is not running' % program
    raise SystemExit(0)

  pf = open(pidfile, 'r')
  try:
    pid = int( pf.read().strip() )
  except:
    print 'Failed to read pid from %s' % pidfile
    raise SystemExit(1)

  if exists('/proc/%d' % pid):
    print "%s is running with pid %d" % (program, pid)
    raise SystemExit(0)
  else:
    print "%s is not running" % program
    raise SystemExit(0)

if exists(pidfile):
  print "Pidfile %s already exists, is %s already running?" % (pidfile, program)
  raise SystemExit(1)

# Quick validation
if settings.RELAY_METHOD not in ('rules', 'consistent-hashing'):
  print "In carbon.conf, RELAY_METHOD must be either 'rules' or 'consistent-hashing'. Invalid value: '%s'" % settings.RELAY_METHOD
  sys.exit(1)

# Import application components
from carbon.log import logToStdout, logToDir, msg
from carbon.listeners import MetricLineReceiver, MetricPickleReceiver, startListener
from carbon.relay import createClientConnections, relay
from carbon.events import metricReceived
from carbon.instrumentation import startRecording
from carbon.rules import loadRules, allDestinationServers, parseHostList
from carbon.hashing import setDestinationHosts

# --debug
if options.debug:
  logToStdout()
else:
  if not isdir(logdir):
    os.makedirs(logdir)

  from carbon.util import daemonize
  daemonize()
  logToDir(logdir)

  pidfile = open(pidfile, 'w')
  pidfile.write( str(os.getpid()) )
  pidfile.close()

  def shutdown():
    if os.path.exists(pidfile):
      os.unlink(pidfile)

  atexit.register(shutdown)


# Configure application components
metricReceived.installHandler(relay)
startListener(settings.LINE_RECEIVER_INTERFACE, settings.LINE_RECEIVER_PORT, MetricLineReceiver)
startListener(settings.PICKLE_RECEIVER_INTERFACE, settings.PICKLE_RECEIVER_PORT, MetricPickleReceiver)

if settings.RELAY_METHOD == 'rules':
  loadRules(options.rules)
  createClientConnections( allDestinationServers() )
elif settings.RELAY_METHOD == 'consistent-hashing':
  hosts = parseHostList(settings.CH_HOST_LIST)
  msg('consistent-hashing hosts = %s' % str(hosts))
  setDestinationHosts(hosts)
  createClientConnections(hosts)

startRecording()


# Run the twisted reactor
if options.profile:
  import cProfile

  if exists(options.profile):
    os.unlink(options.profile)

  cProfile.run('reactor.run()', options.profile)

else:
  reactor.run()
