Terminology
-----------
You should be familiar with these definitions before reading the URL API

datapoint
^^^^^^^^^
A value for a given time.

metric
^^^^^^
A metric is a named set of datapoints ranging over time.
You determine the name for the data when you send messages to port 2003.
An example would be system load on a server called ``apache02`` in datacenter ``MetroEast``:

.. code-block:: none

  MetroEast.servers.apache02.system.loadAvg

time
^^^^
Time is represented on the x-axis.

The smallest time that Graphite can currently save is one second, however,  many metrics are recorded once a minute. Others may only be kept hourly or daily. You pick the length (of time) of one datapoint by configuring storage-schemas.conf *before sending the first datapoint*.

If you send more frequently than defined in ``storage-schemas.conf``, by default Graphite drops the old value and replaces it with the last one it receives.  You can configure a hit-count function, to add all values, instead of replacing, or have your data collection agent aggregate and send only one value.

When creating a graph, a dot is place above each time on the x-axis, at the value on the y-axis, and a line is drawn connecting them. If no data was sent, the line will not be drawn and you will see a gap. When using any function that combines many lines (metrics) into one, the lowest resolution (the longest time period per datapoint) is used.

