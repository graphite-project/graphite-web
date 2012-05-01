The Whisper Database
====================

Whisper is a fixed-size database, similar in design and purpose to RRD (round-robin-database). It
provides fast, reliable storage of numeric data over time. Whisper allows for higher resolution
(seconds per point) of recent data to degrade into lower resolutions for long-term retention of
historical data.


Data Points
-----------
Data points in Whisper are stored on-disk as big-endian double-precision floats. Each value is
paired with a timestamp in seconds since the UNIX Epoch (01-01-1970). The data value is parsed by the
Python `float() <http://docs.python.org/library/functions.html#float>`_ function and as such behaves
in the same way for special strings such as ``'inf'``. Maximum and minimum values are determined by
the Python interpreter's allowable range for float values which can be found by executing::

    python -c 'import sys; print sys.float_info'


Archives: Retention and Precision
---------------------------------
Whisper databases contain one or more archives, each with a specific data resolution and
retention (defined in number of points or max timestamp age). Archives are ordered from the
highest-resolution and shortest retention archive to the lowest-resolution and longest retention period
archive.

To support accurate aggregation from higher to lower resolution archives, the number of points in a
longer retention archive must be divisible by its next lower retention archive. For example, an archive
with 1 data points every 60 seconds and retention of 120 points (2 hours worth of data) can have
a lower-resolution archive following it with a resolution of 1 data point every 300 seconds for 1200 points,
while the same resolution but for only 1000 points would be invalid since 1000 is not evenly divisible by
120.

The total retention time of the database is determined by the archive with the highest retention as the
time period covered by each archive is overlapping (see `Multi-Archive Storage and Retrieval Behavior`_). That is, a pair of
archives with retentions of 1 month and 1 year will not provide 13 months of data storage. Instead,
it will provide 1 year of storage.


Rollup Aggregation
------------------
Whisper databases with more than a single archive need a strategy to collapse multiple data points for
when the data rolls up a lower precision archive. By default, an average function is used.
Available aggregation methods are:
* average
* sum
* last
* max
* min


Multi-Archive Storage and Retrieval Behavior
--------------------------------------------
When Whisper writes to a database with multiple archives, the incoming data point is written to all
archives at once. The data point will be written to the lowest resolution archive as-is, and will be
aggregated by the configured aggregation method (see `Rollup Aggregation`_) and placed into each
of the higher-retention archives.

When data is retrieved (scoped by a time range), the first archive which can satisfy the entire time
period is used. If the time period overlaps an archive boundary, the lower-resolution archive will be
used. This allows for a simpler behavior while retrieving data as the data's resolution is consistent
through an entire returned series.


Disk Space Efficiency
---------------------
Whisper is somewhat inefficient in its usage of disk space because of certain design choices:

*Each data point is stored with its timestamp*
  Rather than a timestamp being inferred from its position in the archive, timestamps are stored with
  each point. The timestamps are during data retrieval to check the validity of the data point. If a
  timestamp does not match the expected value for its position relative to the beginning of the requested
  series, it is known to be out of date and a null value is returned
*Archives overlap time periods*
  During the write of a data point, Whisper stores the same data in all archives at once (see
  `Multi-Archive Storage and Retrieval Behavior`_). Implied by this behavior is that all archives store
  from now until each of their retention times. Because of this, lower-resolution archives should be
  configured to significantly lower resolution and higher retentions than their higher-resolution
  counterparts so as to reduce the overlap.
*All time-slots within an archive take up space whether or not a value is stored*
  While Whisper allows for reliable storage of irregular updates, it is most space efficient when data
  points are stored at every update interval. This behavior is a consequence of the fixed-size design of
  the database and allows the reading and writing of series data to be performed in a single contiguous
  disk operation (for each archive in a database).


Differences Between Whisper and RRD
-----------------------------------
*RRD can not take updates to a time-slot prior to its most recent update*
  This means that there is no way to back-fill data in an RRD series. Whisper does not have this
  limitation, and this makes importing historical data into Graphite much more simple and easy
*RRD was not designed with irregular updates in mind*
  In many cases (depending on configuration) if an update is made to an RRD series but is not
  followed up by another update soon, the original update will be lost. This makes it less suitable
  for recording data such as operational metrics (e.g. code pushes)
*Whisper requires that metric updates occur at the same interval as the finest resolution storage archive*
  This pushes the onus of aggregating values to fit into the finest precision archive to the user rather
  than the database. It also means that updates are written immediately into the finest precision archive
  rather than being staged first for aggregation and written later (during a subsequent write operation)
  as they are in RRD.


Performance
-----------
Whisper is fast enough for most purposes. It is slower than RRDtool primarily as a consequence of
Whisper being written in Python, while RRDtool is written in C. The speed difference between the
two in practice is quite small as much effort was spent to optimize Whisper to be as close to RRDtool's
speed as possible. Testing has shown that update operations take anywhere from 2 to 3 times as long
as RRDtool, and fetch operations take anywhere from 2 to 5 times as long. In practice the actual
difference is measured in hundreds of microseconds (10^-4) which means less than a millisecond
difference for simple cases.


Database Format
---------------
.. csv-table::
  :delim: |
  :widths: 10, 10, 15, 30, 45

  WhisperFile|*Header,Data*
      |Header|*Metadata,ArchiveInfo+*
      |      |Metadata|aggregationType,maxRetention,xFilesFactor,archiveCount
      |      |ArchiveInfo|Offset,SecondsPerPoint,Points
      |Data|*Archive+*
      |    |Archive|*Point+*
      |    |       |Point|timestamp,value

Data types in Python's `struct format <http://docs.python.org/library/struct.html#format-strings>`_:

.. csv-table::
  :delim: |

  Metadata|``!2LfL``
  ArchiveInfo|``!3L``
  Point|``!Ld``
