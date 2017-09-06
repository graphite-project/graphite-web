The Carbon Daemons
==================

When we talk about "Carbon" we mean one or more of various daemons that make up the
storage backend of a Graphite installation. In simple installations, there is typically
only one daemon, ``carbon-cache.py``. As an installation grows, the ``carbon-relay.py``
and ``carbon-aggregator.py`` daemons can be introduced to distribute metrics load and
perform custom aggregations, respectively.

All of the carbon daemons listen for time-series data and can accept it over a common
set of :doc:`protocols </feeding-carbon>`. However, they differ in what they do with
the data once they receive it. This document gives a brief overview of what each daemon
does and how you can use them to build a more sophisticated storage backend.


carbon-cache.py
---------------

``carbon-cache.py`` accepts metrics over various protocols and writes them to disk as efficiently as
possible. This requires caching metric values in RAM as they are received, and flushing them to disk
on an interval using the underlying `whisper` library. It also provides a query service for in-memory
metric datapoints, used by the Graphite webapp to retrieve "hot data".

``carbon-cache.py`` requires some basic configuration files to run:

:doc:`carbon.conf </config-carbon>`
  The ``[cache]`` section tells ``carbon-cache.py`` what ports (2003/2004/7002),
  protocols (newline delimited, pickle) and transports (TCP/UDP) to listen on.

:doc:`storage-schemas.conf </config-carbon>`
  Defines a retention policy for incoming metrics based on regex patterns. This
  policy is passed to `whisper` when the ``.wsp`` file is pre-allocated, and
  dictates how long data is stored for.

As the number of incoming metrics increases, one ``carbon-cache.py`` instance may not be
enough to handle the I/O load. To scale out, simply run multiple
``carbon-cache.py`` instances (on one or more machines) behind a
``carbon-aggregator.py`` or ``carbon-relay.py``.

.. warning::

  If clients connecting to the ``carbon-cache.py`` are experiencing errors
  such as `connection refused` by the daemon, a common reason is a shortage
  of file descriptors.

  In the ``console.log`` file, if you find presence of:

  ``Could not accept new connection (EMFILE)``

  or

  ``exceptions.IOError: [Errno 24] Too many open files: '/var/lib/graphite/whisper/systems/somehost/something.wsp'``

  the number of files ``carbon-cache.py`` can open will need to be increased.
  Many systems default to a max of 1024 file descriptors. A value of 8192 or more may
  be necessary depending on how many clients are simultaneously connecting to the
  ``carbon-cache.py`` daemon.

  In Linux, the system-global file descriptor max can be set via sysctl. Per-process
  limits are set via ulimit. See documentation for your operating system distribution
  for details on how to set these values.

carbon-relay.py
---------------

``carbon-relay.py`` serves two distinct purposes: replication and sharding.

When running with ``RELAY_METHOD = rules``, a ``carbon-relay.py`` instance can
run in place of a ``carbon-cache.py`` server and relay all incoming metrics to
multiple backend ``carbon-cache.py``'s running on different ports or hosts.

In ``RELAY_METHOD = consistent-hashing`` mode, a ``DESTINATIONS`` setting defines a
sharding strategy across multiple ``carbon-cache.py`` backends. The same
consistent hashing list can be provided to the graphite webapp via ``CARBONLINK_HOSTS`` to
spread reads across the multiple backends.

``carbon-relay.py`` is configured via:

:doc:`carbon.conf </config-carbon>`
  The ``[relay]`` section defines listener host/ports and a ``RELAY_METHOD``

:doc:`relay-rules.conf </config-carbon>`
  With ``RELAY_METHOD = rules`` set, pattern/servers tuples in this file define which
  metrics matching certain regex rules are forwarded to which hosts.


carbon-aggregator.py
--------------------

``carbon-aggregator.py`` can be run in front of ``carbon-cache.py`` to buffer
metrics over time before reporting them into `whisper`. This is
useful when granular reporting is not required, and can help reduce I/O load
and whisper file sizes due to lower retention policies.

``carbon-aggregator.py`` is configured via:

:doc:`carbon.conf </config-carbon>`
  The ``[aggregator]`` section defines listener and destination host/ports.

:doc:`aggregation-rules.conf </config-carbon>`
  Defines a time interval (in seconds) and aggregation function (sum or
  average) for incoming metrics matching a certain pattern. At the end of each
  interval, the values received are aggregated and published to
  ``carbon-cache.py`` as a single metric.

carbon-aggregator-cache.py
--------------------------

``carbon-aggregator-cache.py`` combines both ``carbon-aggregator.py`` and
``carbon-cache.py``. This is useful to reduce the resource and administration
overhead of running both daemons.

``carbon-aggregator-cache.py`` is configured via:

:doc:`carbon.conf </config-carbon>`
  The ``[aggregator-cache]`` section defines listener and destination host/ports.
  
:doc:`relay-rules.conf </config-carbon>`
  See `carbon-relay.py` section.

:doc:`aggregation-rules.conf </config-carbon>`
  See `carbon-aggregator.py` section.

