import os, time, fnmatch, socket, errno
from os.path import isdir, isfile, join, splitext, basename
from graphite import whisper
from graphite import clustering

try:
  import rrdtool
except ImportError:
  rrdtool = False

DATASOURCE_DELIMETER = '::RRD_DATASOURCE::'


class MetricFinder:
  "Encapsulate find() functionality for one or more data stores"

  def __init__(self, dirs):
    self.dirs = dirs
    self.cluster = []

  def configureClusterServers(self, hosts):
    self.cluster = [ clustering.ClusterMember(host) for host in hosts if not is_local_interface(host) ]

  def find(self, pattern):
    if '*' in pattern or '?' in pattern:
      for match in self.find_parallel(pattern):
        yield match
    else:
      match = self.find_first(pattern)

      if match is not None:
        yield match

  def find_first(self, pattern):
    # Search locally first
    for dir in self.dirs:
      for match in find(dir, pattern):
        return match

    # If nothing found earch remotely
    remote_requests = [ member.find(pattern) for member in self.cluster if member.available ]

    for request in remote_requests:
      for match in request.get_results():
        return match

  def find_parallel(self, pattern):
    # Start remote searches
    found = set()
    remote_requests = [ member.find(pattern) for member in self.cluster if member.available ]

    # Search locally
    for dir in self.dirs:
      for match in find(dir, pattern):
        if match.graphite_path not in found:
          yield match
          found.add(match.graphite_path)

    # Gather remote search results
    for remote_request in remote_requests:
      for match in remote_request.get_results():
        if match.graphite_path not in found:
          yield match
          found.add(match.graphite_path)


def is_local_interface(host):
  if ':' in host:
    host = host.split(':',1)[0]

  try:
    sock = socket.socket()
    sock.bind( (host,42) ) #port doesn't matter
    sock.close()
  except Exception, e:
    if hasattr(e,'errno') and e.errno == errno.EADDRNOTAVAIL:
      return False

  return True


def find(root_dir, pattern):
  "Generates nodes beneath root_dir matching the given pattern"
  pattern_parts = pattern.split('.')

  for absolute_path in _find(root_dir, pattern_parts):

    if DATASOURCE_DELIMETER in basename(absolute_path):
      (absolute_path,datasource_pattern) = absolute_path.rsplit(DATASOURCE_DELIMETER,1)
    else:
      datasource_pattern = None

    relative_path = absolute_path[ len(root_dir): ].lstrip('/')
    graphite_path = relative_path.replace('/','.')

    if isdir(absolute_path):
      yield Branch(absolute_path, graphite_path)
    elif isfile(absolute_path):
      (graphite_path,extension) = splitext(graphite_path)
      if extension == '.wsp':
        yield WhisperFile(absolute_path, graphite_path)
      elif rrdtool and extension == '.rrd':
        rrd = RRDFile(absolute_path, graphite_path)
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

  if len(patterns) == 1 and rrdtool: #the last pattern may apply to RRD data sources
    files = [e for e in entries if isfile( join(current_dir,e) )]
    rrd_files = fnmatch.filter(files, pattern + ".rrd")
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
    for basename in matching_subdirs + matching_files:
      yield join(current_dir, basename)


# Node classes
class Node:
  def __init__(self, fs_path, graphite_path):
    self.fs_path = str(fs_path)
    self.graphite_path = str(graphite_path)
    self.name = self.graphite_path.split('.')[-1]


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
  def fetch(self, startTime, endTime):
    (timeInfo,values) = whisper.fetch(self.fs_path, startTime, endTime)
    return (timeInfo,values)


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
    self.graphite_path = rrd_file.graphite_path + '.' + name

  def fetch(self, startTime, endTime):
    startString = time.strftime("%H:%M_%Y%m%d", time.localtime(startTime))
    endString = time.strftime("%H:%M_%Y%m%d", time.localtime(endTime))
    (timeInfo,columns,rows) = rrdtool.fetch(self.fs_path,'AVERAGE','-s' + startString,'-e' + endString)
    colIndex = list(columns).index(self.name)
    rows.pop() #chop off the latest value because RRD returns crazy last values sometimes
    values = (row[colIndex] for row in rows)
    return (timeInfo,values)
