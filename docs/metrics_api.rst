==================
The Metrics API
==================

These API endpoints are useful for finding and listing metrics available in
the system.

``/metrics/find``
-----------------

Finds metrics under a given path. Other alias: ``/metrics``.

Example::

    GET /metrics/find?query=collectd.*

    {"metrics": [{
        "is_leaf": 0,
        "name": "db01",
        "path": "collectd.db01."
    }, {
        "is_leaf": 1,
        "name": "foo",
        "path": "collectd.foo"
    }]}

Parameters:

*query* (mandatory)
  The query to search for.

*format*
  The output format to use. Can be ``completer`` or ``treejson`` (default).

*wildcards* (0 or 1)
  Whether to add a wildcard result at the end or no. Default: 0.

*from*
  Epoch timestamp from which to consider metrics.

*until*
  Epoch timestamp until which to consider metrics.

*jsonp* (optional)
  Wraps the response in a JSONP callback.

``/metrics/expand``
-------------------

Expands the given query with matching paths.

Parameters:

*query* (mandatory)
  The metrics query. Can be specified multiple times.

*groupByExpr* (0 or 1)
  Whether to return a flat list of results or group them by query. Default: 0.

*leavesOnly* (0 or 1)
  Whether to only return leaves or both branches and leaves. Default: 0

*jsonp* (optional)
  Wraps the response in a JSONP callback.

``/metrics/index.json``
-----------------------

Walks the metrics tree and returns every metric found as a sorted JSON array.

Parameters:

*jsonp* (optional)
    Wraps the response in a jsonp callback.

Example::

    GET /metrics/index.json

    [
        "collectd.host1.load.longterm",
        "collectd.host1.load.midterm",
        "collectd.host1.load.shortterm"
    ]


Acknowledgments
---------------

Portions of that manual are based on `Graphite HTTP API manual`_.

.. _Graphite HTTP API manual: https://graphite-api.readthedocs.io/en/latest/api.html#the-metrics-api
