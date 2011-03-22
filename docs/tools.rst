Tools That Work With Graphite
=============================

jmxtrans
--------
`jmxtrans`_ is a powerful tool that performs JMX queries to collect metrics from Java applications.
It is requires very little configuration and is capable of sending metric data to several
backend applications, including Graphite.


statsd
------
`StatsD`_ is a simple daemon for easy stats aggregation, developed by the folks at Etsy.


Ganglia
-------
`Ganglia`_ does not yet natively "work with" Graphite except that it uses RRD to store datapoints,
and Graphite can read RRD files. However, there is an `add-on <https://github.com/ganglia/ganglia_contrib/tree/master/graphite_integration/>`_
that allows Ganglia to send metrics directly to Graphite. Further integration work is underway.



.. _jmxtrans: http://code.google.com/p/jmxtrans/
.. _StatsD: https://github.com/etsy/statsd
.. _Ganglia: http://ganglia.info/
