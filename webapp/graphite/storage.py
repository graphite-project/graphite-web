import time
import random
import threading
import Queue

try:
  from importlib import import_module
except ImportError:  # python < 2.7 compatibility
  from django.utils.importlib import import_module

from django.conf import settings

from graphite.logger import log
from graphite.util import is_local_interface, is_pattern
from graphite.remote_storage import RemoteStore
from graphite.node import LeafNode
from graphite.intervals import Interval, IntervalSet
from graphite.readers import MultiReader
from graphite.worker_pool.pool import get_pool


def get_finder(finder_path):
  module_name, class_name = finder_path.rsplit('.', 1)
  module = import_module(module_name)
  return getattr(module, class_name)()


def find_into_queue(finder, query, result_queue):
  # iterate over the returned generator
  result_queue.put([node for node in finder.find_nodes(query)])


class Store:
  def __init__(self, finders=None, hosts=None):
    if finders is None:
      finders = [get_finder(finder_path)
                 for finder_path in settings.STORAGE_FINDERS]
    self.finders = finders

    if hosts is None:
      hosts = settings.CLUSTER_SERVERS
    remote_hosts = [host for host in hosts if not settings.REMOTE_EXCLUDE_LOCAL or not is_local_interface(host)]
    self.remote_stores = [ RemoteStore(host) for host in remote_hosts ]


  def find(self, pattern, startTime=None, endTime=None, local=False, headers=None):
    query = FindQuery(pattern, startTime, endTime, local)

    for match in self.find_all(query, headers):
      yield match

  def find_all(self, query, headers=None):
    start = time.time()
    result_queue = Queue.Queue()
    req_cnt = 0

    # Start remote searches
    if not query.local:
      jobs = [
        (store.find, query, None, headers)
        for store in self.remote_stores if store.available
      ]
      req_cnt += len(jobs)

    # Start local searches
    for finder in self.finders:
      jobs.append((finder.find_nodes, query))
      req_cnt += 1

    if settings.USE_THREADING:
      get_pool().put_multi(jobs, result_queue=result_queue)
    else:
      for job in jobs:
        result_queue.put(job[0](*job[1:]))

    # Group matching nodes by their path
    nodes_by_path = {}

    deadline = start + settings.REMOTE_FIND_TIMEOUT
    result_cnt = 0

    while True:
      if time.time() > deadline:
        log.info("Timed out in find_all after %fs" % (settings.REMOTE_FIND_TIMEOUT))
        break

      try:
        nodes = result_queue.get(True, 5)
      except Queue.Empty:
        log.info("Missing results of remote store finds")
        break

      result_cnt += 1
      if nodes:
        for node in nodes:
          if node.path not in nodes_by_path:
            nodes_by_path[node.path] = []

          nodes_by_path[node.path].append(node)
          log.info("Found node %s" % (node))

      if result_cnt >= req_cnt:
        log.info("Got all find results in %fs" % (time.time() - start))
        break

    # Reduce matching nodes for each path to a minimal set
    found_branch_nodes = set()

    items = list(nodes_by_path.iteritems())
    random.shuffle(items)

    for path, nodes in items:
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

      # Fast-path when there is a single node.
      if len(leaf_nodes) == 1:
        yield leaf_nodes[0]
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

      if settings.REMOTE_STORE_MERGE_RESULTS:
        remote_nodes = [n for n in nodes_remaining if not n.local]
        for node in remote_nodes:
          nodes_remaining.remove(node)
          minimal_node_set.add(node)
          covered_intervals = covered_intervals.union(node.intervals)
      else:
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
  def __init__(self, pattern, startTime, endTime, local=False):
    self.pattern = pattern
    self.startTime = startTime
    self.endTime = endTime
    self.isExact = is_pattern(pattern)
    self.interval = Interval(float('-inf') if startTime is None else startTime,
                             float('inf') if endTime is None else endTime)
    self.local = local


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


STORE = Store()
