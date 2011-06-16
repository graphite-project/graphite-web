#!/usr/bin/env python
import sys
import os
import atexit
from os.path import basename, dirname, exists, join, isdir


program = basename( sys.argv[0] ).split('.')[0]

# Initialize twisted
try:
  from twisted.internet import epollreactor
  epollreactor.install()
except:
  pass
from twisted.internet import reactor


# Figure out where we're installed
BIN_DIR = dirname( os.path.abspath(__file__) )
ROOT_DIR = dirname(BIN_DIR)
LIB_DIR = join(ROOT_DIR, 'lib')

sys.path.insert(0, LIB_DIR)
os.environ['GRAPHITE_ROOT'] = ROOT_DIR

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
    help='Use the give aggregation rules file')

(options, args) = parse_options(parser, sys.argv[1:])
settings = read_config(program, options, ROOT_DIR=ROOT_DIR)
global_settings.update(settings)

if options.rules is None:
    options.rules = join(settings.CONF_DIR, "aggregation-rules.conf")

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
    pid = int( pidfile.read().strip() )
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
    pid = int( pidfile.read().strip() )
  except:
    print 'Failed to read pid from %s' % pidfile
    raise SystemExit(1)

  if exists('/proc/%d' % pid):
    print "%s is running with pid %d" % (program, pid)
    raise SystemExit(0)
  else:
    print "%s is not running" % program
    raise SystemExit(0)

# Import application components
from carbon.log import logToStdout, logToDir
from carbon.instrumentation import startRecording
from carbon.listeners import MetricLineReceiver, MetricPickleReceiver, startListener
from carbon.aggregator.rules import RuleManager
from carbon.aggregator import receiver
from carbon.aggregator import client
from carbon.rewrite import RewriteRuleManager
from carbon.events import metricReceived
from carbon.util import daemonize

RuleManager.read_from(options.rules)

rewrite_rules_conf = join(settings.CONF_DIR, 'rewrite-rules.conf')
if exists(rewrite_rules_conf):
  RewriteRuleManager.read_from(rewrite_rules_conf)

# --debug
if options.debug:
  logToStdout()

else:
  if not isdir(logdir):
    os.makedirs(logdir)

  daemonize()

  pf = open(pidfile, 'w')
  pf.write( str(os.getpid()) )
  pf.close()

  def shutdown():
    if os.path.exists(pidfile):
      os.unlink(pidfile)

  atexit.register(shutdown)

  logToDir(logdir)


# Configure application components
metricReceived.installHandler(receiver.process)
startListener(settings.LINE_RECEIVER_INTERFACE, settings.LINE_RECEIVER_PORT, MetricLineReceiver)
startListener(settings.PICKLE_RECEIVER_INTERFACE, settings.PICKLE_RECEIVER_PORT, MetricPickleReceiver)

client.connect(settings.DESTINATION_HOST, settings.DESTINATION_PORT)
startRecording()


# Run the twisted reactor
print "%s running with pid %d" % (program, os.getpid())

if options.profile:
  import cProfile

  if exists(options.profile):
    os.unlink(options.profile)

  cProfile.run('reactor.run()', options.profile)

else:
  reactor.run()
