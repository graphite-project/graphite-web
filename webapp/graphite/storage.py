import time
from django.conf import settings
from graphite.logger import log
from graphite.util import is_local_interface, is_pattern
from graphite.remote_storage import RemoteStore
from graphite.node import LeafNode
from graphite.intervals import Interval, IntervalSet
from graphite.readers import MultiReader
from graphite.finders import CeresFinder, StandardFinder


class Store:
  def __init__(self, finders, hosts=[]):
    self.finders = finders
    remote_hosts = [host for host in hosts if not is_local_interface(host)]
    self.remote_stores = [ RemoteStore(host) for host in remote_hosts ]


  def find(self, pattern, startTime=None, endTime=None, local=False):
    query = FindQuery(pattern, startTime, endTime)

    # Start remote searches
    if not local:
      remote_requests = [ r.find(query) for r in self.remote_stores if r.available ]

    matching_nodes = set()

    # Search locally
    for finder in self.finders:
      for node in finder.find_nodes(query):
        #log.info("find() :: local :: %s" % node)
        matching_nodes.add(node)

    # Gather remote search results
    if not local:
      for request in remote_requests:
        for node in request.get_results():
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

    return '<FindQuery: %s from %s until %s>' % (self.pattern, startString, endString)


# Exposed Storage API
finders = [
  CeresFinder(settings.CERES_DIR),
  StandardFinder(settings.STANDARD_DIRS),
]
STORE = Store(finders, hosts=settings.CLUSTER_SERVERS)
