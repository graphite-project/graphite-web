import time
import random

from collections import defaultdict

from django.conf import settings

try:
    from importlib import import_module
except ImportError:  # python < 2.7 compatibility
    from django.utils.importlib import import_module

from graphite.logger import log
from graphite.node import LeafNode
from graphite.intervals import Interval, IntervalSet
from graphite.finders.utils import FindQuery, BaseFinder
from graphite.readers import MultiReader
from graphite.worker_pool.pool import get_pool, pool_exec, Job, PoolTimeoutError
from graphite.tags.utils import get_tagdb


def get_finders(finder_path):
    module_name, class_name = finder_path.rsplit('.', 1)
    module = import_module(module_name)
    cls = getattr(module, class_name)

    if getattr(cls, 'factory', None):
        return cls.factory()

    # monkey patch so legacy finders will work
    if not getattr(cls, 'fetch', None):
      cls.fetch = BaseFinder.fetch
    if not getattr(cls, 'find_multi', None):
      cls.find_multi = BaseFinder.find_multi

    return [cls()]


class Store(object):
    def __init__(self, finders=None, tagdb=None):
        if finders is None:
            finders = []
            for finder_path in settings.STORAGE_FINDERS:
                finders.extend(get_finders(finder_path))

        self.finders = finders

        if tagdb is None:
            tagdb = settings.TAGDB
        self.tagdb = get_tagdb(tagdb) if tagdb else None

    def get_finders(self, local=False):
        for finder in self.finders:
            # Support legacy finders by defaulting to 'disabled = False'
            if getattr(finder, 'disabled', False):
                continue

            # Support legacy finders by defaulting to 'local = True'
            if local and not getattr(finder, 'local', True):
                continue

            yield finder

    def fetch(self, patterns, startTime, endTime, now, requestContext):
        patterns = set(patterns)

        if not patterns:
            return []

        log.debug(
            'graphite.storage.Store.fetch :: Starting fetch on all backends')

        jobs = [
            Job(finder.fetch, patterns, startTime, endTime, now=now, requestContext=requestContext)
            for finder in self.get_finders(requestContext.get('localOnly'))
        ]

        results = []

        done = 0
        errors = 0

        # Start fetches
        start = time.time()
        try:
          for result in pool_exec(get_pool(), jobs, settings.REMOTE_FETCH_TIMEOUT):
            done += 1

            if result.exception:
              errors += 1
              log.debug("Fetch for %s failed after %fs: %s" % (str(patterns), time.time() - start, str(result.exception)))
              continue

            log.debug("Got a fetch result for %s after %fs" % (str(patterns), time.time() - start))
            results.extend(result.result)
        except PoolTimeoutError:
          log.debug("Timed out in fetch after %fs" % (time.time() - start))

        if errors == done:
          raise Exception('All fetches failed for %s' % (str(patterns)))

        log.debug("Got all fetch results for %s in %fs" % (str(patterns), time.time() - start))
        return results


    def find(self, pattern, startTime=None, endTime=None, local=False, headers=None, leaves_only=False):
        query = FindQuery(
            pattern, startTime, endTime,
            local=local,
            headers=headers,
            leaves_only=leaves_only
        )

        warn_threshold = settings.METRICS_FIND_WARNING_THRESHOLD
        fail_threshold = settings.METRICS_FIND_FAILURE_THRESHOLD

        matched_leafs = 0
        for match in self._find(query):
            if isinstance(match, LeafNode):
                matched_leafs += 1
            elif leaves_only:
                continue
            if matched_leafs > fail_threshold:
                raise Exception(
                    ("Query %s yields too many results and failed "
                     "(failure threshold is %d)") % (pattern, fail_threshold))
            yield match

        if matched_leafs > warn_threshold:
            log.warning(
                ("Query %s yields large number of results up to %d "
                 "(warning threshold is %d)") % (
                     pattern, matched_leafs, warn_threshold))

    def _find(self, query):

        jobs = [
            Job(finder.find_nodes, query)
            for finder in self.get_finders(query.local)
        ]

        # Group matching nodes by their path
        nodes_by_path = defaultdict(list)

        done = 0
        errors = 0

        # Start finds
        start = time.time()
        try:
          for result in pool_exec(get_pool(), jobs, settings.REMOTE_FIND_TIMEOUT):
            done += 1

            if result.exception:
              errors += 1
              log.debug("Find for %s failed after %fs: %s" % (str(query), time.time() - start, str(result.exception)))
              continue

            log.debug("Got a find result for %s after %fs" % (str(query), time.time() - start))
            for node in result.result or []:
                nodes_by_path[node.path].append(node)
        except PoolTimeoutError:
          log.debug("Timed out in find after %fs" % (time.time() - start))

        if errors == done:
          raise Exception('All finds failed for %s' % (str(query)))

        log.debug("Got all find results for %s in %fs" % (str(query), time.time() - start))
        return self._list_nodes(query, nodes_by_path)

    def _list_nodes(self, query, nodes_by_path):
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
                # TODO need to filter branch nodes based on requested
                # interval... how?!?!?
                elif node.path not in found_branch_nodes:
                    yield node
                    found_branch_nodes.add(node.path)

            leaf_node = self._merge_leaf_nodes(query, path, leaf_nodes)
            if leaf_node:
                yield leaf_node

    def _merge_leaf_nodes(self, query, path, leaf_nodes):
        """Get a single node from a list of leaf nodes."""
        if not leaf_nodes:
            return None

        # Fast-path when there is a single node.
        if len(leaf_nodes) == 1:
            return leaf_nodes[0]

        # Calculate best minimal node set
        minimal_node_set = set()
        covered_intervals = IntervalSet([])

        # If the query doesn't fall entirely within the FIND_TOLERANCE window
        # we disregard the window. This prevents unnecessary remote fetches
        # caused when carbon's cache skews node.intervals, giving the appearance
        # remote systems have data we don't have locally, which we probably
        # do.
        now = int(time.time())
        tolerance_window = now - settings.FIND_TOLERANCE
        disregard_tolerance_window = query.interval.start < tolerance_window
        prior_to_window = Interval(float('-inf'), tolerance_window)

        def measure_of_added_coverage(
                node, drop_window=disregard_tolerance_window):
            relevant_intervals = node.intervals.intersect_interval(
                query.interval)
            if drop_window:
                relevant_intervals = relevant_intervals.intersect_interval(
                    prior_to_window)
            return covered_intervals.union(
                relevant_intervals).size - covered_intervals.size

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
                node_coverages = [(measure_of_added_coverage(n), n)
                                  for n in nodes_remaining]
                best_coverage, best_node = max(node_coverages)

                if best_coverage == 0:
                    break

                nodes_remaining.remove(best_node)
                minimal_node_set.add(best_node)
                covered_intervals = covered_intervals.union(
                    best_node.intervals)

            # Sometimes the requested interval falls within the caching window.
            # We include the most likely node if the gap is within
            # tolerance.
            if not minimal_node_set:
                def distance_to_requested_interval(node):
                    if not node.intervals:
                        return float('inf')
                    latest = sorted(
                        node.intervals, key=lambda i: i.end)[-1]
                    distance = query.interval.start - latest.end
                    return distance if distance >= 0 else float('inf')

                best_candidate = min(
                    leaf_nodes, key=distance_to_requested_interval)
                if distance_to_requested_interval(
                        best_candidate) <= settings.FIND_TOLERANCE:
                    minimal_node_set.add(best_candidate)

        if not minimal_node_set:
            return None
        elif len(minimal_node_set) == 1:
            return minimal_node_set.pop()
        else:
            reader = MultiReader(minimal_node_set)
            return LeafNode(path, reader)


def extractForwardHeaders(request):
    headers = {}
    for name in settings.REMOTE_STORE_FORWARD_HEADERS:
        value = request.META.get('HTTP_%s' % name.upper().replace('-', '_'))
        if value is not None:
            headers[name] = value
    return headers


STORE = Store()
