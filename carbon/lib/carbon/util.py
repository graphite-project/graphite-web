import os
import errno
import pwd

from os.path import abspath, basename, dirname, isdir, join
from signal import SIGTERM

from twisted.python.util import initgroups
from twisted.scripts.twistd import runApp
from twisted.scripts._twistd_unix import daemonize


daemonize = daemonize # Backwards compatibility


def dropprivs(user):
  uid, gid = pwd.getpwnam(user)[2:4]
  initgroups(uid, gid)
  os.setregid(gid, gid)
  os.setreuid(uid, uid)
  return (uid, gid)


def run_twistd_plugin(filename):
    from carbon.conf import get_parser
    from twisted.scripts.twistd import ServerOptions

    bin_dir = dirname(abspath(filename))
    root_dir = dirname(bin_dir)
    os.environ.setdefault('GRAPHITE_ROOT', root_dir)
    storage_dir = os.environ.setdefault('GRAPHITE_STORAGE_DIR',
                                        join(root_dir, 'storage'))

    program = basename(filename).split('.')[0]

    # First, parse command line options as the legacy carbon scripts used to
    # do.
    parser = get_parser(program)
    (options, args) = parser.parse_args()

    if not args:
      parser.print_usage()
      return

    # This isn't as evil as you might think
    __builtins__["instance"] = options.instance
    __builtins__["program"] = program

    if instance:
      prog_name = program + '-' + instance
    else:
      prog_name = program

    if options.pidfile:
      pidfile = options.pidfile
    else:
      pidfile = join(storage_dir, prog_name + '.pid')
    running_pid = get_running_pid(pidfile)

    action = args[0]
    if action == 'start':
      if running_pid is not None:
        print "%s already running (pid %d)" % (prog_name, running_pid)
        return

    elif action == 'stop':
      if running_pid is None:
        print "%s is not running" % prog_name
      else:
        print "Sending SIGTERM to pid %d" % running_pid
        try:
          os.kill(running_pid, SIGTERM)
        except OSError, e:
          if e.errno == errno.ESRCH:
            print "No such process"
          elif e.errno == errno.EPERM:
            print "You do not have permission to kill this process."
          else:
            raise
      return

    elif action == 'status':
      if running_pid is None:
        print "%s is not running" % prog_name
      else:
        print "%s is running with pid %d" % (prog_name, running_pid)
      return

    else:
      print "Invalid action: %s" % action
      parser.print_usage()
      return

    # Then forward applicable options to either twistd or to the plugin itself.
    twistd_options = ["--no_save"]
    if options.debug:
        twistd_options.extend(["-n", "--logfile", "-"])
    if options.profile:
        twistd_options.append("--profile")
    twistd_options.extend(["--pidfile", options.pidfile])

    # Now for the plugin-specific options.
    twistd_options.append(program)

    if options.debug:
        twistd_options.append("--debug")

    for option_name, option_value in vars(options).items():
        if (option_value is not None and
            option_name not in ("debug", "profile", "pidfile")):
            twistd_options.extend(["--%s" % option_name.replace("_", "-"),
                                   option_value])

    # Finally, append extra args so that twistd has a chance to process them.
    twistd_options.extend(args)

    config = ServerOptions()
    config.parseOptions(twistd_options)

    runApp(config)


def get_running_pid(pidfile):
  try:
    pid = int( open(pidfile).read().strip() )
    if isdir('/proc'):
      assert isdir('/proc/%d' % pid)
    return pid
  except:
    return None
