
5-minute Overview
=================
Graphite consists of 3 components:

1. Carbon - a `Twisted`_ daemon that listens for time-series data
2. Whisper - a simple database library for storing time-series data (similar in design to `RRD`_)
3. The Graphite Webapp - A `Django`_ webapp that renders graphs on-demand using `Cairo`_


:doc:`Feeding data to Carbon </feeding-carbon>` is pretty easy, typically most
of the effort is in collecting the data to begin with. As you send datapoints
to Carbon, they become immediately available for graphing in the webapp. The
webapp offers several ways to create and display graphs including
:doc:`a simple URL API </url-api>` that makes it easy to embed graphs in other
webpages.


.. _Django: http://www.djangoproject.com
.. _Twisted: http://www.twistedmatrix.com
.. _Cairo: http://www.cairographics.org
.. _RRD: http://oss.oetiker.ch/rrdtool/
