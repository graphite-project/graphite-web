The Carbon Daemons
==================

When we talk about "Carbon" we mean one or more of various daemons that make up the
storage backend of a Graphite installation. In simple installations, there is typically
only one daemon, ``carbon-cache.py``. This document gives a brief overview of what
each daemon does and how you can use them to build a more sophisticated storage backend.

All of the carbon daemons listen for time-series data and can accept it over a common
set of :doc:`protocols </feeding-carbon>`. However, they differ in what they do with
the data once they receive it.


carbon-cache.py
---------------
...



carbon-relay.py
---------------
...



carbon-aggregator.py
--------------------
...


Grand Unification?
------------------
...
