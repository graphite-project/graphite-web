Tools That Work With Graphite
=============================

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


Diamond
-------
`Diamond`_ is a Python daemon that collects system metrics and publishes them to Graphite. It is
capable of collecting cpu, memory, network, I/O, load and disk metrics. Additionally, it features
an API for implementing custom collectors for gathering metrics from almost any source.


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


Tasseo
------
`Tasseo`_ is a lightweight, easily configurable, real-time dashboard for Graphite metrics.

.. _Diamond: http://opensource.brightcove.com/project/Diamond/
.. _jmxtrans: http://code.google.com/p/jmxtrans/
.. _statsd: https://github.com/etsy/statsd
.. _Ganglia: http://ganglia.info/
.. _Backbone.js: http://documentcloud.github.com/backbone/
.. _collectd: http://collectd.org/
.. _collectd-to-graphite: https://github.com/loggly/collectd-to-graphite
.. _collectd-carbon: https://github.com/indygreg/collectd-carbon
.. _collectd-graphite: https://github.com/joemiller/collectd-graphite
.. _Collectl: http://collectl.sourceforge.net/
.. _D3.js: http://mbostock.github.com/d3/
.. _Logster: https://github.com/etsy/logster
.. _RabbitMQ: http://www.rabbitmq.com/
.. _Esper: http://esper.codehaus.org/
.. _Rocksteady: http://code.google.com/p/rocksteady/
.. _Bucky: http://pypi.python.org/pypi/bucky
.. _Graphite-Tattle: https://github.com/wayfair/Graphite-Tattle
.. _Gdash: https://github.com/ripienaar/gdash.git
.. _Pencil: https://github.com/fetep/pencil
.. _Graphene: http://jondot.github.com/graphene/
.. _Graphite-relay: https://github.com/markchadwick/graphite-relay
.. _Graphiti: https://github.com/paperlesspost/graphiti
.. _Graphios: https://github.com/shawn-sterling/graphios
.. _Charcoal: https://github.com/cebailey59/charcoal
.. _Graphitejs: https://github.com/prestontimmons/graphitejs
.. _Grockets: https://github.com/disqus/grockets
.. _Host sFlow: http://host-sflow.sourceforge.net/
.. _Graphitoid: https://market.android.com/details?id=com.tnc.android.graphite
.. _HoardD: https://github.com/coredump/hoardd
.. _Hubot: https://github.com/github/hubot
.. _hubot-scripts: https://github.com/github/hubot-scripts
.. _Tasseo: https://github.com/obfuscurity/tasseo
.. _Shinken: http://www.shinken-monitoring.org/
.. _Seyren: https://github.com/scobal/seyren
.. _write-graphite: http://collectd.org/wiki/index.php/Plugin:Write_Graphite
