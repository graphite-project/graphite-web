The Ceres Database
====================

Ceres is a time-series database format intended to replace Whisper as the default storage format
for Graphite. In contrast with Whisper, Ceres is not a fixed-size database and is designed to
better support sparse data of arbitrary fixed-size resolutions. This allows Graphite to distribute
individual time-series across multiple servers or mounts.

Ceres is not actively developped at the moment. For alternatives to whisper look at :doc:`alternative storage backends </tools>`.

Storage Overview
----------------
Ceres databases are comprised of a single tree contained within a single path on disk that stores all
metrics in nesting directories as nodes.

A Ceres node represents a single time-series metric, and is composed of at least two data files. A slice
to store all data points, and an arbitrary key-value metadata file. The minimum required metadata a node
needs is a ``'timeStep'``. This setting is the finest resolution that can be used for writing. A Ceres
node however can contain and read data with other, less-precise values in its underlying slice data.

Other metadata keys that may be set for compatibility with Graphite are ``'retentions'`` , ``'xFilesFacter'``,
and ``'aggregationMethod'``.

A Ceres slice contains the actual data points in a file. The only other information a slice holds is the
timestamp of the oldest data point, and the resolution. Both of which are encoded as part of its filename
in the format ``timestamp@resolution``.

Data points in Ceres are stored on-disk as a contiguous list of big-endian double-precision floats. The
timestamp of a datapoint is not stored with the value, rather it is calculated by using the timestamp
of the slice plus the index offset of the value multiplied by the resolution.

The timestamp is the number of seconds since the UNIX Epoch (01-01-1970). The data value is parsed by the
Python `float() <http://docs.python.org/library/functions.html#float>`_ function and as such behaves in
the same way for special strings such as ``'inf'``. Maximum and minimum values are determined by the
Python interpreter's allowable range for float values which can be found by executing::

    python -c 'import sys; print sys.float_info'


Slices: Precision and Fragmentation
-----------------------------------
Ceres databases contain one or more slices, each with a specific data resolution and a timestamp to mark
the beginning of the slice. Slices are ordered from the most recent timestamp to the oldest timestamp.
Resolution of data is not considered when reading from a slice, only that when writing a slice with the
finest precision configured for the node exists.

Gaps in data are handled in Ceres by padding slices with null datapoints. If the slice gap however is too
big, then a new slice is instead created. If a Ceres node accumulates too many slices, read performance
can suffer. This can be caused by intermittently reported data. To mitigate slice fragmentation there is
a tolerance for how much space can be wasted within a slice file to avoid creating a new one. That
tolerance level is determined by ``'MAX_SLICE_GAP'``, which is the number of consecutive null datapoints
allowed in a slice file.

If set very low, Ceres will waste less of the tiny bit disk space that this feature wastes, but then
will be prone to performance problems caused by slice fragmentation, which can be pretty severe.

If set really high, Ceres will waste a bit more disk space. Although each null datapoint wastes 8 bytes,
you must keep in mind your filesystem's block size. If you suffer slice fragmentation issues, you should
increase this or defrag the data more often. However you should not set it to be huge because then if a
large but allowed gap occurs it has to get filled in, which means instead of a simple 8-byte write to a
new file we could end up doing an ``(8 * MAX_SLICE_GAP)``-byte write to the latest slice.


Rollup Aggregation
------------------
Expected features such as roll-up aggregation and data expiration are not provided by Ceres itself, but
instead are implemented as maintenance plugins.

Such a rollup plugin exists in Ceres that aggregates data points in a way that is similar behavior of
Whisper archives. Where multiple data points are collapsed and written to a lower precision slice, and
data points outside of the set slice retentions are trimmed. By default, an average function is used,
however alternative methods can be chosen by changing the metadata.


Retrieval Behavior
------------------
When data is retrieved (scoped by a time range), the first slice which has data within the requested
interval is used. If the time period overlaps a slice boundary, then both slices are read, with their
values joined together.  Any missing data between them are filled with null data points.

There is currently no support in Ceres for handling slices with mixed resolutions in the same way that
is done with Whisper archives.


Database Format
---------------
.. csv-table::
  :delim: |
  :widths: 10, 10, 10

  CeresSlice|*Data*
      |Data|*Point+*

Data types in Python's `struct format <http://docs.python.org/library/struct.html#format-strings>`_:

.. csv-table::
  :delim: |

  Point|``!d``

Metadata for Ceres is stored in `JSON format <https://docs.python.org/3/library/json.html>`_:

    {"retentions": [[30, 1440]], "timeStep": 30, "xFilesFactor": 0.5, "aggregationMethod": "average"}
