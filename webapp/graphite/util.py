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

import sys

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
from django.core.exceptions import ObjectDoesNotExist
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


def getProfile(request,allowDefault=True):
  if request.user.is_authenticated():
    try:
      return request.user.profile
    except ObjectDoesNotExist:
      profile = Profile(user=request.user)
      profile.save()
      return profile
  elif allowDefault:
    return defaultProfile

def getProfileByUsername(username):
  try:
    user = User.objects.get(username=username)
    return Profile.objects.get(user=user)
  except ObjectDoesNotExist:
    return None


if not environ.get('READTHEDOCS'):
  try:
    defaultUser = User.objects.get(username='default')
  except User.DoesNotExist:
    log.info("Default user does not exist, creating it...")
    randomPassword = User.objects.make_random_password(length=16)
    defaultUser = User.objects.create_user('default','default@localhost.localdomain',randomPassword)
    defaultUser.save()

  try:
    defaultProfile = Profile.objects.get(user=defaultUser)
  except Profile.DoesNotExist:
    log.info("Default profile does not exist, creating it...")
    defaultProfile = Profile(user=defaultUser)
    defaultProfile.save()

# This whole song & dance is due to pickle being insecure
# The SafeUnpickler classes were largely derived from
# http://nadiana.com/python-pickle-insecure
# This code also lives in carbon.util
if USING_CPICKLE:
  class SafeUnpickler(object):
    PICKLE_SAFE = {
      'copy_reg': set(['_reconstructor']),
      '__builtin__': set(['object', 'list']),
      'graphite.intervals': set(['Interval', 'IntervalSet']),
      'graphite.render.datalib': set(['TimeSeries']),
      'collections': set(['deque']),
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
      '__builtin__': set(['object', 'list']),
      'graphite.intervals': set(['Interval', 'IntervalSet']),
      'graphite.render.datalib': set(['TimeSeries']),
      'collections': set(['deque']),
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
