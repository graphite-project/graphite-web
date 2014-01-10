Alternative storage finders
---------------------------

Built-in finders
^^^^^^^^^^^^^^^^

The default graphite setup consists of:

* A Whisper database
* A carbon daemon writing data to the database
* Graphite-web reading and graphing data from the database

It is possible to switch the storage layer to something different than
Whisper to accomodate specific needs. The setup above would become:

* An alternative database
* A carbon daemon or alternative daemon for writing to the database
* A custom *storage finder* for reading the data in graphite-web

This section aims at documenting the last item: configuring graphite-web to
read data from a custom storage layer.

This can be done via the ``STORAGE_FINDERS`` setting. This setting is a list
of paths to finder implementations. Its default value is:

.. code-block:: python

    STORAGE_FINDERS = (
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
        'graphite.finders.standard.StandardFinder',
        'graphite.finders.ceres.CeresFinder',
    )

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

    class CustomFinder(object):
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

    class CustomReader(object):
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

Installing custom finders
^^^^^^^^^^^^^^^^^^^^^^^^^

In order for your custom finder to be importable, you need to package it under
a namespace of your choice. Python packaging won't be covered here but you can
look at third-party finders to get some inspiration:

* `Cyanite finder <https://github.com/brutasse/graphite-cyanite>`_
* KairosDB finder
