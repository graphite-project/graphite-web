.. _tags:

Graphite Tag Support
====================
From the release of the 1.1.x series, Graphite supports storing data using tags to identify each series.  This allows for much more flexibility than the traditional hierarchical layout.  When using tag support, each series is uniquely identified by its name and set of tag/value pairs.

Carbon
------

To enter tagged series into Graphite, they should be passed to Carbon by appending the tags to the series name:

.. code-block:: none

    my.series;tag1=value1;tag2=value2

Carbon will automatically decode the tags, normalize the tag order, and register the series in the tag database.

.. _querying-tagged-series:

Querying
--------

When querying tagged series, we start with the `seriesByTag <functions.html#graphite.render.functions.seriesByTag>`_ function:

.. code-block:: none

    # find all series that have tag1 set to value1
    seriesByTag('tag1=value1')

This function returns a `seriesList` that can then be used by any other Graphite functions:

.. code-block:: none

    # find all series that have tag1 set to value1, sorted by total
    seriesByTag('tag1=value1') | sortByTotal()

The `seriesByTag <functions.html#graphite.render.functions.seriesByTag>`_ function supports specifying any number of tag expressions to refine the list of matches.  When multiple tag expressions are specified, only series that match all the expressions will be returned.

Tags expressions are strings, and may have the following formats:

.. code-block:: none

    tag=spec    tag value exactly matches spec
    tag!=spec   tag value does not exactly match spec
    tag=~value  tag value matches the regular expression spec
    tag!=~spec  tag value does not match the regular expression spec

Any tag spec that matches an empty value is considered to match series that don't have that tag, and at least one tag spec must require a non-empty value.

Regular expression conditions are treated as being anchored at the start of the value.

A more complex example:

.. code-block:: none

    # find all series where name matches the regular expression cpu\..*, AND tag1 is not value1
    seriesByTag('name=~cpu\..*', 'tag1!=value1')

Once you have selected a seriesList, it is possible to group series together using the `groupByTags <functions.html#graphite.render.functions.groupByTags>`_ function, which operates on tags in the same way that `groupByNodes <functions.html#graphite.render.functions.groupByNodes>`_ works on nodes within a traditional naming hierarchy.

.. code-block:: none

    # get a list of disk space used per datacenter for all webheads
    seriesByTag('name=disk.used', 'server=~web.*') | groupByTags('sumSeries', 'datacenter')

    # given series like:
    # disk.used;datacenter=dc1;rack=a1;server=web01
    # disk.used;datacenter=dc1;rack=b2;server=web02
    # disk.used;datacenter=dc2;rack=c3;server=web01
    # disk.used;datacenter=dc2;rack=d4;server=web02

    # will return the following new series, each containing the sum of the values for that datacenter:
    # disk.used;datacenter=dc1
    # disk.used;datacenter=dc2

Finally, the `aliasByTags <functions.html#graphite.render.functions.aliasByTags>`_ function is used to help format series names for display.  It is the tag-based equivalent of the `aliasByNode <functions.html#graphite.render.functions.aliasByNode>`_ function.

.. code-block:: none

    # given series like:
    # disk.used;datacenter=dc1;rack=a1;server=web01
    # disk.used;datacenter=dc1;rack=b2;server=web02

    # format series name using datacenter tag:
    seriesByTag('name=disk.used','datacenter=dc1') | aliasByTags('server', 'name')

    # will return
    # web01.disk.used
    # web02.disk.used

Database Storage
----------------
As Whisper and other storage backends are designed to hold simple time-series data (metric key, value, and timestamp), Graphite stores tag information in a separate tag database (TagDB).  The TagDB is a pluggable store, by default it uses the Graphite SQLite, MySQL or PostgreSQL database, but it can also be configured to use an external Redis server or a custom plugin.

.. note::

  Tag support requires Graphite webapp & carbon version 1.1.1 or newer.

Local Database TagDB
^^^^^^^^^^^^^^^^^^^^

The Local TagDB stores tag information in tables inside the graphite-web database.  It supports SQLite, MySQL and Postgres, and is enabled by default.

Redis TagDB
^^^^^^^^^^^

The Redis TagDB will store the tag information on a Redis server, and is selected by setting ``TAGDB='graphite.tags.redis.RedisTagDB'`` in `local_settings.py`.  There are 3 additional config settings for the Redis TagDB::

    TAGDB_REDIS_HOST = 'localhost'
    TAGDB_REDIS_PORT = 6379
    TAGDB_REDIS_DB = 0

The default settings (above) will connect to a local Redis server on the default port, and use the default database.

HTTP(S) TagDB
^^^^^^^^^^^^^

The HTTP(S) TagDB is used to delegate all tag operations to an external server that implements the Graphite tagging HTTP API.  It can be used in clustered graphite scenarios, or with custom data stores.  It is selected by setting ``TAGDB='graphite.tags.http.HttpTagDB'`` in `local_settings.py`.  There are 4 additional config settings for the HTTP(S) TagDB::

    TAGDB_HTTP_URL = 'https://another.server'
    TAGDB_HTTP_USER = ''
    TAGDB_HTTP_PASSWORD = ''
    TAGDB_HTTP_AUTOCOMPLETE = False

The ``TAGDB_HTTP_URL`` is required. ``TAGDB_HTTP_USER`` and ``TAGDB_HTTP_PASSWORD`` are optional and if specified will be used to send a Basic Authorization header in all requests.

``TAGDB_HTTP_AUTOCOMPLETE`` is also optional, if set to ``True`` auto-complete requests will be forwarded to the remote TagDB, otherwise calls to `/tags/findSeries`, `/tags` & `/tags/<tag>` will be used to provide auto-complete functionality.

If ``REMOTE_STORE_FORWARD_HEADERS`` is defined, those headers will also be forwarded to the remote TagDB.

Adding Series to the TagDB
--------------------------
Normally `carbon` will take care of this, it submits all new series to the TagDB, and periodically re-submits all series to ensure that the TagDB is kept up to date.  There are 2 `carbon` configuration settings related to tagging; the `GRAPHITE_URL` setting specifies the url of your graphite-web installation (default `http://127.0.0.1:8000`), and the `TAG_UPDATE_INTERVAL` setting specifies how often each series should be re-submitted to the TagDB (default is every 100th update).

Series can be submitted via HTTP POST using command-line tools such as ``curl`` or with a variety of HTTP programming libraries.

.. code-block:: none

    $ curl -X POST "http://graphite/tags/tagSeries" \
      --data-urlencode 'path=disk.used;rack=a1;datacenter=dc1;server=web01'

    "disk.used;datacenter=dc1;rack=a1;server=web01"

This endpoint returns the canonicalized version of the path, with the tags sorted in alphabetical order.

To add multiple series with a single HTTP request, use the ``/tags/tagMultiSeries`` endpoint, which support multiple ``path`` parameters:

.. code-block:: none

    $ curl -X POST "http://graphite/tags/tagMultiSeries" \
      --data-urlencode 'path=disk.used;rack=a1;datacenter=dc1;server=web01' \
      --data-urlencode 'path=disk.used;rack=a1;datacenter=dc1;server=web02' \
      --data-urlencode 'pretty=1'

    [
      "disk.used;datacenter=dc1;rack=a1;server=web01",
      "disk.used;datacenter=dc1;rack=a1;server=web02"
    ]

This endpoint returns a list of the canonicalized paths, in the same order they are specified.

Exploring Tags
--------------
You can use the HTTP api to get lists of defined tags, values for each tag, and to find series using the same logic as the `seriesByTag <functions.html#graphite.render.functions.seriesByTag>`_ function.

To get a list of defined tags:

.. code-block:: none

    $ curl -s "http://graphite/tags?pretty=1"

    [
      {
        "tag": "datacenter"
      },
      {
        "tag": "name"
      },
      {
        "tag": "rack"
      },
      {
        "tag": "server"
      }
    ]

You can filter the returned list by providing a regular expression in the `filter` parameter:

.. code-block:: none

    $ curl -s "http://graphite/tags?pretty=1&filter=data"

    [
      {
        "tag": "datacenter"
      }
    ]

To get a list of values for a specific tag:

.. code-block:: none

    $ curl -s "http://graphite/tags/datacenter?pretty=1"

    {
      "tag": "datacenter",
      "values": [
        {
          "count": 2,
          "value": "dc1"
        },
        {
          "count": 2,
          "value": "dc2"
        }
      ]
    }

You can filter the returned list of values using the `filter` parameter:

.. code-block:: none

    $ curl -s "http://graphite/tags/datacenter?pretty=1&filter=dc1"

    {
      "tag": "datacenter",
      "values": [
        {
          "count": 2,
          "value": "dc1"
        }
      ]
    }

Finally, to search for series matching a set of tag expressions:

.. code-block:: none

    $ curl -s "http://graphite/tags/findSeries?pretty=1&expr=datacenter=dc1&expr=server=web01"

    [
      "disk.used;datacenter=dc1;rack=a1;server=web01"
    ]

Auto-complete Support
---------------------
The HTTP api provides 2 endpoints to support auto-completion of tags and values based on the series which match a provided set of tag expressions.

Each of these endpoints accepts an optional list of tag expressions using the same syntax as the `/tags/findSeries` endpoint.

The provided expressions are used to filter the results, so that the suggested list of tags will only include tags that occur in series matching the expressions.

Results are limited to 100 by default, this can be overridden by passing `limit=X` in the request parameters.  The returned JSON is a compact representation by default, if `pretty=1` is passed in the request parameters the returned JSON will be formatted with newlines and indentation.

To get an auto-complete list of tags:

.. code-block:: none

    $ curl -s "http://graphite/tags/autoComplete/tags?pretty=1&limit=100"

    [
      "datacenter",
      "name",
      "rack",
      "server"
    ]

To filter by prefix:

.. code-block:: none

    $ curl -s "http://graphite/tags/autoComplete/tags?pretty=1&tagPrefix=d"

    [
      "datacenter"
    ]

If you provide a list of tag expressions, the specified tags are excluded and the result is filtered to only tags that occur in series matching those expressions:

.. code-block:: none

    $ curl -s "http://graphite/tags/autoComplete/tags?pretty=1&expr=datacenter=dc1&expr=server=web01"

    [
      "name",
      "rack"
    ]

To get an auto-complete list of values for a specified tag:

.. code-block:: none

    $ curl -s "http://graphite/tags/autoComplete/values?pretty=1&tag=rack"

    [
      "a1",
      "a2",
      "b1",
      "b2"
    ]

To filter by prefix:

.. code-block:: none

    $ curl -s "http://graphite/tags/autoComplete/values?pretty=1&tag=rack&valuePrefix=a"

    [
      "a1",
      "a2"
    ]

If you provide a list of tag expressions, the result is filtered to only values that occur for the specified tag in series matching those expressions:

.. code-block:: none

    $ curl -s "http://graphite/tags/autoComplete/values?pretty=1&tag=rack&expr=datacenter=dc1&expr=server=web01"

    [
      "a1"
    ]

Removing Series from the TagDB
------------------------------
When a series is deleted from the data store (for example, by deleting `.wsp` files from the whisper storage folders), it should also be removed from the tag database.  Having series in the tag database that don't exist in the data store won't cause any problems with graphing, but will cause the system to do work that isn't needed during the graph rendering, so it is recommended that the tag database be cleaned up when series are removed from the data store.

Series can be deleted via HTTP POST to the `/tags/delSeries` endpoint:

.. code-block:: none

    $ curl -X POST "http://graphite/tags/delSeries" \
      --data-urlencode 'path=disk.used;datacenter=dc1;rack=a1;server=web01'

    true

To delete multiple series at once pass multiple ``path`` parameters:

.. code-block:: none

    $ curl -X POST "http://graphite/tags/delSeries" \
      --data-urlencode 'path=disk.used;datacenter=dc1;rack=a1;server=web01' \
      --data-urlencode 'path=disk.used;datacenter=dc1;rack=a1;server=web02'

    true
