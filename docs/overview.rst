
5-minute Overview
=================
Graphite does two things:

1. Store numeric time-series data
2. Render graphs of this data on demand

What Graphite does not do is collect data for you, however there are some :doc:`tools </tools>` out
there that know how to send data to graphite. Even though it often requires a little code, sending
data to Graphite very simple.

Graphite consists of 3 software components:

1. **carbon** - a `Twisted`_ daemon that listens for time-series data
2. **whisper** - a simple database library for storing time-series data (similar in design to `RRD`_)
3. **graphite webapp** - A `Django`_ webapp that renders graphs on-demand using `Cairo`_


:doc:`Feeding in your data </feeding-carbon>` is pretty easy, typically most
of the effort is in collecting the data to begin with. As you send datapoints
to Carbon, they become immediately available for graphing in the webapp. The
webapp offers several ways to create and display graphs including a simple
:doc:`URL API </url-api>` that makes it easy to embed graphs in other
webpages.


.. _Django: http://www.djangoproject.com
.. _Twisted: http://www.twistedmatrix.com
.. _Cairo: http://www.cairographics.org
.. _RRD: http://oss.oetiker.ch/rrdtool/
