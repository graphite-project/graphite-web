from __future__ import absolute_import
import os
import random
import sys
import time
import traceback
import types

from collections import defaultdict
from copy import deepcopy
from shutil import move
from tempfile import mkstemp

from django.conf import settings
from django.core.cache import cache
import six

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
from graphite.render.grammar import grammar


def get_finders(finder_path):
    module_name, class_name = finder_path.rsplit('.', 1)
    module = import_module(module_name)
    cls = getattr(module, class_name)

    if getattr(cls, 'factory', None):
        return cls.factory()

    # monkey patch so legacy finders will work
    finder = cls()
    if sys.version_info[0] >= 3:
        finder.fetch = types.MethodType(BaseFinder.fetch, finder)
        finder.find_multi = types.MethodType(BaseFinder.find_multi, finder)
        finder.get_index = types.MethodType(BaseFinder.get_index, finder)
    else:
        finder.fetch = types.MethodType(BaseFinder.fetch.__func__, finder)
        finder.find_multi = types.MethodType(BaseFinder.find_multi.__func__, finder)
        finder.get_index = types.MethodType(BaseFinder.get_index.__func__, finder)

    return [finder]


def get_tagdb(tagdb_path):
    module_name, class_name = tagdb_path.rsplit('.', 1)
    module = import_module(module_name)
    return getattr(module, class_name)(settings, cache=cache, log=log)


class Store(object):
    def __init__(self, finders=None, tagdb=None):
        if finders is None:
            finders = []
            for finder_path in settings.STORAGE_FINDERS:
                finders.extend(get_finders(finder_path))

        self.finders = finders

        if tagdb is None:
            tagdb = get_tagdb(settings.TAGDB or 'graphite.tags.base.DummyTagDB')
        self.tagdb = tagdb

    def get_finders(self, local=False):
        for finder in self.finders:
            # Support legacy finders by defaulting to 'disabled = False'
            if getattr(finder, 'disabled', False):
                continue

            # Support legacy finders by defaulting to 'local = True'
            if local and not getattr(finder, 'local', True):
                continue

            yield finder

    def pool_exec(self, jobs, timeout):
        if not jobs:
            return []

        thread_count = 0
        if settings.USE_WORKER_POOL:
            thread_count = min(len(self.finders), settings.POOL_MAX_WORKERS)

        return pool_exec(get_pool('finders', thread_count), jobs, timeout)

    def wait_jobs(self, jobs, timeout, context):
        if not jobs:
            return []

        start = time.time()
        results = []
        failed = []
        done = 0
        try:
            for job in self.pool_exec(jobs, timeout):
                elapsed = time.time() - start
                done += 1
                if job.exception:
                    failed.append(job)
                    log.info("Exception during %s after %fs: %s" % (
                        job, elapsed, str(job.exception))
                    )
                else:
                    log.debug("Got a result for %s after %fs" % (job, elapsed))
                    results.append(job.result)
        except PoolTimeoutError:
            message = "Timed out after %fs for %s" % (
                time.time() - start, context
            )
            log.info(message)
            if done == 0:
                raise Exception(message)

        if len(failed) == done:
            message = "All requests failed for %s (%d)" % (
                context, len(failed)
            )
            for job in failed:
                message += "\n\n%s: %s: %s" % (
                    job, job.exception,
                    '\n'.join(traceback.format_exception(*job.exception_info))
                )
            raise Exception(message)

        return results

    def fetch(self, patterns, startTime, endTime, now, requestContext):
        # deduplicate patterns
        patterns = sorted(set(patterns))

        if not patterns:
            return []

        log.debug(
            'graphite.storage.Store.fetch :: Starting fetch on all backends')

        jobs = []
        tag_patterns = None
        pattern_aliases = defaultdict(list)
        for finder in self.get_finders(requestContext.get('localOnly')):
          # if the finder supports tags, just pass the patterns through
          if getattr(finder, 'tags', False):
            job = Job(
                finder.fetch, 'fetch for %s' % patterns,
                patterns, startTime, endTime,
                now=now, requestContext=requestContext
            )
            jobs.append(job)
            continue

          # if we haven't resolved the seriesByTag calls, build resolved patterns and translation table
          if tag_patterns is None:
            tag_patterns, pattern_aliases = self._tag_patterns(patterns, requestContext)

          # dispatch resolved patterns to finder
          job = Job(
              finder.fetch,
              'fetch for %s' % tag_patterns,
              tag_patterns, startTime, endTime,
              now=now, requestContext=requestContext
          )
          jobs.append(job)

        done = 0
        errors = 0

        # Start fetches
        start = time.time()
        results = self.wait_jobs(jobs, settings.FETCH_TIMEOUT,
                                 'fetch for %s' % str(patterns))
        results = [i for l in results for i in l]  # flatten

        # translate path expressions for responses from resolved seriesByTag patterns
        for result in results:
          if result['name'] == result['pathExpression'] and result['pathExpression'] in pattern_aliases:
            for pathExpr in pattern_aliases[result['pathExpression']]:
              newresult = deepcopy(result)
              newresult['pathExpression'] = pathExpr
              results.append(newresult)

        log.debug("Got all fetch results for %s in %fs" % (str(patterns), time.time() - start))
        return results

    def _tag_patterns(self, patterns, requestContext):
      tag_patterns = []
      pattern_aliases = defaultdict(list)

      for pattern in patterns:
        # if pattern isn't a seriesByTag call, just add it to the list
        if not pattern.startswith('seriesByTag('):
          tag_patterns.append(pattern)
          continue

        # perform the tagdb lookup
        exprs = tuple([
          t.string[1:-1]
          for t in grammar.parseString(pattern).expression.call.args
          if t.string
        ])
        taggedSeries = self.tagdb.find_series(exprs, requestContext=requestContext)
        if not taggedSeries:
          continue

        # add to translation table for path matching
        for series in taggedSeries:
          pattern_aliases[series].append(pattern)

        # add to list of resolved patterns
        tag_patterns.extend(taggedSeries)

      return sorted(set(tag_patterns)), pattern_aliases

    def get_index(self, requestContext=None):
        log.debug('graphite.storage.Store.get_index :: Starting get_index on all backends')

        if not requestContext:
          requestContext = {}

        context = 'get_index'
        jobs = [
            Job(finder.get_index, context, requestContext=requestContext)
            for finder in self.get_finders(local=requestContext.get('localOnly'))
        ]

        start = time.time()
        results = self.wait_jobs(jobs, settings.FETCH_TIMEOUT, context)
        results = [i for l in results if l is not None for i in l]  # flatten

        log.debug("Got all index results in %fs" % (time.time() - start))
        return sorted(list(set(results)))

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
        context = 'find %s' % query
        jobs = [
            Job(finder.find_nodes, context, query)
            for finder in self.get_finders(query.local)
        ]

        # Group matching nodes by their path
        nodes_by_path = defaultdict(list)

        # Start finds
        start = time.time()
        results = self.wait_jobs(jobs, settings.FIND_TIMEOUT, context)
        for result in results:
            for node in result or []:
                nodes_by_path[node.path].append(node)

        log.debug("Got all find results for %s in %fs" % (
            str(query), time.time() - start)
        )
        return self._list_nodes(query, nodes_by_path)

    def _list_nodes(self, query, nodes_by_path):
        # Reduce matching nodes for each path to a minimal set
        found_branch_nodes = set()

        items = list(six.iteritems(nodes_by_path))
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

    def tagdb_auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None):
        log.debug(
            'graphite.storage.Store.auto_complete_tags :: Starting lookup on all backends')

        if requestContext is None:
          requestContext = {}

        context = 'tags for %s %s' % (str(exprs), tagPrefix or '')
        jobs = []
        use_tagdb = False
        for finder in self.get_finders(requestContext.get('localOnly')):
          if getattr(finder, 'tags', False):
            job = Job(
                finder.auto_complete_tags, context,
                exprs, tagPrefix=tagPrefix,
                limit=limit, requestContext=requestContext
            )
            jobs.append(job)
          else:
            use_tagdb = True


        results = set()

        # if we're using the local tagdb then execute it (in the main thread
        # so that LocalDatabaseTagDB will work)
        if use_tagdb:
          results.update(self.tagdb.auto_complete_tags(
              exprs, tagPrefix=tagPrefix,
              limit=limit, requestContext=requestContext
          ))

        # Start fetches
        start = time.time()
        for result in self.wait_jobs(jobs, settings.FIND_TIMEOUT, context):
            results.update(result)

        # sort & limit results
        results = sorted(results)
        if limit:
          results = results[:int(limit)]

        log.debug("Got all autocomplete %s in %fs" % (
            context, time.time() - start)
        )
        return results

    def tagdb_auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None):
        log.debug(
            'graphite.storage.Store.auto_complete_values :: Starting lookup on all backends')

        if requestContext is None:
          requestContext = {}

        context = 'values for %s %s %s' % (str(exprs), tag, valuePrefix or '')
        jobs = []
        use_tagdb = False
        for finder in self.get_finders(requestContext.get('localOnly')):
          if getattr(finder, 'tags', False):
            job = Job(
                finder.auto_complete_values, context,
                exprs, tag, valuePrefix=valuePrefix,
                limit=limit, requestContext=requestContext
            )
            jobs.append(job)
          else:
            use_tagdb = True

        # start finder jobs
        start = time.time()
        results = set()

        # if we're using the local tagdb then execute it (in the main thread
        # so that LocalDatabaseTagDB will work)
        if use_tagdb:
          results.update(self.tagdb.auto_complete_values(
              exprs, tag, valuePrefix=valuePrefix,
              limit=limit, requestContext=requestContext
          ))

        for result in self.wait_jobs(jobs, settings.FIND_TIMEOUT, context):
            results.update(result)

        # sort & limit results
        results = sorted(results)
        if limit:
          results = results[:int(limit)]

        log.debug("Got all autocomplete %s in %fs" % (
            context, time.time() - start)
        )
        return results


def extractForwardHeaders(request):
    headers = {}
    for name in settings.REMOTE_STORE_FORWARD_HEADERS:
        value = request.META.get('HTTP_%s' % name.upper().replace('-', '_'))
        if value is not None:
            headers[name] = value
    return headers


def write_index(index=None):
  if not index:
    index = settings.INDEX_FILE
  try:
    fd, tmp = mkstemp()
    try:
      tmp_index = os.fdopen(fd, 'wt')
      for metric in STORE.get_index():
        tmp_index.write("{0}\n".format(metric))
    finally:
      tmp_index.close()
    move(tmp, index)
  finally:
    try:
      os.unlink(tmp)
    except:
      pass
  return None


STORE = Store()
