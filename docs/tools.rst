Tools That Work With Graphite
=============================


Collection
----------

`Bucky`_
  a small service implemented in Python for collecting and translating metrics for Graphite.
  It can current collect metric data from CollectD daemons and from StatsD clients.

`collectd`_
  a daemon which collects system performance statistics periodically and provides
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

`Collectl`_
  a collection tool for system metrics that can be run both interactively and as a daemon
  and has support for collecting from a broad set of subsystems. Collectl includes a Graphite interface
  which allows data to easily be fed to Graphite for storage.

`Diamond`_
  a Python daemon that collects system metrics and publishes them to Graphite. It is
  capable of collecting cpu, memory, network, I/O, load and disk metrics. Additionally, it features
  an API for implementing custom collectors for gathering metrics from almost any source.

`Ganglia`_
  a scalable distributed monitoring system for high-performance computing systems
  such as clusters and Grids. It collects system performance metrics and stores them in RRD,
  but now there is an
  `add-on <https://github.com/ganglia/ganglia_contrib/tree/master/graphite_integration/>`_
  that allows Ganglia to send metrics directly to Graphite. Further integration work is underway.

`Graphite PowerShell Functions <https://github.com/MattHodge/Graphite-PowerShell-Functions>`_ 
  a group of functions that can be used to collect Windows Performance Counters and send them over to the Graphite server. The main function can be run as a Windows service, and everything is configurable via an XML file.

`HoardD`_
  a Node.js app written in CoffeeScript to send data from servers to Graphite, much
  like collectd does, but aimed at being easier to expand and with less footprint. It comes by
  default with basic collectors plus Redis and MySQL metrics, and can be expanded with Javascript or
  CoffeeScript.

`Host sFlow`_
  an open source implementation of the sFlow protocol (http://www.sflow.org),
  exporting a standard set of host cpu, memory, disk and network I/O metrics. The
  sflow2graphite utility converts sFlow to Graphite's plaintext
  protocol, allowing Graphite to receive sFlow metrics.

`jmx2graphite`_
  The easiest way to poll JMX metrics and write them to Graphite. This tool runs as a Docker container, polling your JMX every X seconds and writing the metrics to Graphite. Requires a minimum of configuration to get started.

`jmxtrans`_
  a powerful tool that performs JMX queries to collect metrics from Java applications.
  It is requires very little configuration and is capable of sending metric data to several
  backend applications, including Graphite.

`Logster`_
  a utility for reading log files and generating metrics in Graphite or Ganglia.
  It is ideal for visualizing trends of events that are occurring in your application/system/error
  logs. For example, you might use logster to graph the number of occurrences of HTTP response
  code that appears in your web server logs.

`metrics-sampler`_
  a java program which regularly queries metrics from a configured set of inputs, 
  selects and renames them using regular expressions and sends them to a configured set of outputs. 
  It supports JMX and JDBC as inputs and Graphite as output out of the box.

`Sensu`_
  a monitoring framework that can route metrics to Graphite. Servers subscribe to sets of checks, so getting metrics from a new server to Graphite is as simple as installing the Sensu client and subscribing.

`SqlToGraphite`_
  an agent for windows written in .net to collect metrics using plugins (WMI, SQL Server, Oracle) by polling an endpoint with a SQL query and pushing the results into graphite. It uses either a local or a centralised configuration over HTTP. 

`SSC Serv`_
  a Windows service (agent) which periodically publishes system metrics, for example CPU, memory and disk usage. It can store data in Graphite using a naming schema that's identical to that used by collectd.


Forwarding
----------

`Backstop`_
  a simple endpoint for submitting metrics to Graphite. It accepts JSON data via HTTP POST and proxies the data to one or more Carbon/Graphite listeners.

`carbon-c-relay`_
  Enhanced C implementation of Carbon relay, aggregator and rewriter.

`carbon-relay-ng`_
  Fast carbon relay+aggregator with admin interfaces for making changes online - production ready.

`Evenflow`_
  a simple service for submitting sFlow datagrams to Graphite. It accepts sFlow datagrams from multiple network devices and proxies the data to a Carbon listener. Currently only Generic Interface Counters are supported. All other message types are discarded.

`Graphite-Newrelic`_
  Get your graphite data into `New Relic`_ via a New Relic Platform plugin.

`Graphite-relay`_
  a fast Graphite relay written in Scala with the Netty framework.

`Graphios`_
  a small Python daemon to send Nagios performance data (perfdata) to Graphite.

`Grockets`_ 
  a node.js application which provides streaming JSON data over HTTP from Graphite.

`Ledbetter`_
  a simple script for gathering Nagios problem statistics and submitting them to Graphite. It focuses on summary (overall, servicegroup and hostgroup) statistics and writes them to the nagios.problems metrics namespace within Graphite.

`pipe-to-graphite`_
  a small shell script that makes it easy to report the
  output of any other cli program to Graphite.

`statsd`_
  a simple daemon for easy stats aggregation, developed by the folks at Etsy.
  A list of forks and alternative implementations can be found at <http://joemiller.me/2011/09/21/list-of-statsd-server-implementations/>


Visualization
-------------

`Charcoal`_
  a simple Sinatra dashboarding frontend for Graphite or any other system status
  service which can generate images directly from a URL. Charcoal configuration is driven by a YAML
  config file.

`Descartes`_
  a Sinatra-based dashboard that allows users to correlate multiple metrics in a single chart, review long-term trends across one or more charts, and to collaborate with other users through a combination of shared dashboards and rich layouts.

`Dusk`_
  a simple dashboard for isolating "hotspots" across a fleet of systems. It incorporates horizon charts using Cubism.js to maximize data visualization in a constrained space.

`Firefly`_
  a web application aimed at powerful, flexible time series graphing for web developers.

`Gdash`_
  a simple Graphite dashboard built using Twitters Bootstrap driven by a small DSL.

`Giraffe`_
  a Graphite real-time dashboard based on `Rickshaw`_ and requires no server backend.
  Inspired by `Gdash`_, `Tasseo`_ and `Graphene`_ it mixes features from all three into a slightly
  different animal.

`Grafana`_
  a general purpose graphite dashboard replacement with feature rich graph editing and dashboard creation interface.
  It contains a unique Graphite target parser that enables easy metric and function editing. Fast client side rendering (even over large time ranges)
  using Flot with a multitude of display options (Multiple Y-axis, Bars, Lines, Points, smart Y-axis formats and much more).
  Click and drag selection rectangle to zoom in on any graph.

`graphitus`_
  a client side dashboard for graphite built using bootstrap and underscore.js.

`Graph-Explorer`_
  a graphite dashboard which uses plugins to add tags and metadata
  to metrics and a query language with lets you filter through them and
  compose/manipulate graphs on the fly. Also aims for high interactivity using
  `TimeseriesWidget`_ and minimal hassle to set up and get running.

`Graph-Index`_
  is index of graphs for `Diamond`_

`Graphene`_
  a Graphite dashboard toolkit based on `D3.js`_ and `Backbone.js`_ which was
  made to offer a very aesthetic realtime dashboard. Graphene provides a solution capable of
  displaying thousands upon thousands of datapoints all updated in realtime.

`Graphite-Observer`_
  a real-time monitor dashboard for Graphite.

`Graphite-Tattle`_
  a self-service dashboard frontend for Graphite and `Ganglia`_.

`Graphiti`_
  a powerful dashboard front end with a focus on ease of access, ease of recovery and
  ease of tweaking and manipulation.

`Graphitoid`_
  an Android app which allows one to browse and display Graphite graphs
  on an Android device.

`Graphsky`_
  a flexible and easy to configure PHP based dashboard. It uses JSON template files to
  build graphs and specify which graphs need to be displayed when, similar to Ganglia-web. Just 
  like Ganglia, it uses a hierarchial structure: Environment/Cluster/Host/Metric to be able to display
  overview graphs and host-specific metrics. It communicates directly to the Graphite API to determine
  which Environments, Clusters, Hosts and Metrics are currently stored in Graphite.

`Hubot`_
  a Campfire bot written in Node.js and CoffeeScript. The related `hubot-scripts`_
  project includes a Graphite script which supports searching and displaying saved graphs from
  the Composer directory in your Campfire rooms.

`Leonardo`_
  a Graphite dashboard inspired by Gdash. It's written in Python using the Flask framework. 
  The interface is built with Bootstrap. The graphs and dashboards are configured through the YAML files.

`Orion`_
  a powerful tool to create, view and manage dashboards for your Graphite data. It allows easy implementation of custom authentication to manage access to the dashboard.

`Pencil`_
  a monitoring frontend for graphite. It runs a webserver that dishes out pretty Graphite
  URLs in interesting and intuitive layouts.

`Seyren`_
  an alerting dashboard for Graphite.

`Tasseo`_
  a lightweight, easily configurable, real-time dashboard for Graphite metrics.

`Tessera`_
  a flexible front-end for creating dashboards with a wide variety of data presentations. 

`TimeseriesWidget`_
  adds timeseries graphs to your webpages/dashboards using a simple api,
  focuses on high interactivity and modern features (realtime zooming, datapoint inspection,
  annotated events, etc). Supports Graphite, flot, rickshaw and anthracite.


Monitoring
----------

`Cabot`_
  a self-hosted monitoring and alerting server that watches Graphite metrics and can alert on them by phone, SMS, Hipchat or email. It is designed to be deployed to cloud or physical hardware in minutes and configured via web interface.

`graphite-beacon`_
  Simple alerting system for Graphite metrics.

`rearview`_
  a real-time monitoring framework that sits on top of Graphite's time series data. This allows users to create monitors that both visualize and alert on data as it streams from Graphite. The monitors themselves are simple Ruby scripts which run in a sandbox to provide additional security. Monitors are also configured with a crontab compatible time specification used by the scheduler. Alerts can be sent via email, pagerduty, or campfire.

`Rocksteady`_
  a system that ties together Graphite, `RabbitMQ`_, and `Esper`_. Developed by
  AdMob (who was then bought by Google), this was released by Google as open source
  (http://google-opensource.blogspot.com/2010/09/get-ready-to-rocksteady.html).

`Shinken`_
  a system monitoring solution compatible with Nagios which emphasizes scalability, flexibility,
  and ease of setup. Shinken provides complete integration with Graphite for processing and display of
  performance data.


Storage Backend Alternates
--------------------------
If you wish to use a backend to graphite other than Whisper, there are some options available to you.

`Ceres`_
  An alternate storage backend provided by the Graphite Project.  It it intended to be a distributable time-series database.  It is currently in a pre-release status.

`Cyanite`_
  A highly available, elastic, and low-latency time-series storage wirtten on top of Cassandra

`InfluxDB`_
  A distributed time series database.

`KairosDB`_
  A distributed time-series database written on top of Cassandra.

`OpenTSDB`_
  A distributed time-series database written on top of HBase.

Other
-----
`bosun`_
  Time Series Alerting Framework. Can use Graphite as time series source.

`buckytools`_
  Go implementation of useful tools for dealing with Graphite's Whisper DBs and Carbon hashing.

`carbonate`_
  Utilities for managing graphite clusters.

`go-carbon`_
  Golang implementation of Graphite/Carbon server with classic architecture: Agent -> Cache -> Persister.

`riemann`_
  A network event stream processing system, in Clojure. Can use Graphite as source of event stream.

`Therry`_
  a simple web service that caches Graphite metrics and exposes an endpoint for dumping or searching against them by substring.


.. _Backbone.js: http://documentcloud.github.com/backbone
.. _Backstop: https://github.com/obfuscurity/backstop
.. _bosun: http://bosun.org
.. _Bucky: http://pypi.python.org/pypi/bucky
.. _buckytools: https://github.com/jjneely/buckytools
.. _Cabot: https://github.com/arachnys/cabot
.. _carbon-c-relay: https://github.com/grobian/carbon-c-relay
.. _carbon-relay-ng: https://github.com/graphite-ng/carbon-relay-ng
.. _carbonate: https://github.com/jssjr/carbonate
.. _Ceres: https://github.com/graphite-project/ceres
.. _Charcoal: https://github.com/cebailey59/charcoal
.. _collectd: http://collectd.org
.. _collectd-carbon: https://github.com/indygreg/collectd-carbon
.. _collectd-graphite: https://github.com/joemiller/collectd-graphite
.. _collectd-to-graphite: https://github.com/loggly/collectd-to-graphite
.. _Collectl: http://collectl.sourceforge.net
.. _D3.js: http://mbostock.github.com/d3
.. _Descartes: https://github.com/obfuscurity/descartes
.. _Diamond: http://opensource.brightcove.com/project/Diamond
.. _Dusk: https://github.com/obfuscurity/dusk
.. _Esper: http://esper.codehaus.org
.. _Evenflow: https://github.com/github/evenflow
.. _Firefly: https://github.com/Yelp/firefly
.. _Ganglia: http://ganglia.info
.. _Gdash: https://github.com/ripienaar/gdash.git
.. _Giraffe: http://kenhub.github.com/giraffe
.. _go-carbon: https://github.com/lomik/go-carbon
.. _Grafana: http://grafana.org
.. _Graph-Explorer: http://vimeo.github.io/graph-explorer
.. _Graph-Index: https://github.com/douban/graph-index
.. _Graphene: http://jondot.github.com/graphene
.. _Graphios: https://github.com/shawn-sterling/graphios
.. _graphite-beacon: https://github.com/klen/graphite-beacon
.. _Graphite-Tattle: https://github.com/wayfair/Graphite-Tattle
.. _Graphite-Newrelic: https://github.com/gingerlime/graphite-newrelic
.. _Graphite-Observer: https://github.com/huoxy/graphite-observer
.. _Graphite-relay: https://github.com/markchadwick/graphite-relay
.. _Graphiti: https://github.com/paperlesspost/graphiti
.. _graphitus: https://github.com/ezbz/graphitus
.. _Graphitoid: https://market.android.com/details?id=com.tnc.android.graphite
.. _Graphsky: https://github.com/hyves-org/graphsky
.. _Grockets: https://github.com/disqus/grockets
.. _HoardD: https://github.com/coredump/hoardd
.. _Host sFlow: http://host-sflow.sourceforge.net
.. _Hubot: https://github.com/github/hubot
.. _hubot-scripts: https://github.com/github/hubot-scripts
.. _jmx2graphite: https://github.com/logzio/jmx2graphite
.. _jmxtrans: http://code.google.com/p/jmxtrans
.. _InfluxDB: https://influxdb.com/
.. _jmxtrans: https://github.com/jmxtrans/jmxtrans
.. _KairosDB: http://kairosdb.github.io/
.. _Ledbetter: https://github.com/github/ledbetter
.. _Leonardo: https://github.com/PrFalken/leonardo
.. _Logster: https://github.com/etsy/logster
.. _Orion: https://github.com/gree/Orion
.. _metrics-sampler: https://github.com/dimovelev/metrics-sampler
.. _New Relic: https://newrelic.com/platform
.. _Pencil: https://github.com/fetep/pencil
.. _pipe-to-graphite: https://github.com/iFixit/pipe-to-graphite
.. _RabbitMQ: http://www.rabbitmq.com
.. _Rickshaw: http://code.shutterstock.com/rickshaw
.. _rearview: http://github.com/livingsocial/rearview
.. _riemann: http://riemann.io
.. _Rocksteady: http://code.google.com/p/rocksteady
.. _Seyren: https://github.com/scobal/seyren
.. _Sensu: http://sensuapp.org
.. _Shinken: http://www.shinken-monitoring.org
.. _SqlToGraphite: https://github.com/perryofpeek/SqlToGraphite
.. _SSC Serv: https://ssc-serv.com
.. _statsd: https://github.com/etsy/statsd
.. _Tasseo: https://github.com/obfuscurity/tasseo
.. _Tessera: https://github.com/urbanairship/tessera
.. _Therry: https://github.com/obfuscurity/therry
.. _TimeseriesWidget: https://github.com/Dieterbe/timeserieswidget
.. _write-graphite: http://collectd.org/wiki/index.php/Plugin:Write_Graphite
