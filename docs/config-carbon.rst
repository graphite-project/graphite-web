Configuring Carbon
==================

Carbon's config files all live in ``/opt/graphite/conf/``. If you've just installed Graphite, none of the ``.conf`` files will
exist yet, but there will be a ``.conf.example`` file for each one. Simply copy the example files, removing the .example extension, and customize your settings.


carbon.conf
-----------
This is the main config file defines the settings for each Carbon daemon. If this is your first time using Graphite, don't worry about
anything but the ``[cache]`` section for now. If you're curious you can read about :doc:`The Carbon Daemons </carbon-daemons>`.


storage-schemas.conf
--------------------
This file defines how much data to store, and at what precision.
Important notes before continuing:

* There can be many sections in this file.
* Each section must have a header in square brackets, a pattern and a retentions line.
* The sections are applied in order from the top (first) and bottom (last).
* The patterns are regular expressions, as opposed to the wildcards used in the URL API.
* The first pattern that matches the metric name is used.
* These are set at the time the first metric is sent.
* Changing this file will not affect .wsp files already created on disk. Use whisper-resize.py to change those.
* There are two very different ways to specify retentions. We will show the new, easier way first, and the old, more difficult way second for historical purposes second.

Here's an example:

.. code-block:: none

 [garbage_collection]
 pattern = garbageCollections$
 retentions = 10s:14d

The name [garbage_collection] is only used so that you know what section this is handling, and so that the parser knows a new section has started. 

The pattern above will match any metric that ends with ``garbageCollections``. For example, ``com.acmeCorp.javaBatch01.instance01.jvm.memory.garbageCollections`` would match, but ``com.acmeCorp.javaBatch01.instance01.jvm.memory.garbageCollections.full`` would not.

The retention line is saying that each 'slot' or 'datapoint' represents 10 seconds, and we want to keep enough slots so that they add up to 14 days of data. 

Here's a more complicated example with multiple retention rates:

.. code-block:: none

 [apache_busyWorkers]
 pattern = servers\.www.*\.workers\.busyWorkers$
 retentions = 15s:7d,1m:21d,15m:5y

The pattern matches server names that start with 'www', followed by anything, that end in '.workers.busyWorkers'.  This way not all metrics associated with your webservers need this type of retention.  

As you can see there are multiple retentions.  Each is used in the order that it is provided.  As a general rule, they should be in most-precise:shortest-length to least-precise:longest-time.  Retentions are merely a way to save you disk space and decrease I/O for graphs that span a long period of time. By default, when data moves from a higher precision to a lower precision, it is **averaged**.  This way, you can still find the **total** for a particular time period if you know the original precision.  (To change the aggregation method, see the next section.)

Example: You store the number of sales per minute for 1 year, and the sales per hour for 5 years after that.  You need to know the total sales for January 1st of the year before.  You can query whisper for the raw data, and you'll get 24 datapoints, one for each hour.  They will most likely be floating point numbers.  You can take each datapoint, multiply by 60 (the ratio of high-precision to low-precision datapoints) and still get the total sales per hour.  


The old retentions was done as follows:

.. code-block:: none

  retentions = 60:1440

60 represents the number of seconds per datapoint, and 1440 represents the number of datapoints to store.  This required some unnecessarily complicated math, so although it's valid, it's not recommended.  It's left in so that large organizations with complicated retention rates need not re-write their storage-schemas.conf while when they upgrade. 


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

For example, if you're metric naming scheme is:

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

