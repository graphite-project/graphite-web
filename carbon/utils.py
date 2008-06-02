"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

import sys, os, time, pwd, traceback

MAX_LOG_SIZE = 1048576 * 100 #100 megs

def die(msg):
  print >> sys.stderr, msg
  sys.exit(1)

class Logger:
  def __init__(self,stream):
    self.stream = stream
    self.written = 0

  def write(self,msg):
    for line in msg.split('\n'):
      if not line.strip(): continue
      try:
        out = "%s:  %s\n" % (time.ctime(),line.rstrip())
        self.stream.write(out)
        self.stream.flush()
        self.written += len(out)
        if self.written >= MAX_LOG_SIZE:
          self.rotateLog()
      except:
        pass #Avoid crashing current thread when disk is full

  def flush(self): return self.stream.flush()
  def close(self): return self.stream.close()
  def fileno(self): return self.stream.fileno()

  def rotateLog(self):
    self.written = 0
    try:
      fileName = self.stream.name
      os.system("cp -f %s %s.previous" % (fileName,fileName))
    except:
      traceback.print_exc()
    try:
      self.stream.seek(0)
      self.stream.truncate()
    except:
      traceback.print_exc()


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

def logify(logfile=None):
  if logfile: fh = open(logfile,'a')
  else: fh = sys.stdout
  sys.stdout = sys.stderr = Logger(fh)

