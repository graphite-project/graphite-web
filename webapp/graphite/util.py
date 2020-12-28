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
import io
import json as _json
import socket
import time
import sys
import calendar
import pytz
import six
import traceback

from datetime import datetime
from functools import wraps
from os.path import splitext, basename

from django.conf import settings
from django.utils.timezone import make_aware

from graphite.compat import HttpResponse
from graphite.logger import log

# BytesIO is needed on py3 as StringIO does not operate on byte input anymore
# We could use BytesIO on py2 as well but it is slower than StringIO
if sys.version_info >= (3, 0):
  PY3 = True
  import pickle
  from io import BytesIO
else:
  PY3 = False
  import cPickle as pickle
  from cStringIO import StringIO as BytesIO

# use https://github.com/msgpack/msgpack-python if available
try:
  import msgpack  # NOQA
# otherwise fall back to bundled https://github.com/vsergeev/u-msgpack-python
except ImportError:
  import graphite.umsgpack as msgpack  # NOQA


def epoch(dt):
  """
  Returns the epoch timestamp of a timezone-aware datetime object.
  """
  if not dt.tzinfo:
    tb = traceback.extract_stack(None, 2)
    log.warning('epoch() called with non-timezone-aware datetime in %s at %s:%d' % (tb[0][2], tb[0][0], tb[0][1]))
    return calendar.timegm(make_aware(dt, pytz.timezone(settings.TIME_ZONE)).astimezone(pytz.utc).timetuple())
  return calendar.timegm(dt.astimezone(pytz.utc).timetuple())


def epoch_to_dt(timestamp):
    """
    Returns the timezone-aware datetime of an epoch timestamp.
    """
    return make_aware(datetime.utcfromtimestamp(timestamp), pytz.utc)


def timebounds(requestContext):
  startTime = int(epoch(requestContext['startTime']))
  endTime = int(epoch(requestContext['endTime']))
  now = int(epoch(requestContext['now']))

  return (startTime, endTime, now)


def is_local_interface(host):
  is_ipv6 = False
  if ':' not in host:
    pass
  elif host.count(':') == 1:
    host = host.split(':', 1)[0]
  else:
    is_ipv6 = True

    if host.find('[', 0, 2) != -1:
      last_bracket_position  = host.rfind(']')
      last_colon_position = host.rfind(':')
      if last_colon_position > last_bracket_position:
        host = host.rsplit(':', 1)[0]
      host = host.strip('[]')

  try:
    if is_ipv6:
      sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    else:
      sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind( (host, 0) )
  except socket.error:
    return False
  finally:
    sock.close()

  return True


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


def load_module(module_path, member=None):
  module_name = splitext(basename(module_path))[0]
  try:  # 'U' is default from Python 3.0 and deprecated since 3.9
    module_file = open(module_path, 'U')
  except ValueError:
    module_file = open(module_path, 'rt')
  description = ('.py', 'U', imp.PY_SOURCE)
  module = imp.load_module(module_name, module_file, module_path, description)
  if member:
    return getattr(module, member)
  else:
    return module


def timestamp(dt):
  "Convert a datetime object into epoch time"
  return time.mktime(dt.timetuple())


def deltaseconds(timedelta):
  "Convert a timedelta object into seconds (same as timedelta.total_seconds() in Python 2.7+)"
  return (timedelta.microseconds + (timedelta.seconds + timedelta.days * 24 * 3600) * 10**6) / 10**6


# This whole song & dance is due to pickle being insecure
# The SafeUnpickler classes were largely derived from
# http://nadiana.com/python-pickle-insecure
# This code also lives in carbon.util
if not PY3:
  class SafeUnpickler(object):
    PICKLE_SAFE = {
      'copy_reg': set(['_reconstructor']),
      '__builtin__': set(['object', 'list', 'set']),
      'collections': set(['deque']),
      'graphite.render.datalib': set(['TimeSeries', 'Tags']),
      'graphite.intervals': set(['Interval', 'IntervalSet']),
    }

    @classmethod
    def find_class(cls, module, name):
      if module not in cls.PICKLE_SAFE:
        raise pickle.UnpicklingError('Attempting to unpickle unsafe module %s' % module)
      __import__(module)
      mod = sys.modules[module]
      if name not in cls.PICKLE_SAFE[module]:
        raise pickle.UnpicklingError('Attempting to unpickle unsafe class %s' % name)
      return getattr(mod, name)

    @classmethod
    def loads(cls, pickle_string):
      pickle_obj = pickle.Unpickler(BytesIO(pickle_string))
      pickle_obj.find_global = cls.find_class
      return pickle_obj.load()

    @classmethod
    def load(cls, file):
      pickle_obj = pickle.Unpickler(file)
      pickle_obj.find_global = cls.find_class
      return pickle_obj.load()

  unpickle = SafeUnpickler

else:
  class SafeUnpickler(pickle.Unpickler):
    PICKLE_SAFE = {
      'copy_reg': set(['_reconstructor']),
      'builtins': set(['object', 'list', 'set']),
      'collections': set(['deque']),
      'graphite.render.datalib': set(['TimeSeries', 'Tags']),
      'graphite.intervals': set(['Interval', 'IntervalSet']),
    }

    def __init__(self, file):
        super().__init__(file, encoding='utf8')

    def find_class(self, module, name):
      if module not in self.PICKLE_SAFE:
        raise pickle.UnpicklingError('Attempting to unpickle unsafe module %s' % module)
      __import__(module)
      mod = sys.modules[module]
      if name not in self.PICKLE_SAFE[module]:
        raise pickle.UnpicklingError('Attempting to unpickle unsafe class %s' % name)
      return getattr(mod, name)

  class unpickle(object):
    @staticmethod
    def loads(pickle_string):
      return SafeUnpickler(BytesIO(pickle_string)).load()

    @staticmethod
    def load(file):
      return SafeUnpickler(file).load()


class json(object):
  JSONEncoder = _json.JSONEncoder
  JSONDecoder = _json.JSONDecoder

  @staticmethod
  def dump(*args, **kwargs):
    return _json.dump(*args, **kwargs)

  @staticmethod
  def dumps(*args, **kwargs):
    return _json.dumps(*args, **kwargs)

  @staticmethod
  def load(fp, *args, **kwargs):
    return _json.load(fp, *args, **kwargs)

  @staticmethod
  def loads(s, *args, **kwargs):
    if isinstance(s, six.binary_type):
      return _json.loads(s.decode('utf-8'), *args, **kwargs)
    return _json.loads(s, *args, **kwargs)


class Timer(object):
  __slots__ = ('msg', 'name', 'start_time')

  def __init__(self, name):
    self.name = name
    self.msg = 'completed in'
    self.start_time = time.time()

  def set_msg(self, msg):
    self.msg = msg

  def set_name(self, name):
    self.name = name

  def stop(self):
    log.info(
      '{name} :: {msg} {sec:.6}s'.format(
        name=self.name,
        msg=self.msg,
        sec=time.time() - self.start_time,
      )
    )


def logtime(f):
  @wraps(f)
  def wrapped_f(*args, **kwargs):
    timer = Timer(f.__module__ + '.' + f.__name__)
    kwargs['timer'] = timer

    try:
      return f(*args, **kwargs)
    except Exception:
      timer.msg = 'failed in'
      raise
    finally:
      timer.stop()

  return wrapped_f


class BufferedHTTPReader(io.FileIO):
  def __init__(self, response, buffer_size=1048576):
    self.response = response
    self.buffer_size = buffer_size
    self.buffer = b''
    self.pos = 0

  def read(self, amt=None):
    if amt is None:
      return self.response.read()
    if len(self.buffer) - self.pos < amt:
      self.buffer = self.buffer[self.pos:]
      self.pos = 0
      self.buffer += self.response.read(self.buffer_size)
    data = self.buffer[self.pos:self.pos + amt]
    self.pos += amt
    if self.pos >= len(self.buffer):
      self.pos = 0
      self.buffer = b''
    return data


def jsonResponse(*args, **kwargs):
  encoder = kwargs.get('encoder')
  default = kwargs.get('default')

  def decorator(f):
    @wraps(f)
    def wrapped_f(request, *args, **kwargs):
      if request.method == 'GET':
        queryParams = request.GET.copy()
      elif request.method == 'POST':
        queryParams = request.GET.copy()
        queryParams.update(request.POST)
      else:
        queryParams = {}

      try:
        return _jsonResponse(
          f(request, queryParams, *args, **kwargs), queryParams, encoder=encoder, default=default)
      except ValueError as err:
        return _jsonError(
          str(err), queryParams, status=getattr(err, 'status', 400), encoder=encoder, default=default)
      except Exception as err:
        return _jsonError(
          str(err), queryParams, status=getattr(err, 'status', 500), encoder=encoder, default=default)

    return wrapped_f

  # used like @jsonResponse
  if args:
    return decorator(args[0])

  # used like @jsonResponse(encoder=DjangoJSONEncoder)
  return decorator


class HttpError(Exception):
  def __init__(self, message, status=500):
    super(HttpError, self).__init__(message)
    self.status=status


def _jsonResponse(data, queryParams, status=200, encoder=None, default=None):
  if isinstance(data, HttpResponse):
    return data

  if not queryParams:
    queryParams = {}

  return HttpResponse(
    json.dumps(
      data,
      indent=(2 if queryParams.get('pretty') else None),
      sort_keys=bool(queryParams.get('pretty')),
      cls=encoder,
      default=default
    ),
    content_type='application/json',
    status=status
  )


def _jsonError(message, queryParams, status=500, encoder=None, default=None):
  return _jsonResponse(
    {'error': message}, queryParams, status=status, encoder=encoder, default=default)


def parseHost(host_string):
    s = host_string.strip()
    bidx = s.rfind(']:')    # find closing bracket and following colon.
    cidx = s.find(':')
    if s.startswith('[') and bidx is not None:
        server = s[1:bidx]
        port = s[bidx + 2:]
    elif cidx is not None:
        server = s[:cidx]
        port = s[cidx + 1:]
    else:
        raise ValueError("Invalid host string \"%s\"" % host_string)

    if ':' in port:
        port, _, instance = port.partition(':')
    else:
        instance = None

    return server, int(port), instance


def parseHosts(host_strings):
    return [parseHost(host_string) for host_string in host_strings]
