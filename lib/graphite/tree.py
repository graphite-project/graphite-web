import os, time, fnmatch
from os.path import isdir, isfile, join, splitext, basename
from graphite import whisper

try:
  import rrdtool
except ImportError:
  rrdtool = False

# Exposed API
class Finder:
  "Encapsulate find() functionality for one or more directory trees"
  def __init__(self, dirs):
    self.dirs = dirs

  def find(self, path_pattern):
    for dir in self.dirs:
      for match in find(dir, path_pattern):
        yield match


def find(root_dir, pattern):
  "Generates nodes beneath root_dir matching the given pattern"
  pattern_parts = pattern.split('.')

  for absolute_path in _find(root_dir, pattern_parts):

    if '::' in basename(absolute_path):
      (absolute_path,datasource_pattern) = absolute_path.rsplit('::',1)
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
  entries = os.listdir(current_dir)
  pattern = patterns.pop(0)

  subdirs = [e for e in entries if isdir( join(current_dir,e) )]
  matching_subdirs = fnmatch.filter(subdirs, pattern)

  if len(patterns) == 1 and rrdtool: #the last pattern may apply to RRD data sources
    files = [e for e in entries if isfile( join(current_dir,e) )]
    rrd_files = fnmatch.filter(files, pattern + ".rrd")
    if rrd_files: #let's assume it does
      datasource_pattern = patterns[0]
      for rrd_file in rrd_files:
        absolute_path = join(current_dir, rrd_file)
        yield absolute_path + '::' + datasource_pattern

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
    self.fs_path = fs_path
    self.graphite_path = graphite_path
    self.name = graphite_path.split('.')[-1]


class Branch(Node):
  "Node with children"
  def isLeaf(self):
    return False


class Leaf(Node):
  "(Abstract) Node that stores data"
  def isLeaf(self):
    return True


# Database File classes
class WhisperFile(Leaf):
  def fetch(self, fromTime, untilTime):
    (timeInfo,values) = whisper.fetch(self.fs_path, fromTime, untilTime)
    (start,end,step) = timeInfo
    return TimeSeries(timeInfo,values)


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

  def fetch(self, fromTime, untilTime):
    startString = time.strftime("%H:%M_%Y%m%d", time.localtime(fromTime))
    endString = time.strftime("%H:%M_%Y%m%d", time.localtime(untilTime))
    (timeInfo,columns,rows) = rrdtool.fetch(self.fs_path,'AVERAGE','-s' + startString,'-e' + endString)
    colIndex = list(columns).index(self.name)
    rows.pop() #chop off the last row because RRD sucks
    values = (row[colIndex] for row in rows)
    return TimeSeries(timeInfo,values)
