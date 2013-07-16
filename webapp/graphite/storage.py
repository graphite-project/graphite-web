import time
from django.conf import settings
from graphite.logger import log
from graphite.util import is_local_interface, is_pattern
from graphite.remote_storage import RemoteStore
from graphite.node import LeafNode
from graphite.intervals import Interval, IntervalSet
from graphite.readers import MultiReader
from graphite.finders import CeresFinder, StandardFinder
from render.decorators import limit_time_range

class Store:
  def __init__(self, finders, hosts=[]):
    self.finders = finders
    remote_hosts = [host for host in hosts if not is_local_interface(host)]
    self.remote_stores = [ RemoteStore(host) for host in remote_hosts ]

  def find(self, pattern, startTime=None, endTime=None, local=False, job_nodes=[]): # Add an optional argument: the list of nodes the job has run on
    query = FindQuery(pattern, startTime, endTime)

    # Start remote searches
    if not local:
      remote_requests = [ r.find(query) for r in self.remote_stores if r.available ]

    matching_nodes = set()

    # Search locally
    for finder in self.finders:
      for node in finder.find_nodes(query):
        if node.metric_path.split('.', 1)[0] in job_nodes:
          #log.info("find() :: local :: %s" % node)
          matching_nodes.add(node)

    # Gather remote search results
    if not local:
      for request in remote_requests:
        for node in request.get_results():
          if node.metric_path.split('.', 1)[0] in job_nodes:
          #log.info("find() :: remote :: %s from %s" % (node,request.store.host))
          matching_nodes.add(node)

    # Group matching nodes by their path
    nodes_by_path = {}
    for node in matching_nodes:
      if node.path not in nodes_by_path:
        nodes_by_path[node.path] = []

      nodes_by_path[node.path].append(node)

    # Reduce matching nodes for each path to a minimal set
    found_branch_nodes = set()

    for path, nodes in nodes_by_path.iteritems():
      leaf_nodes = []

      # First we dispense with the BranchNodes
      for node in nodes:
        if node.is_leaf:
          leaf_nodes.append(node)
        elif node.path not in found_branch_nodes: #TODO need to filter branch nodes based on requested interval... how?!?!?
          yield node
          found_branch_nodes.add(node.path)

      if not leaf_nodes:
        continue

      # Calculate best minimal node set
      minimal_node_set = set()
      covered_intervals = IntervalSet([])

      # If the query doesn't fall entirely within the FIND_TOLERANCE window
      # we disregard the window. This prevents unnecessary remote fetches
      # caused when carbon's cache skews node.intervals, giving the appearance
      # remote systems have data we don't have locally, which we probably do.
      now = int( time.time() )
      tolerance_window = now - settings.FIND_TOLERANCE
      disregard_tolerance_window = query.interval.start < tolerance_window
      prior_to_window = Interval( float('-inf'), tolerance_window )

      def measure_of_added_coverage(node, drop_window=disregard_tolerance_window):
        relevant_intervals = node.intervals.intersect_interval(query.interval)
        if drop_window:
          relevant_intervals = relevant_intervals.intersect_interval(prior_to_window)
        return covered_intervals.union(relevant_intervals).size - covered_intervals.size

      nodes_remaining = list(leaf_nodes)

      # Prefer local nodes first (and do *not* drop the tolerance window)
      for node in leaf_nodes:
        if node.local and measure_of_added_coverage(node, False) > 0:
          nodes_remaining.remove(node)
          minimal_node_set.add(node)
          covered_intervals = covered_intervals.union(node.intervals)

      while nodes_remaining:
        node_coverages = [ (measure_of_added_coverage(n), n) for n in nodes_remaining ]
        best_coverage, best_node = max(node_coverages)

        if best_coverage == 0:
          break

        nodes_remaining.remove(best_node)
        minimal_node_set.add(best_node)
        covered_intervals = covered_intervals.union(best_node.intervals)

      # Sometimes the requested interval falls within the caching window.
      # We include the most likely node if the gap is within tolerance.
      if not minimal_node_set:
        def distance_to_requested_interval(node):
          latest = sorted(node.intervals, key=lambda i: i.end)[-1]
          distance = query.interval.start - latest.end
          return distance if distance >= 0 else float('inf')

        best_candidate = min(leaf_nodes, key=distance_to_requested_interval)
        if distance_to_requested_interval(best_candidate) <= settings.FIND_TOLERANCE:
          minimal_node_set.add(best_candidate)

      if len(minimal_node_set) == 1:
        yield minimal_node_set.pop()
      elif len(minimal_node_set) > 1:
        reader = MultiReader(minimal_node_set)
        yield LeafNode(path, reader)



class FindQuery:
  def __init__(self, pattern, startTime, endTime):
    self.pattern = pattern
    self.startTime = startTime
    self.endTime = endTime
    self.isExact = is_pattern(pattern)
    self.interval = Interval(float('-inf') if startTime is None else startTime,
                             float('inf') if endTime is None else endTime)


  def __repr__(self):
    if self.startTime is None:
      startString = '*'
    else:
      startString = time.ctime(self.startTime)

    if self.endTime is None:
      endString = '*'
    else:
      endString = time.ctime(self.endTime)
      datasource_pattern = None

    relative_path = absolute_path[ len(root_dir): ].lstrip('/')
    metric_path = relative_path.replace('/','.')

    # Preserve pattern in resulting path for escaped query pattern elements
    metric_path_parts = metric_path.split('.')
    for field_index in find_escaped_pattern_fields(pattern):
      metric_path_parts[field_index] = pattern_parts[field_index].replace('\\', '')
    metric_path = '.'.join(metric_path_parts)

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
  matching_subdirs = match_entries(subdirs, pattern)

  if len(patterns) == 1 and rrdtool: #the last pattern may apply to RRD data sources
    files = [e for e in entries if isfile( join(current_dir,e) )]
    rrd_files = match_entries(files, pattern + ".rrd")

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
    matching_files = match_entries(files, pattern + '.*')

    for basename in matching_files + matching_subdirs:
      yield join(current_dir, basename)


def _deduplicate(entries):
  yielded = set()
  for entry in entries:
    if entry not in yielded:
      yielded.add(entry)
      yield entry


def match_entries(entries, pattern):
  # First we check for pattern variants (ie. {foo,bar}baz = foobaz or barbaz)
  v1, v2 = pattern.find('{'), pattern.find('}')

  if v1 > -1 and v2 > v1:
    variations = pattern[v1+1:v2].split(',')
    variants = [ pattern[:v1] + v + pattern[v2+1:] for v in variations ]
    matching = []

    for variant in variants:
      matching.extend( fnmatch.filter(entries, variant) )

    return list( _deduplicate(matching) ) #remove dupes without changing order

  else:
    matching = fnmatch.filter(entries, pattern)
    matching.sort()
    return matching


# Node classes
class Node:
  context = {}

  def __init__(self, fs_path, metric_path):
    self.fs_path = str(fs_path)
    self.metric_path = str(metric_path)
    self.real_metric = str(metric_path)
    self.name = self.metric_path.split('.')[-1]

  def getIntervals(self):
    return []

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
      base_fs_path = realpath(self.fs_path[ :-len(relative_fs_path) ])
      relative_real_fs_path = real_fs_path[ len(base_fs_path)+1: ]
      self.real_metric = relative_real_fs_path[ :-len(self.extension) ].replace('/', '.')

  def getIntervals(self):
    start = time.time() - whisper.info(self.fs_path)['maxRetention']
    end = max( os.stat(self.fs_path).st_mtime, start )
    return [ (start, end) ]

  def fetch(self, startTime, endTime):
    return whisper.fetch(self.fs_path, startTime, endTime)

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
<<<<<<< HEAD
<<<<<<< HEAD

  @limit_time_range
=======

>>>>>>> Large code cleanup: generified jobs.py, adapted old code to this change, made a specific render method for the json_tree
=======

>>>>>>> Bugfix for the nodes shown
  def fetch(self, startTime, endTime):
    if not gzip:
      raise Exception("gzip module not available, GzippedWhisperFile not supported")

    fh = gzip.GzipFile(self.fs_path, 'rb')
    try:
      return whisper.file_fetch(fh, startTime, endTime)
    finally:
      fh.close()

  def getIntervals(self):
    if not gzip:
      return []

    fh = gzip.GzipFile(self.fs_path, 'rb')
    try:
      start = time.time() - whisper.__readHeader(fh)['maxRetention']
      end = max( os.stat(self.fs_path).st_mtime, start )
    finally:
      fh.close()
    return [ (start, end) ]


class RRDFile(Branch):
  def getDataSources(self):
    info = rrdtool.info(self.fs_path)
    if 'ds' in info:
      return [RRDDataSource(self, datasource_name) for datasource_name in info['ds']]
    else:
      ds_keys = [ key for key in info if key.startswith('ds[') ]
      datasources = set( key[3:].split(']')[0] for key in ds_keys )
      return [ RRDDataSource(self, ds) for ds in datasources ]

  def getRetention(self):
    info = rrdtool.info(self.fs_path)
    if 'rra' in info:
      rras = info['rra']
    else:
      # Ugh, I like the old python-rrdtool api better..
      rra_count = max([ int(key[4]) for key in info if key.startswith('rra[') ]) + 1
      rras = [{}] * rra_count
      for i in range(rra_count):
        rras[i]['pdp_per_row'] = info['rra[%d].pdp_per_row' % i]
        rras[i]['rows'] = info['rra[%d].rows' % i]

    retention_points = 0
    for rra in rras:
      points = rra['pdp_per_row'] * rra['rows']
      if points > retention_points:
        retention_points = points

    return  retention_points * info['step']


class RRDDataSource(Leaf):
  def __init__(self, rrd_file, name):
    Leaf.__init__(self, rrd_file.fs_path, rrd_file.metric_path + '.' + name)
    self.rrd_file = rrd_file

  def getIntervals(self):
    start = time.time() - self.rrd_file.getRetention()
    end = max( os.stat(self.rrd_file.fs_path).st_mtime, start )
    return [ (start, end) ]

  def fetch(self, startTime, endTime):
    startString = time.strftime("%H:%M_%Y%m%d+%Ss", time.localtime(startTime))
    endString = time.strftime("%H:%M_%Y%m%d+%Ss", time.localtime(endTime))

    if settings.FLUSHRRDCACHED:
      rrdtool.flushcached(self.fs_path, '--daemon', settings.FLUSHRRDCACHED)
    (timeInfo,columns,rows) = rrdtool.fetch(self.fs_path,'AVERAGE','-s' + startString,'-e' + endString)
    colIndex = list(columns).index(self.name)
    rows.pop() #chop off the latest value because RRD returns crazy last values sometimes
    values = (row[colIndex] for row in rows)

    return (timeInfo,values)

    return '<FindQuery: %s from %s until %s>' % (self.pattern, startString, endString)


# Exposed Storage API
finders = [
  CeresFinder(settings.CERES_DIR),
  StandardFinder(settings.STANDARD_DIRS),
]
STORE = Store(finders, hosts=settings.CLUSTER_SERVERS)
