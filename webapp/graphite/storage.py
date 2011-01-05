import os, time, fnmatch, socket, errno
from os.path import isdir, isfile, join, exists, splitext, basename, realpath
import whisper
from graphite.remote_storage import RemoteStore
from django.conf import settings

try:
  import rrdtool
except ImportError:
  rrdtool = False

try:
  import gzip
except ImportError:
  gzip = False

try:
  import cPickle as pickle
except ImportError:
  import pickle


DATASOURCE_DELIMETER = '::RRD_DATASOURCE::'



class Store:
  def __init__(self, directories=[], remote_hosts=[]):
    self.directories = directories
    self.remote_hosts = remote_hosts
    self.remote_stores = [ RemoteStore(host) for host in remote_hosts if not is_local_interface(host) ]

    if not (directories or remote_hosts):
      raise valueError("directories and remote_hosts cannot both be empty")


  def get(self, metric_path): #Deprecated
    for directory in self.directories:
      relative_fs_path = metric_path.replace('.', '/') + '.wsp'
      absolute_fs_path = join(directory, relative_fs_path)

      if exists(absolute_fs_path):
        return WhisperFile(absolute_fs_path, metric_path)


  def find(self, query):
    if is_pattern(query):

      for match in self.find_all(query):
        yield match

    else:
      match = self.find_first(query)

      if match is not None:
        yield match


  def find_first(self, query):
    # Search locally first
    for directory in self.directories:
      for match in find(directory, query):
        return match

    # If nothing found earch remotely
    remote_requests = [ r.find(query) for r in self.remote_stores if r.available ]

    for request in remote_requests:
      for match in request.get_results():
        return match


  def find_all(self, query):
    # Start remote searches
    found = set()
    remote_requests = [ r.find(query) for r in self.remote_stores if r.available ]

    # Search locally
    for directory in self.directories:
      for match in find(directory, query):
        if match.metric_path not in found:
          yield match
          found.add(match.metric_path)

    # Gather remote search results
    for request in remote_requests:
      for match in request.get_results():

        if match.metric_path not in found:
          yield match
          found.add(match.metric_path)


def is_local_interface(host):
  if ':' in host:
    host = host.split(':',1)[0]

  for port in xrange(1025, 65535):
    try:
      sock = socket.socket()
      sock.bind( (host,port) )
      sock.close()

    except socket.error, e:
      if e.args[0] == errno.EADDRNOTAVAIL:
        return False
      else:
        continue

    else:
      return True

  raise Exception("Failed all attempts at binding to interface %s, last exception was %s" % (host, e))


def is_pattern(s):
  return '*' in s or '?' in s or '[' in s


def find(root_dir, pattern):
  "Generates nodes beneath root_dir matching the given pattern"
  pattern_parts = pattern.split('.')

  for absolute_path in _find(root_dir, pattern_parts):

    if DATASOURCE_DELIMETER in basename(absolute_path):
      (absolute_path,datasource_pattern) = absolute_path.rsplit(DATASOURCE_DELIMETER,1)
    else:
      datasource_pattern = None

    relative_path = absolute_path[ len(root_dir): ].lstrip('/')
    metric_path = relative_path.replace('/','.')

    if isdir(absolute_path):
      yield Branch(absolute_path, metric_path)

    elif isfile(absolute_path):
      (metric_path,extension) = splitext(metric_path)

      if extension == '.wsp':
        yield WhisperFile(absolute_path, metric_path)

      elif extension == '.gz' and metric_path.endswith('.wsp'):
        metric_path = splitext(metric_path)[0]
        yield GzippedWhisperFile(absolute_path, metric_path)

      elif rrdtool and extension == '.rrd':
        rrd = RRDFile(absolute_path, metric_path)

        if datasource_pattern is None:
          yield rrd

        else:
          for source in rrd.getDataSources():
            if fnmatch.fnmatch(source.name, datasource_pattern):
              yield source


def _find(current_dir, patterns):
  """Recursively generates absolute paths whose components underneath current_dir
  match the corresponding pattern in patterns"""
  pattern = patterns[0]
  patterns = patterns[1:]
  entries = os.listdir(current_dir)

  subdirs = [e for e in entries if isdir( join(current_dir,e) )]
  matching_subdirs = fnmatch.filter(subdirs, pattern)
  matching_subdirs.sort()

  if len(patterns) == 1 and rrdtool: #the last pattern may apply to RRD data sources
    files = [e for e in entries if isfile( join(current_dir,e) )]
    rrd_files = fnmatch.filter(files, pattern + ".rrd")
    rrd_files.sort()

    if rrd_files: #let's assume it does
      datasource_pattern = patterns[0]

      for rrd_file in rrd_files:
        absolute_path = join(current_dir, rrd_file)
        yield absolute_path + DATASOURCE_DELIMETER + datasource_pattern

  if patterns: #we've still got more directories to traverse
    for subdir in matching_subdirs:

      absolute_path = join(current_dir, subdir)
      for match in _find(absolute_path, patterns):
        yield match

  else: #we've got the last pattern
    files = [e for e in entries if isfile( join(current_dir,e) )]
    matching_files = fnmatch.filter(files, pattern + '.*')
    matching_files.sort()

    for basename in matching_subdirs + matching_files:
      yield join(current_dir, basename)


# Node classes
class Node:
  context = {}

  def __init__(self, fs_path, metric_path):
    self.fs_path = str(fs_path)
    self.metric_path = str(metric_path)
    self.real_metric = str(metric_path)
    self.name = self.metric_path.split('.')[-1]

  def updateContext(self, newContext):
    raise NotImplementedError()


class Branch(Node):
  "Node with children"
  def fetch(self, startTime, endTime):
    "No-op to make all Node's fetch-able"
    return []

  def isLeaf(self):
    return False


class Leaf(Node):
  "(Abstract) Node that stores data"
  def isLeaf(self):
    return True


# Database File classes
class WhisperFile(Leaf):
  cached_context_data = None
  extension = '.wsp'

  def __init__(self, *args, **kwargs):
    Leaf.__init__(self, *args, **kwargs)
    real_fs_path = realpath(self.fs_path)

    if real_fs_path != self.fs_path:
      relative_fs_path = self.metric_path.replace('.', '/') + self.extension
      base_fs_path = self.fs_path[ :-len(relative_fs_path) ]
      relative_real_fs_path = real_fs_path[ len(base_fs_path): ]
      self.real_metric = relative_real_fs_path[ :-len(self.extension) ].replace('/', '.')

  def fetch(self, startTime, endTime):
    (timeInfo,values) = whisper.fetch(self.fs_path, startTime, endTime)
    return (timeInfo,values)

  @property
  def context(self):
    if self.cached_context_data is not None:
      return self.cached_context_data

    context_path = self.fs_path[ :-len(self.extension) ] + '.context.pickle'

    if exists(context_path):
      fh = open(context_path, 'rb')
      context_data = pickle.load(fh)
      fh.close()
    else:
      context_data = {}

    self.cached_context_data = context_data
    return context_data

  def updateContext(self, newContext):
    self.context.update(newContext)
    context_path = self.fs_path[ :-len(self.extension) ] + '.context.pickle'

    fh = open(context_path, 'wb')
    pickle.dump(self.context, fh)
    fh.close()


class GzippedWhisperFile(WhisperFile):
  extension = '.wsp.gz'

  def fetch(self, startTime, endTime):
    if not gzip:
      raise Exception("gzip module not available, GzippedWhisperFile not supported")

    fh = gzip.GzipFile(self.fs_path, 'rb')
    try:
      return whisper.file_fetch(fh, startTime, endTime)
    finally:
      fh.close()


class RRDFile(Branch):
  def getDataSources(self):
    try:
      info = rrdtool.info(self.fs_path)
      return [RRDDataSource(self, source) for source in info['ds']]
    except:
      raise
      return []


class RRDDataSource(Leaf):
  def __init__(self, rrd_file, name):
    self.rrd_file = rrd_file
    self.name = name
    self.fs_path = rrd_file.fs_path
    self.metric_path = rrd_file.metric_path + '.' + name
    self.real_metric = metric_path

  def fetch(self, startTime, endTime):
    startString = time.strftime("%H:%M_%Y%m%d", time.localtime(startTime))
    endString = time.strftime("%H:%M_%Y%m%d", time.localtime(endTime))

    (timeInfo,columns,rows) = rrdtool.fetch(self.fs_path,'AVERAGE','-s' + startString,'-e' + endString)
    colIndex = list(columns).index(self.name)
    rows.pop() #chop off the latest value because RRD returns crazy last values sometimes
    values = (row[colIndex] for row in rows)

    return (timeInfo,values)



# Exposed Storage API
LOCAL_STORE = Store(settings.DATA_DIRS)
STORE = Store(settings.DATA_DIRS, remote_hosts=settings.CLUSTER_SERVERS)
