Tools That Work With Graphite
=============================

Backstop
-----
`Backstop`_ is a simple endpoint for submitting metrics to Graphite. It accepts JSON data via HTTP POST and proxies the data to one or more Carbon/Graphite listeners.

Bucky
-----
`Bucky`_ is a small service implemented in Python for collecting and translating metrics for Graphite.
It can current collect metric data from CollectD daemons and from StatsD clients.


collectd
--------
`collectd`_ is a daemon which collects system performance statistics periodically and provides
mechanisms to store the values in a variety of ways, including RRD. To send collectd metrics into
carbon/graphite, use collectd's write-graphite_ plugin (available as of 5.1). Other options include:

- Jordan Sissel's node collectd-to-graphite_ proxy
- Joe Miller's perl collectd-graphite_ plugin
- Gregory Szorc's python collectd-carbon_ plugin
- Paul J. Davis's `Bucky`_ service

Graphite can also read directly from `collectd`_'s RRD files. RRD files can
simply be added to ``STORAGE_DIR/rrd`` (as long as directory names and files do not
contain any ``.`` characters). For example, collectd's
``host.name/load/load.rrd`` can be symlinked to ``rrd/collectd/host_name/load/load.rrd``
to graph ``collectd.host_name.load.load.{short,mid,long}term``.


Collectl
--------
`Collectl`_ is a collection tool for system metrics that can be run both interactively and as a daemon
and has support for collecting from a broad set of subsystems. Collectl includes a Graphite interface
which allows data to easily be fed to Graphite for storage.


Charcoal
--------
`Charcoal`_ is a simple Sinatra dashboarding frontend for Graphite or any other system status
service which can generate images directly from a URL. Charcoal configuration is driven by a YAML
config file.


Descartes
-------
`Descartes`_ is a Sinatra-based dashboard that allows users to correlate multiple metrics in a single chart, review long-term trends across one or more charts, and to collaborate with other users through a combination of shared dashboards and rich layouts.

Diamond
-------
`Diamond`_ is a Python daemon that collects system metrics and publishes them to Graphite. It is
capable of collecting cpu, memory, network, I/O, load and disk metrics. Additionally, it features
an API for implementing custom collectors for gathering metrics from almost any source.

Evenflow
--------
`Evenflow`_ is a simple service for submitting sFlow datagrams to Graphite. It accepts sFlow datagrams from multiple network devices and proxies the data to a Carbon listener. Currently only Generic Interface Counters are supported. All other message types are discarded.

Ganglia
-------
`Ganglia`_ is a scalable distributed monitoring system for high-performance computing systems
such as clusters and Grids. It collects system performance metrics and stores them in RRD,
but now there is an
`add-on <https://github.com/ganglia/ganglia_contrib/tree/master/graphite_integration/>`_
that allows Ganglia to send metrics directly to Graphite. Further integration work is underway.


GDash
-----
`Gdash`_ is a simple Graphite dashboard built using Twitters Bootstrap driven by a small DSL.


Giraffe
--------
`Giraffe`_ is a Graphite real-time dashboard based on `Rickshaw`_ and requires no server backend.
Inspired by `Gdash`_, `Tasseo`_ and `Graphene`_ it mixes features from all three into a slightly
different animal.

Graphitus
---------
`graphitus`_ is a client side dashboard for graphite built using bootstrap and underscore.js.


Graph-Explorer
--------------
`Graph-Explorer`_ is a graphite dashboard which uses plugins to add tags and metadata
to metrics and a query language with lets you filter through them and
compose/manipulate graphs on the fly. Also aims for high interactivity using
`TimeseriesWidget`_ and minimal hassle to set up and get running.


Graphene
--------
`Graphene`_ is a Graphite dashboard toolkit based on `D3.js`_ and `Backbone.js`_ which was
made to offer a very aesthetic realtime dashboard. Graphene provides a solution capable of
displaying thousands upon thousands of datapoints all updated in realtime.


Graphite-relay
--------------
`Graphite-relay`_ is a fast Graphite relay written in Scala with the Netty framework.


Graphite-Tattle
---------------
`Graphite-Tattle`_ is a self-service dashboard frontend for Graphite and `Ganglia`_.


Graphiti
--------
`Graphiti`_ is a powerful dashboard front end with a focus on ease of access, ease of recovery and
ease of tweaking and manipulation.


Graphitoid
----------
`Graphitoid`_ is an Android app which allows one to browse and display Graphite graphs
on an Android device.


Graphios
--------
`Graphios`_ is a small Python daemon to send Nagios performance data (perfdata) to Graphite.


Graphitejs
----------
`Graphitejs`_ is a jQuery plugin for easily making and displaying graphs and updating them on
the fly using the Graphite URL api.


Graphsky
--------
`Graphsky`_ is flexible and easy to configure PHP based dashboard. It uses JSON template files to
build graphs and specify which graphs need to be displayed when, similar to Ganglia-web. Just 
like Ganglia, it uses a hierarchial structure: Environment/Cluster/Host/Metric to be able to display
overview graphs and host-specific metrics. It communicates directly to the Graphite API to determine
which Environments, Clusters, Hosts and Metrics are currently stored in Graphite.


Grockets
--------
`Grockets`_ is a node.js application which provides streaming JSON data over HTTP from Graphite.


HoardD
------
`HoardD`_ is a Node.js app written in CoffeeScript to send data from servers to Graphite, much
like collectd does, but aimed at being easier to expand and with less footprint. It comes by
default with basic collectors plus Redis and MySQL metrics, and can be expanded with Javascript or
CoffeeScript.


Host sFlow
----------
`Host sFlow`_ is an open source implementation of the sFlow protocol (http://www.sflow.org),
exporting a standard set of host cpu, memory, disk and network I/O metrics. The
sflow2graphite utility converts sFlow to Graphite's plaintext
protocol, allowing Graphite to receive sFlow metrics.


hubot-scripts
-------------
`Hubot`_ is a Campfire bot written in Node.js and CoffeeScript. The related `hubot-scripts`_
project includes a Graphite script which supports searching and displaying saved graphs from
the Composer directory in your Campfire rooms.

jmxtrans
--------
`jmxtrans`_ is a powerful tool that performs JMX queries to collect metrics from Java applications.
It is requires very little configuration and is capable of sending metric data to several
backend applications, including Graphite.


Ledbetter
---------
`Ledbetter`_ is a simple script for gathering Nagios problem statistics and submitting them to Graphite. It focuses on summary (overall, servicegroup and hostgroup) statistics and writes them to the nagios.problems metrics namespace within Graphite.


Logster
-------
`Logster`_ is a utility for reading log files and generating metrics in Graphite or Ganglia.
It is ideal for visualizing trends of events that are occurring in your application/system/error
logs. For example, you might use logster to graph the number of occurrences of HTTP response
code that appears in your web server logs.


Pencil
------
`Pencil`_ is a monitoring frontend for graphite. It runs a webserver that dishes out pretty Graphite
URLs in interesting and intuitive layouts.


Rocksteady
----------
`Rocksteady`_ is a system that ties together Graphite, `RabbitMQ`_, and `Esper`_. Developed by
AdMob (who was then bought by Google), this was released by Google as open source
(http://google-opensource.blogspot.com/2010/09/get-ready-to-rocksteady.html).


Scales
------
`Scales`_ is a Python server state and statistics library that can output its data to Graphite.


Seyren
---------------
`Seyren`_ is an alerting dashboard for Graphite.


Shinken
-------
`Shinken`_ is a system monitoring solution compatible with Nagios which emphasizes scalability, flexibility,
and ease of setup. Shinken provides complete integration with Graphite for processing and display of
performance data.


statsd
------
`statsd`_ is a simple daemon for easy stats aggregation, developed by the folks at Etsy.
A list of forks and alternative implementations can be found at <http://joemiller.me/2011/09/21/list-of-statsd-server-implementations/>


Structured Metrics
------------------
`structured_metrics`_ is a lightweight python library that uses plugins to read in
Graphite's list of metric names and convert it into a multi-dimensional tag space of clear, sanitized targets.

Tasseo
------
`Tasseo`_ is a lightweight, easily configurable, real-time dashboard for Graphite metrics.

Therry
------
`Therry`_ ia s simple web service that caches Graphite metrics and exposes an endpoint for dumping or searching against them by substring.

TimeseriesWidget
----------
`TimeseriesWidget`_ adds timeseries graphs to your webpages/dashboards using a simple api,
focuses on high interactivity and modern features (realtime zooming, datapoint inspection,
annotated events, etc). Supports Graphite, flot, rickshaw and anthracite.

.. _Backbone.js: http://documentcloud.github.com/backbone/
.. _Backstop: https://github.com/obfuscurity/backstop
.. _Bucky: http://pypi.python.org/pypi/bucky
.. _Charcoal: https://github.com/cebailey59/charcoal
.. _collectd: http://collectd.org/
.. _collectd-carbon: https://github.com/indygreg/collectd-carbon
.. _collectd-graphite: https://github.com/joemiller/collectd-graphite
.. _collectd-to-graphite: https://github.com/loggly/collectd-to-graphite
.. _Collectl: http://collectl.sourceforge.net/
.. _D3.js: http://mbostock.github.com/d3/
.. _Descartes: https://github.com/obfuscurity/descartes
.. _Diamond: http://opensource.brightcove.com/project/Diamond/
.. _Esper: http://esper.codehaus.org/
.. _Evenflow: https://github.com/github/evenflow
.. _Ganglia: http://ganglia.info/
.. _Gdash: https://github.com/ripienaar/gdash.git
.. _Giraffe: http://kenhub.github.com/giraffe/
.. _Graph-Explorer: https://github.com/Dieterbe/graph-explorer
.. _Graphene: http://jondot.github.com/graphene/
.. _Graphios: https://github.com/shawn-sterling/graphios
.. _Graphite-Tattle: https://github.com/wayfair/Graphite-Tattle
.. _Graphite-relay: https://github.com/markchadwick/graphite-relay
.. _Graphitejs: https://github.com/prestontimmons/graphitejs
.. _Graphiti: https://github.com/paperlesspost/graphiti
.. _graphitius: https://github.com/erezmazor/graphitus
.. _Graphitoid: https://market.android.com/details?id=com.tnc.android.graphite
.. _Graphsky: https://github.com/hyves-org/graphsky
.. _Grockets: https://github.com/disqus/grockets
.. _HoardD: https://github.com/coredump/hoardd
.. _Host sFlow: http://host-sflow.sourceforge.net/
.. _Hubot: https://github.com/github/hubot
.. _hubot-scripts: https://github.com/github/hubot-scripts
.. _jmxtrans: http://code.google.com/p/jmxtrans/
.. _Ledbetter: https://github.com/github/ledbetter
.. _Logster: https://github.com/etsy/logster
.. _Pencil: https://github.com/fetep/pencil
.. _RabbitMQ: http://www.rabbitmq.com/
.. _Rickshaw: http://code.shutterstock.com/rickshaw/
.. _Rocksteady: http://code.google.com/p/rocksteady/
.. _Seyren: https://github.com/scobal/seyren
.. _Shinken: http://www.shinken-monitoring.org/
.. _statsd: https://github.com/etsy/statsd
.. _structured_metrics: https://github.com/Dieterbe/graph-explorer/tree/master/structured_metrics
.. _Tasseo: https://github.com/obfuscurity/tasseo
.. _Therry: https://github.com/obfuscurity/therry
.. _TimeseriesWidget: https://github.com/Dieterbe/timeserieswidget
.. _write-graphite: http://collectd.org/wiki/index.php/Plugin:Write_Graphite
