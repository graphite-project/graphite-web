import os
import sys
import pwd

from os.path import dirname, basename, abspath, isdir

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


def run_tac(tac_file):
    from carbon.log import logToDir
    from carbon.conf import ServerOptions, settings

    config = ServerOptions()
    config["python"] = tac_file
    config["umask"] = 022
    config.parseOptions()

    program = basename(tac_file).split('.')[0]

    if not config["nodaemon"]:
        logdir = settings.LOG_DIR
        if not isdir(logdir):
            os.makedirs(logdir)
        logToDir(logdir)

    # This isn't as evil as you might think
    __builtins__["instance"] = config["instance"]
    __builtins__["program"] = program

    runApp(config)
