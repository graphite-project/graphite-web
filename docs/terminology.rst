Graphite Terminology
====================
Graphite uses many terms that can have ambiguous meaning. The following definitions are what these
terms mean in the context of Graphite.

.. glossary::

    datapoint
      A :term:`value` stored at a :term:`timestamp bucket`. If no value is recorded at a particular
      timestamp bucket in a :term:`series`, the value will be None (null).

    function
      A time-series function which transforms, combines, or performs computations on one or more :term:`series`.
      See :doc:`functions`

    metric
      See :term:`series`

    metric series
      See :term:`series`

    precision
      See :term:`resolution`

    resolution
      The number of seconds per datapoint in a :term:`series`. Series are created with a resolution
      which determines how often a :term:`datapoint` may be stored. This resolution is represented
      as the number of seconds in time that each datapoint covers. A series which stores one datapoint
      per minute has a resolution of 60 seconds. Similarly, a series which stores one datapoint per
      second has a resolution of 1 second.

    retention
      The number of datapoints retained in a :term:`series`. Alternatively: The length of time datapoints
      are stored in a series.

    series
      A named set of datapoints. A series is identified by a unique name, which is composed of
      elements separated by periods (``.``) which are used to display the collection of series
      into a heirarchical tree. A series storing system load average on a server called ``apache02``
      in datacenter ``metro_east`` might be named as ``metro_east.servers.apache02.system.load_average``

    series list
      A series name or wildcard which matches one or more :term:`series`. Series lists are received by
      :term:`functions <function>` as a list of matching series. From a user perspective, a series list is
      merely the name of a metric. For example, each of these would be considered a single series list:

      * ``metro_east.servers.apache02.system.load_average.1_min``,
      * ``metro_east.servers.apache0{1,2,3}.system.load_average.1_min``
      * ``metro_east.servers.apache01.system.load_average.*``

    target
      A source of data used as input for a Graph. A target can be a single metric name, a metric wildcard,
      or either of these enclosed within one or more :term:`functions <function>`

    timestamp
      A point in time in which :term:`values <value>` can be associated. Time in Graphite is represented
      as `epoch time <http://en.wikipedia.org/wiki/Epoch_time>`_ with a maximum resolution of 1-second.

    timestamp bucket
      A :term:`timestamp` after rounding down to the nearest multiple of a :term:`series's <series>` :term:`resolution`.

    value
      A numeric or null value. Values are stored as double-precision floats. Values are parsed using
      the python :py:func:`float` constructor and can also be None (null). The range and precision of
      values is system dependant and can be found by executing (with Python 2.6 or later)::
      python -c 'import sys; print sys.float_info'

