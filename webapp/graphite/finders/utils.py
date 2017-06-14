"""Utility functions for finders."""
import time
import abc

from graphite.util import is_pattern
from graphite.readers.utils import wait_for_result, FetchInProgress
from graphite.intervals import Interval


class FindQuery(object):
    def __init__(self, pattern, startTime, endTime,
                 local=False, headers=None, leaves_only=None):
        self.pattern = pattern
        self.startTime = startTime
        self.endTime = endTime
        self.isExact = is_pattern(pattern)
        self.interval = Interval(
            float('-inf') if startTime is None else startTime,
            float('inf') if endTime is None else endTime)
        self.local = local
        self.headers = headers
        self.leaves_only = leaves_only

    def __repr__(self):
        if self.startTime is None:
            startString = '*'
        else:
            startString = time.ctime(self.startTime)

        if self.endTime is None:
            endString = '*'
        else:
            endString = time.ctime(self.endTime)

        return '<FindQuery: %s from %s until %s>' % (
            self.pattern, startString, endString)


class BaseFinder(object):
    __metaclass__ = abc.ABCMeta

    # Set to 'False' if this is a remote finder.
    local = True

    def __init__(self):
        """Initialize the finder."""
        pass

    @abc.abstractmethod
    def find_nodes(self, query):
        """Get the list of nodes matching a query.

        Args:
          graphite.storage.FindQuery: the query to run.

        Returns:
          generator of Node
        """
        pass


    # The methods bellow are fully optional and BaseFinder provides
    # a default implementation. They can be re-implemented by finders
    # that could provide a more efficient way of doing it.
    #
    # The API isn't fully finalized yet and can be subject to change
    # until it's documented.

    def find_nodes_multi(self, queries):
        """Executes multiple find queries.

        Works like multiple find_node(), this gives the ability to remote
        finders to parallelize the work.

        Returns:
          generator of Node
        """
        for query in queries:
            for node in self.find_nodes(query):
                yield node

    def fetch(self, nodes_or_patterns, start_time, end_time,
              now=None, requestContext=None):
        """Fetch multiple nodes or patterns at once.

        This method is used to fetch multiple nodes or pattern at once, this
        allows alternate finders to do batching on their side when they can.

        The remote finder implements find API and uses it when
        settings.REMOTE_PREFETCH_DATA is set.

        Returns:
          FetchInProgress returning and iterable or {
                    'pathExpression': pattern,
                    'path': node.path,
                    'time_info': time_info,
                    'values': values,
          }
        """
        requestContext = requestContext or {}

        nodes = []
        patterns = []

        for v in nodes_or_patterns:
            if isinstance(v, basestring):
                patterns.append(v)
            else:
                nodes.append(v)

        nodes_and_patterns = []
        for node in nodes:
            nodes_and_patterns.append((node, node.path))

        for pattern in patterns:
            query = FindQuery(
                pattern, start_time, end_time,
                local=requestContext.get('localOnly'),
                headers=requestContext.get('forwardHeaders'),
                leaves_only=True,
            )
            for node in self.find_nodes(query):
                nodes_and_patterns.append((node, pattern))

        # TODO: We could add Graphite-API's 'find_multi' support here.
        results_nodes_and_patterns = []

        for node, pattern in nodes_and_patterns:
            result = node.fetch(
                start_time, end_time,
                now=now, requestContext=requestContext
            )
            results_nodes_and_patterns.append((result, node, pattern))

        def _extract():
            for result, node, pattern in results_nodes_and_patterns:
                time_info, values = wait_for_result(result)

                yield {
                    'pathExpression': pattern,
                    'path': node.path,
                    'time_info': time_info,
                    'values': values,
                }

        return FetchInProgress(_extract)
