Alternative storage finders
---------------------------

Built-in finders
^^^^^^^^^^^^^^^^

The default graphite setup consists of:

* A Whisper database
* A carbon daemon writing data to the database
* Graphite-web reading and graphing data from the database

It is possible to use an alternate storage layer than the default, Whisper, in
order to accommodate specific needs. The setup above would become:

* An alternative database
* A carbon daemon or alternative daemon for writing to the database
* A custom *storage finder* for reading the data in graphite-web

This section aims at documenting the last item: configuring graphite-web to
read data from a custom storage layer.

This can be done via the ``STORAGE_FINDERS`` setting. This setting is a list
of paths to finder implementations. Its default value is:

.. code-block:: python

    STORAGE_FINDERS = (
        'graphite.finders.remote.RemoteFinder',
        'graphite.finders.standard.StandardFinder',
    )

The default finder reads data from a Whisper database.

An alternative finder for the experimental Ceres database is available:

.. code-block:: python

    STORAGE_FINDERS = (
        'graphite.finders.ceres.CeresFinder',
    )

The setting supports multiple values, meaning you can read data from both a
Whisper database and a Ceres database:

.. code-block:: python

    STORAGE_FINDERS = (
        'graphite.finders.remote.RemoteFinder',
        'graphite.finders.standard.StandardFinder',
        'graphite.finders.ceres.CeresFinder',
    )

.. _custom-finders:

Custom finders
^^^^^^^^^^^^^^

``STORAGE_FINDERS`` being a list of arbitrary python paths, it is relatively
easy to write a custom finder if you want to read data from other places than
Whisper and Ceres. A finder is a python class with a ``find_nodes()`` method:

.. code-block:: python

    class CustomFinder(object):
        def find_nodes(self, query):
            # ...

``query`` is a ``FindQuery`` object. ``find_nodes()`` is the entry point when
browsing the metrics tree. It must yield leaf or branch nodes matching the
query:

.. code-block:: python

    from graphite.node import LeafNode, BranchNode
    from graphite.finders.utils import BaseFinder

    class CustomFinder(BaseFinder):
        def find_nodes(self, query):
            # find some paths matching the query, then yield them
            for path in matches:
                if is_branch(path):
                    yield BranchNode(path)
                if is_leaf(path):
                    yield LeafNode(path, CustomReader(path))


``LeafNode`` is created with a *reader*, which is the class responsible for
fetching the datapoints for the given path. It is a simple class with 2
methods: ``fetch()`` and ``get_intervals()``:

.. code-block:: python

    from graphite.intervals import IntervalSet, Interval
    from graphite.readers.utils import BaseReader

    class CustomReader(BaseReader):
        __slots__ = ('path',)  # __slots__ is recommended to save memory on readers

        def __init__(self, path):
            self.path = path

        def fetch(self, start_time, end_time):
            # fetch data
            time_info = _from_, _to_, _step_
            return time_info, series

        def get_intervals(self):
            return IntervalSet([Interval(start, end)])

``fetch()`` must return a list of 2 elements: the time info for the data and
the datapoints themselves. The time info is a list of 3 items: the start time
of the datapoints (in unix time), the end time and the time step (in seconds)
between the datapoints.

The datapoints is a list of points found in the database for the required
interval. There must be ``(end - start) / step`` points in the dataset even if
the database has gaps: gaps can be filled with ``None`` values.

``get_intervals()`` is a method that hints graphite-web about the time range
available for this given metric in the database. It must return an
``IntervalSet`` of one or more ``Interval`` objects.

.. _advanced-finders:

Advanced finders
^^^^^^^^^^^^^^^^

Custom finders may also implement the following methods:

``factory(cls)``
  This class method is responsible for initializing and returning the finder object(s) as a list.

  It may return a list of 1 or more instances of the finder, if multiple instances are returned they will be called concurrently in multiple threads.  This is used by ``RemoteFinder`` to dispatch requests to multiple remote hosts in parallel.

  If not defined, a single instance of the finder will be initialized with no parameters.

``get_index(self, requestContext)``
  This method should return all node paths that the finder is aware of as a list of strings.

  ``requestContext`` is a dict which may contain ``localOnly`` and ``forwardHeaders`` keys.

  If not implemented, ``find_nodes()`` will be called with a query for ``**`` and a list of the returned nodes' paths will be returned.

``find_multi(self, queries)``
  This method follows the same semantics as ``find_node()`` but accepts a list of queries.

  If not implemented, ``find_nodes()`` will be called for each query specified.

``fetch(self, patterns, start_time, end_time, now=None, requestContext=None)``
  This method is responsible for loading data for render requests.

  It should return a list of result dicts, each of which contains:

  .. code-block:: python

      {
        'pathExpression': '<the pattern that this path matched>',
        'path': 'the.metric.path',
        'name': 'the.metric.path',
        'time_info': (_from_, _to_, _step_),
        'values': [list of values],
      }

  If not implemented, ``find_multi()`` will be called with a list of queries and ``node.fetch()`` will be called on every result.

``auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None)``
  This method is only used when ``tags = True`` is specified in the class definition.

  If defined it should return an auto-complete list of tags for series that match the specified expressions.

``auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None)``
  This method is only used when ``tags = True`` is specified in the class definition.

  If defined it should return an auto-complete list of values for the specified tag on series that match the specified expressions.

Installing custom finders
^^^^^^^^^^^^^^^^^^^^^^^^^

In order for your custom finder to be importable, you need to package it under
a namespace of your choice. Python packaging won't be covered here but you can
look at third-party finders to get some inspiration:

* `Cyanite finder <https://github.com/brutasse/graphite-cyanite>`_
* `BigGraphite finder <https://github.com/criteo/biggraphite/blob/master/biggraphite/plugins/graphite.py>`_
* KairosDB finder
