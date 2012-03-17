Configuring Carbon
==================

Carbon's config files all live in ``/opt/graphite/conf/``. If you've just installed Graphite, none of the ``.conf`` files will
exist yet, but there will be a ``.conf.example`` file for each one. Simply copy the example files, removing the .example extension, and customize your settings.


carbon.conf
-----------
This is the main config file, and defines the settings for each Carbon daemon.

**Each setting within this file is documented via comments in the config file itself.** The settings are broken down into sections for each daemon - carbon-cache is controlled by the ``[cache]`` section, carbon-relay is controlled by ``[relay]`` and carbon-aggregator by ``[aggregator]``. However, if this is your first time using Graphite, don't worry about anything but the ``[cache]`` section for now.

.. TIP::
    Carbon-cache and carbon-relay can run on the same host! Try swapping the default ports listed for ``LINE_RECEIVER_PORT`` and ``PICKLE_RECEIVER_PORT`` between the ``[cache]`` and ``[relay]`` sections to prevent having to reconfigure your deployed metric senders. When setting ``DESTINATIONS`` in the ``[relay]`` section, keep in mind your newly-set ``PICKLE_RECEIVER_PORT`` in the ``[cache]`` section.




storage-schemas.conf
--------------------
This configuration file details retention rates for storing metrics. It matches metric paths to patterns, and tells whisper what frequency and history of datapoints to store.

Important notes before continuing:

* There can be many sections in this file.
* The sections are applied in order from the top (first) and bottom (last).
* The patterns are regular expressions, as opposed to the wildcards used in the URL API.
* The first pattern that matches the metric name is used.
* This retention is set at the time the first metric is sent.
* Changing this file will not affect already-created .wsp files. Use whisper-resize.py to change those.

A given rule is made up of 3 lines:

* A name, specified inside square brackets.
* A regex, specified after "pattern="
* A retention rate line, specified after "retentions="

The retentions line can specify multiple retentions. Each retention of ``frequency:history`` is separated by a comma. 

Frequencies and histories are specified using the following suffixes:

* s - second
* m - minute
* h - hour
* d - day
* y - year


Here's a simple, single retention example:

.. code-block:: none

 [garbage_collection]
 pattern = garbageCollections$
 retentions = 10s:14d

The name ``[garbage_collection]`` is mainly for documentation purposes, and will show up in ``creates.log`` when metrics matching this section are created. 

The regular expression pattern will match any metric that ends with ``garbageCollections``. For example, ``com.acmeCorp.instance01.jvm.memory.garbageCollections`` would match, but ``com.acmeCorp.instance01.jvm.memory.garbageCollections.full`` would not.

The retention line is saying that each datapoint represents 10 seconds, and we want to keep enough datapoints so that they add up to 14 days of data.

Here's a more complicated example with multiple retention rates:

.. code-block:: none

 [apache_busyWorkers]
 pattern = ^servers\.www.*\.workers\.busyWorkers$
 retentions = 15s:7d,1m:21d,15m:5y

In this example, imagine that your metric scheme is ``servers.<servername>.<metrics>``. The pattern would match server names that start with 'www', followed by anything, that are sending metrics that end in '.workers.busyWorkers' (note the escaped '.' characters).

Additionally, this example uses multiple retentions. The general rule is to specify retentions from most-precise:least-history to least-precise:most-history -- whisper will properly downsample metrics (averaging by default) as thresholds for retention are crossed.

By using multiple retentions, you can store long histories of metrics while saving on disk space and I/O. Because whisper averages (by default) as it downsamples, one is able to determine totals of metrics by reversing the averaging process later on down the road.

Example: You store the number of sales per minute for 1 year, and the sales per hour for 5 years after that.  You need to know the total sales for January 1st of the year before.  You can query whisper for the raw data, and you'll get 24 datapoints, one for each hour.  They will most likely be floating point numbers.  You can take each datapoint, multiply by 60 (the ratio of high-precision to low-precision datapoints) and still get the total sales per hour.  


Additionally, whisper supports a legacy retention specification for backwards compatibility reasons - ``seconds-per-datapoint:count-of-datapoints``

.. code-block:: none

  retentions = 60:1440

60 represents the number of seconds per datapoint, and 1440 represents the number of datapoints to store.  This required some unnecessarily complicated math, so although it's valid, it's not recommended.


storage-aggregation.conf
------------------------
This file defines how to aggregate data to lower-precision retentions.  The format is similar to ``storage-schemas.conf``.
Important notes before continuing:

* This file is optional.  If it is not present, defaults will be used.
* There is no ``retentions`` line.  Instead, there are ``xFilesFactor`` and/or ``aggregationMethod`` lines.
* ``xFilesFactor`` should be a floating point number between 0 and 1, and specifies what fraction of the previous retention level's slots must have non-null values in order to aggregate to a non-null value.  The default is 0.5.
* ``aggregationMethod`` specifies the function used to aggregate values for the next retention level.  Legal methods are ``average``, ``sum``, ``min``, ``max``, and ``last``. The default is ``average``.
* These are set at the time the first metric is sent.
* Changing this file will not affect .wsp files already created on disk. Use whisper-resize.py to change those.

Here's an example:

.. code-block:: none

 [all_min]
 pattern = \.min$
 xFilesFactor = 0.1
 aggregationMethod = min

The pattern above will match any metric that ends with ``.min``.

The ``xFilesFactor`` line is saying that a minimum of 10% of the slots in the previous retention level must have values for next retention level to contain an aggregate.
The ``aggregationMethod`` line is saying that the aggregate function to use is ``min``.

If either ``xFilesFactor`` or ``aggregationMethod`` is left out, the default value will be used.

The aggregation parameters are kept separate from the retention parameters because the former depends on the type of data being collected and the latter depends on volume and importance.


relay-rules.conf
----------------
Relay rules are used to send certain metrics to a certain backend. This is handled by the carbon-relay system.  It must be running for relaying to work. You can use a regular expression to select the metrics and define the servers to which they should go with the servers line.

Example:

.. code-block:: none

  [example]
  pattern = ^mydata\.foo\..+
  servers = 10.1.2.3, 10.1.2.4:2004, myserver.mydomain.com

You must define at least one section as the default.


aggregation-rules.conf
----------------------
Aggregation rules allow you to add several metrics together as the come in, reducing the need to sum() many metrics in every URL. Note that unlike some other config files, any time this file is modified it will take effect automatically. This requires the carbon-aggregator service to be running. 

The form of each line in this file should be as follows:

.. code-block:: none

  output_template (frequency) = method input_pattern

This will capture any received metrics that match 'input_pattern'
for calculating an aggregate metric. The calculation will occur
every 'frequency' seconds and the 'method' can specify 'sum' or
'avg'. The name of the aggregate metric will be derived from
'output_template' filling in any captured fields from 'input_pattern'.

For example, if your metric naming scheme is:

.. code-block:: none

  <env>.applications.<app>.<server>.<metric>

You could configure some aggregations like so:

.. code-block:: none

  <env>.applications.<app>.all.requests (60) = sum <env>.applications.<app>.*.requests
  <env>.applications.<app>.all.latency (60) = avg <env>.applications.<app>.*.latency

As an example, if the following metrics are received:

.. code-block:: none

  prod.applications.apache.www01.requests
  prod.applications.apache.www02.requests
  prod.applications.apache.www03.requests
  prod.applications.apache.www04.requests
  prod.applications.apache.www05.requests

They would all go into the same aggregation buffer and after 60 seconds the
aggregate metric 'prod.applications.apache.all.requests' would be calculated
by summing their values.

whitelist and blacklist
-----------------------
The whitelist functionality allows any of the carbon daemons to only accept metrics that are explicitly
whitelisted and/or to reject blacklisted metrics. The functionality can be enabled in carbon.conf with
the ``USE_WHITELIST`` flag. This can be useful when too many metrics are being sent to a Graphite
instance or when there are metric senders sending useless or invalid metrics.

``GRAPHITE_CONF_DIR`` is searched for ``whitelist.conf`` and ``blacklist.conf``. Each file contains one regular
expressions per line to match against metric values. If the whitelist configuration is missing or empty,
all metrics will be passed through by default.
