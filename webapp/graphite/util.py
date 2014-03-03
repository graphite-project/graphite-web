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

import imp
import os
import socket
import errno
import time
import sys
from os.path import splitext, basename
from shutil import move
from tempfile import mkstemp
try:
  import cPickle as pickle
  USING_CPICKLE = True
except:
  import pickle
  USING_CPICKLE = False

try:
  from cStringIO import StringIO
except ImportError:
  from StringIO import StringIO

from os import environ
from django.conf import settings
from django.contrib.auth.models import User
from graphite.account.models import Profile
from graphite.logger import log


# There are a couple different json modules floating around out there with
# different APIs. Hide the ugliness here.
try:
  import json
except ImportError:
  import simplejson as json

if hasattr(json, 'read') and not hasattr(json, 'loads'):
  json.loads = json.read
  json.dumps = json.write
  json.load = lambda file: json.read( file.read() )
  json.dump = lambda obj, file: file.write( json.write(obj) )


def getProfile(request, allowDefault=True):
  if request.user.is_authenticated():
    return Profile.objects.get_or_create(user=request.user)[0]
  elif allowDefault:
    return default_profile()


def getProfileByUsername(username):
  try:
    return Profile.objects.get(user__username=username)
  except Profile.DoesNotExist:
    return None


def is_local_interface(host):
  if ':' in host:
    host = host.split(':',1)[0]

  try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.connect( (host, 4242) )
    local_ip = sock.getsockname()[0]
    sock.close()
  except:
    log.exception("Failed to open socket with %s" % host)
    raise

  if local_ip == host:
    return True

  return False


def is_pattern(s):
   return '*' in s or '?' in s or '[' in s or '{' in s

def is_escaped_pattern(s):
  for symbol in '*?[{':
    i = s.find(symbol)
    if i > 0:
      if s[i-1] == '\\':
        return True
  return False

def find_escaped_pattern_fields(pattern_string):
  pattern_parts = pattern_string.split('.')
  for index,part in enumerate(pattern_parts):
    if is_escaped_pattern(part):
      yield index


def default_profile():
    # '!' is an unusable password. Since the default user never authenticates
    # this avoids creating a default (expensive!) password hash at every
    # default_profile() call.
    user, created = User.objects.get_or_create(
        username='default', defaults={'email': 'default@localhost.localdomain',
                                      'password': '!'})
    if created:
        log.info("Default user didn't exist, created it")
    profile, created = Profile.objects.get_or_create(user=user)
    if created:
        log.info("Default profile didn't exist, created it")
    return profile


def load_module(module_path, member=None):
  module_name = splitext(basename(module_path))[0]
  module_file = open(module_path, 'U')
  description = ('.py', 'U', imp.PY_SOURCE)
  module = imp.load_module(module_name, module_file, module_path, description)
  if member:
    return getattr(module, member)
  else:
    return module

def timestamp(datetime):
  "Convert a datetime object into epoch time"
  return time.mktime( datetime.timetuple() )

# This whole song & dance is due to pickle being insecure
# The SafeUnpickler classes were largely derived from
# http://nadiana.com/python-pickle-insecure
# This code also lives in carbon.util
if USING_CPICKLE:
  class SafeUnpickler(object):
    PICKLE_SAFE = {
      'copy_reg': set(['_reconstructor']),
      '__builtin__': set(['object']),
      'graphite.intervals': set(['Interval', 'IntervalSet']),
    }

    @classmethod
    def find_class(cls, module, name):
      if not module in cls.PICKLE_SAFE:
        raise pickle.UnpicklingError('Attempting to unpickle unsafe module %s' % module)
      __import__(module)
      mod = sys.modules[module]
      if not name in cls.PICKLE_SAFE[module]:
        raise pickle.UnpicklingError('Attempting to unpickle unsafe class %s' % name)
      return getattr(mod, name)

    @classmethod
    def loads(cls, pickle_string):
      pickle_obj = pickle.Unpickler(StringIO(pickle_string))
      pickle_obj.find_global = cls.find_class
      return pickle_obj.load()

else:
  class SafeUnpickler(pickle.Unpickler):
    PICKLE_SAFE = {
      'copy_reg': set(['_reconstructor']),
      '__builtin__': set(['object']),
      'graphite.intervals': set(['Interval', 'IntervalSet']),
    }

    def find_class(self, module, name):
      if not module in self.PICKLE_SAFE:
        raise pickle.UnpicklingError('Attempting to unpickle unsafe module %s' % module)
      __import__(module)
      mod = sys.modules[module]
      if not name in self.PICKLE_SAFE[module]:
        raise pickle.UnpicklingError('Attempting to unpickle unsafe class %s' % name)
      return getattr(mod, name)

    @classmethod
    def loads(cls, pickle_string):
      return cls(StringIO(pickle_string)).load()

unpickle = SafeUnpickler


def write_index(whisper_dir=None, ceres_dir=None, index=None):
  if not whisper_dir:
    whisper_dir = settings.WHISPER_DIR
  if not ceres_dir:
    ceres_dir = settings.CERES_DIR
  if not index:
    index = settings.INDEX_FILE
  try:
    fd, tmp = mkstemp()
    try:
      tmp_index = os.fdopen(fd, 'wt')
      build_index(whisper_dir, ".wsp", tmp_index)
      build_index(ceres_dir, ".ceres-node", tmp_index)
    finally:
      tmp_index.close()
    move(tmp, index)
  finally:
    try:
      os.unlink(tmp)
    except:
      pass
  return None


def build_index(base_path, extension, fd):
  t = time.time()
  total_entries = 0
  contents = os.walk(base_path, followlinks=True)
  extension_len = len(extension)
  for (dirpath, dirnames, filenames) in contents:
    path = dirpath[len(base_path):].replace('/', '.')
    for metric in filenames:
      if metric.endswith(extension):
        metric = metric[:-extension_len]
      else:
        continue
      line = "{0}.{1}\n".format(path, metric)
      total_entries += 1
      fd.write(line)
  fd.flush()
  log.info("[IndexSearcher] index rebuild of \"%s\" took %.6f seconds (%d entries)" % (base_path, time.time() - t, total_entries))
  return None
