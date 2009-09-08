import sys
import os
import pwd


def daemonize():
  if os.fork() > 0: sys.exit(0)
  os.setsid()
  if os.fork() > 0: sys.exit(0)
  si = open('/dev/null', 'r')
  so = open('/dev/null', 'a+')
  se = open('/dev/null', 'a+', 0)
  os.dup2(si.fileno(), sys.stdin.fileno())
  os.dup2(so.fileno(), sys.stdout.fileno())
  os.dup2(se.fileno(), sys.stderr.fileno())


def dropprivs(user):
  uid,gid = pwd.getpwnam(user)[2:4]
  os.setregid(gid,gid)
  os.setreuid(uid,uid)
  return (uid,gid)
