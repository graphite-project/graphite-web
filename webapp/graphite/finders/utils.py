"""Utility functions for finders."""
import time
import abc

from graphite.node import BranchNode, LeafNode  # noqa
from graphite.util import is_pattern
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

    # Set to False if this is a remote finder.
    local = True
    # set to True if this finder shouldn't be used
    disabled = False
    # set to True if this finder supports seriesByTag
    tags = False

    def __init__(self):
        """Initialize the finder."""

    @abc.abstractmethod
    def find_nodes(self, query):
        """Get the list of nodes matching a query.

        Args:
          graphite.storage.FindQuery: the query to run.

        Returns:
          generator of Node
        """

    def get_index(self, requestContext):
        """Get a list of all series

        Args:
          requestContext

        Returns:
          list of series
        """
        query = FindQuery(
            '**', None, None,
            local=requestContext.get('localOnly'),
            headers=requestContext.get('forwardHeaders'),
            leaves_only=True,
        )

        return sorted([node.path for node in self.find_nodes(query) if node.is_leaf])

    # The methods below are fully optional and BaseFinder provides
    # a default implementation. They can be re-implemented by finders
    # that could provide a more efficient way of doing it.
    #
    # The API isn't fully finalized yet and can be subject to change
    # until it's documented.

    @classmethod
    def factory(cls):
        return [cls()]

    def find_multi(self, queries):
        """Executes multiple find queries.

        Works like multiple find_node(), this gives the ability for
        finders to parallelize the work.

        Returns:
          generator of (Node, query)
        """
        for query in queries:
            for node in self.find_nodes(query):
                yield (node, query)

    def fetch(self, patterns, start_time, end_time, now=None, requestContext=None):
        """Fetch multiple patterns at once.

        This method is used to fetch multiple patterns at once, this
        allows alternate finders to do batching on their side when they can.

        Returns:
          an iterable of
          {
            'pathExpression': pattern,
            'path': node.path,
            'time_info': time_info,
            'values': values,
          }
        """
        requestContext = requestContext or {}

        queries = [
            FindQuery(
                pattern, start_time, end_time,
                local=requestContext.get('localOnly'),
                headers=requestContext.get('forwardHeaders'),
                leaves_only=True,
            )
            for pattern in patterns
        ]

        results = []

        for node, query in self.find_multi(queries):
            if not isinstance(node, LeafNode):
                continue

            result = node.fetch(
                start_time, end_time,
                now=now, requestContext=requestContext
            )

            if result is None:
                continue

            time_info, values = result

            results.append({
                'pathExpression': query.pattern,
                'path': node.path,
                'name': node.path,
                'time_info': time_info,
                'values': values,
            })

        return results

    def auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None):
        return []

    def auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None):
        return []
