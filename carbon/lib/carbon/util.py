import os
import pwd

from os.path import basename, isdir

import carbon

from twisted.application import service
from twisted import plugin
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
    plugins = {}
    for plug in plugin.getPlugins(service.IServiceMaker):
        plugins[plug.tapname] = plug

    program = basename(tac_file).split('.')[0]
    config = plugins[program].options()
    config["python"] = tac_file
    config.parseOptions()

    # This isn't as evil as you might think
    __builtins__["instance"] = config["instance"]
    __builtins__["program"] = program

    runApp(config)
