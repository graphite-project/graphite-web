#!/usr/bin/env python
import sys
import os
import optparse
import atexit
from os.path import basename, dirname, exists, join, isdir


program = basename( sys.argv[0] )

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
STORAGE_DIR = join(ROOT_DIR, 'storage')
LOG_DIR = join(STORAGE_DIR, 'log', 'carbon-aggregator')
LIB_DIR = join(ROOT_DIR, 'lib')
CONF_DIR = join(ROOT_DIR, 'conf')

sys.path.insert(0, LIB_DIR)
os.environ['GRAPHITE_ROOT'] = ROOT_DIR

# Parse command line options
parser = optparse.OptionParser(usage='%prog [options] <start|stop|status>')
parser.add_option('--debug', action='store_true', help='Run in the foreground, log to stdout')
parser.add_option('--profile', help='Record performance profile data to the given file')
parser.add_option('--pidfile', default=join(STORAGE_DIR, '%s.pid' % program.split('.')[0]), help='Write pid to the given file')
parser.add_option('--config', default=join(CONF_DIR, 'carbon.conf'), help='Use the given config file')
parser.add_option('--rules', default=join(CONF_DIR, 'aggregation-rules.conf'), help='Use the give aggregation rules file')
parser.add_option('--logdir', default=LOG_DIR, help="Write logs in the given directory")

(options, args) = parser.parse_args()

if not args:
  parser.print_usage()
  raise SystemExit(1)

action = args[0]

if action == 'stop':
  if not exists(options.pidfile):
    print 'Pidfile %s does not exist' % options.pidfile
    raise SystemExit(0)

  pidfile = open(options.pidfile, 'r')
  try:
    pid = int( pidfile.read().strip() )
  except:
    print 'Could not read pidfile %s' % options.pidfile
    raise SystemExit(1)

  print 'Deleting %s (contained pid %d)' % (options.pidfile, pid)
  os.unlink(options.pidfile)

  print 'Sending kill signal to pid %d' % pid
  os.kill(pid, 15)
  raise SystemExit(0)


elif action == 'status':
  if not exists(options.pidfile):
    print '%s is not running' % program
    raise SystemExit(0)

  pidfile = open(options.pidfile, 'r')
  try:
    pid = int( pidfile.read().strip() )
  except:
    print 'Failed to read pid from %s' % options.pidfile
    raise SystemExit(1)

  if exists('/proc/%d' % pid):
    print "%s is running with pid %d" % (program, pid)
    raise SystemExit(0)
  else:
    print "%s is not running" % program
    raise SystemExit(0)

elif action != 'start':
  parser.print_usage()
  raise SystemExit(1)


if exists(options.pidfile):
  print "Pidfile %s already exists, is %s already running?" % (options.pidfile, program)
  raise SystemExit(1)


# Read config (we want failures to occur before daemonizing)
from carbon.conf import settings
settings.readFrom(options.config, 'aggregator')


# Import application components
from carbon.log import logToStdout, logToDir
from carbon.instrumentation import startRecordingAggregatorMetrics
from carbon.listeners import MetricLineReceiver, MetricPickleReceiver, startListener
from carbon.aggregator.rules import RuleManager
from carbon.aggregator import receiver
from carbon.aggregator import client
from carbon.rewrite import RewriteRuleManager
from carbon.events import metricReceived
from carbon.util import daemonize

RuleManager.read_from(options.rules)

rewrite_rules_conf = join(CONF_DIR, 'rewrite-rules.conf')
if exists(rewrite_rules_conf):
  RewriteRuleManager.read_from(rewrite_rules_conf)

# --debug
if options.debug:
  logToStdout()

else:
  if not isdir(options.logdir):
    os.makedirs(options.logdir)

  daemonize()

  pidfile = open(options.pidfile, 'w')
  pidfile.write( str(os.getpid()) )
  pidfile.close()

  def shutdown():
    if os.path.exists(options.pidfile):
      os.unlink(options.pidfile)

  atexit.register(shutdown)

  logToDir(options.logdir)


# Configure application components
metricReceived.installHandler(receiver.process)
startListener(settings.LINE_RECEIVER_INTERFACE, settings.LINE_RECEIVER_PORT, MetricLineReceiver)
startListener(settings.PICKLE_RECEIVER_INTERFACE, settings.PICKLE_RECEIVER_PORT, MetricPickleReceiver)

client.connect(settings.DESTINATION_HOST, settings.DESTINATION_PORT)
startRecordingAggregatorMetrics()


# Run the twisted reactor
print "%s running with pid %d" % (program, os.getpid())

if options.profile:
  import cProfile

  if exists(options.profile):
    os.unlink(options.profile)

  cProfile.run('reactor.run()', options.profile)

else:
  reactor.run()
