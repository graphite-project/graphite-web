import time
import Queue
import random

from collections import defaultdict

from django.conf import settings

try:
    from importlib import import_module
except ImportError:  # python < 2.7 compatibility
    from django.utils.importlib import import_module

from graphite.logger import log
from graphite.util import timebounds
from graphite.node import LeafNode
from graphite.intervals import Interval, IntervalSet
from graphite.finders.utils import FindQuery
from graphite.readers.utils import MultiReader
from graphite.worker_pool.pool import get_pool, pool_apply


def get_finder(finder_path):
    module_name, class_name = finder_path.rsplit('.', 1)
    module = import_module(module_name)
    return getattr(module, class_name)()


class Store(object):
    def __init__(self, finders=None):
        if finders is None:
            finders = [get_finder(finder_path)
                       for finder_path in settings.STORAGE_FINDERS]
        self.finders = finders

    def fetch_remote(self, patterns, requestContext):
        if requestContext['localOnly']:
            return

        if patterns is None:
            return

        (startTime, endTime, now) = timebounds(requestContext)
        log.debug(
            'prefetchRemoteData:: Starting fetch_list on all backends')

        results = []
        for finder in self.finders:
            if not hasattr(finder, 'fetch') or finder.local:
                continue
            result = finder.fetch(
                patterns, startTime, endTime,
                now=now, requestContext=requestContext
            )
            results.append(result)
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
        for match in self.find_all(query):
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

    def find_all(self, query):
        start = time.time()
        jobs = []

        # Start local searches
        for finder in self.finders:
            # Support legacy finders by defaulting to 'local = True'
            is_local = not hasattr(finder, 'local') or finder.local
            if query.local and not is_local:
                continue
            jobs.append((finder.find_nodes, query))

        result_queue = pool_apply(get_pool(), jobs)

        # Group matching nodes by their path
        nodes_by_path = defaultdict(list)

        timeout = settings.REMOTE_FIND_TIMEOUT
        deadline = start + timeout
        done = 0
        total = len(jobs)

        while done < total:
            wait_time = deadline - time.time()
            nodes = []

            try:
                nodes = result_queue.get(True, wait_time)

            # ValueError could happen if due to really unlucky timing wait_time
            # is negative
            except (Queue.Empty, ValueError):
                if time.time() > deadline:
                    log.debug("Timed out in find_nodes after %fs" % timeout)
                    break
                else:
                    continue

            log.debug("Got a find result after %fs" % (time.time() - start))
            done += 1
            for node in nodes or []:
                nodes_by_path[node.path].append(node)

        log.debug("Got all find results in %fs" % (time.time() - start))
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
