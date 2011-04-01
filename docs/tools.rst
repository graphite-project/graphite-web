Tools That Work With Graphite
=============================

jmxtrans
--------
`jmxtrans`_ is a powerful tool that performs JMX queries to collect metrics from Java applications.
It is requires very little configuration and is capable of sending metric data to several
backend applications, including Graphite.


statsd
------
`statsd`_ is a simple daemon for easy stats aggregation, developed by the folks at Etsy.


Ganglia
-------
`Ganglia`_ is a scalable distributed monitoring system for high-performance computing systems
such as clusters and Grids. It collects system performance metrics and stores them in RRD,
but now there is an
`add-on <https://github.com/ganglia/ganglia_contrib/tree/master/graphite_integration/>`_
that allows Ganglia to send metrics directly to Graphite. Further integration work is underway.


collectd
--------
`collectd`_ is a daemon which collects system performance statistics periodically and provides
mechanisms to store the values in a variety of ways, including RRD. Jordan Sissel of Loggly wrote
a neat tool (https://github.com/loggly/collectd-to-graphite) that allows collectd to
send metrics to Graphite.


Logster
-------
`Logster`_ is a utility for reading log files and generating metrics in Graphite or Ganglia.
It is ideal for visualizing trends of events that are occurring in your application/system/error
logs. For example, you might use logster to graph the number of occurrences of HTTP response
code that appears in your web server logs.

.. _jmxtrans: http://code.google.com/p/jmxtrans/
.. _statsd: https://github.com/etsy/statsd
.. _Ganglia: http://ganglia.info/
.. _collectd: http://collectd.org/
.. _Logster: https://github.com/etsy/logster
