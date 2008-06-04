import os, time, fnmatch
from graphite import whisper

try:
  import rrdtool
except ImportError:
  rrdtool = False

# Exposed API
class Finder:
  "Encapsulate find() functionality for one or more directory trees"
  def __init__(self, *dirs):
    self.dirs = dirs

  def find(self, path_pattern):
    for dir in self.dirs:
      for match in find(dir, path_pattern):
        yield match


def find(root_dir, path_pattern):
  """find(root_dir, path_pattern)

  Generates Node's within root_dir that match the given metric path pattern"""
  pattern_parts = iter( path_pattern.split('.') )
  matches = []

  #Walk the directory tree evaluating each component of the path_pattern as we go.
  for (current_dir, subdirs, files) in os.walk(root_dir):
    try:
      #Grab the next component of path_pattern to evaluate against the current level
      current_pattern = pattern_parts.next()
      #Trim subdirs in place to narrow the scope of the walk
      subdirs[:] = fnmatch.filter(subdirs, current_pattern)
      #Keep pointing files at the currently matching files until pattern_parts
      #runs out, leaving us with the proper files when StopIteration gets raised.
      #On the other hand, if the walk stops before pattern_parts runs out,
      #files may contain RRD files that we can dig deeper into.
      files = fnmatch.filter(files, current_pattern)
    except StopIteration:
      #Getting here implies that we ran out of pattern_parts, so we can't walk any
      #farther down the tree, so we yield the currently matching Nodes
      for basename in subdirs + files:
        abs_path = os.path.join(current_dir, basename)
        rel_path = abs_path[ len(root_dir): ].lstrip('/')
        metric_path = rel_path.replace('/','.')
        #yield the appropriate type of Node
        if os.path.isfile(abs_path):
          (metric_path,extension) = os.path.splitext(metric_path)
          if extension == '.wsp':
            yield WhisperFile(fs_path, metric_path)
          elif rrdtool and extension == '.rrd':
            yield RRDFile(fs_path, metric_path)
        elif os.path.isdir(abs_path):
           yield Branch(fs_path, metric_path)
      return

  #Getting down here implies that there are no more directories to walk down but
  #we might still have some pattern_parts to iterate, so we look into RRD files.
  if not rrdtool:
    return

  last_pattern = pattern_parts.next()
  try:
    pattern_parts.next() #if there's still more, the match fails
    return
  except StopIteration:
    pass

  for filename in files:
    if not filename.endswith('.rrd'): continue
    abs_path = os.path.join(current_dir, filename)
    rel_path = abs_path[ len(root_dir): ].lstrip('/')
    metric_path = rel_path.replace('/','.')[:-4] #strip file extension
    my_rrd = RRDFile(fs_path, metric_path)
    #yield the matching data sources inside the rrd
    for source in my_rrd.getDataSources():
      if fnmatch.fnmatch(source.name, last_pattern):
        yield source


# Node classes
class Node:
  def __init__(self, fs_path, metric_path):
    self.fs_path = fs_path
    self.metric_path = metric_path


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
      return info['ds'].keys()
    except:
      return []


class RRDDataSource(Leaf):
  def __init__(self, rrd_file, name):
    self.rrd_file = rrd_file
    self.name = name
    self.fs_path = rrd_file.fs_path
    self.metric_path = rrd_file.metric_path + '.' + name

  def fetch(self, fromTime, untilTime):
    startString = time.strftime("%H:%M_%Y%m%d", time.localtime(fromTime))
    endString = time.strftime("%H:%M_%Y%m%d", time.localtime(untilTime))
    (timeInfo,columns,rows) = rrdtool.fetch(self.fs_path,'AVERAGE','-s' + startString,'-e' + endString)
    colIndex = list(columns).index(self.name)
    rows.pop() #chop off the last row because RRD sucks
    values = (row[colIndex] for row in rows)
    return TimeSeries(timeInfo,values)
