"""Utility functions for finders."""
import abc


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

        Returns:
          generator of Node
        """
        pass
