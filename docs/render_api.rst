==================
The Render URL API
==================

The graphite webapp provides a ``/render`` endpoint for generating graphs
and retreiving raw data. This endpoint accepts various arguments via query
string parameters.  These parameters are separated by an ampersand (``&``)
and are supplied in the format:

.. code-block:: none

  &name=value

To verify that the api is running and able to generate images, open
``http://GRAPHITE_HOST:GRAPHITE_PORT/render`` in a browser. The api should
return a simple 330x250 image with the text "No Data".

Once the api is running and you've begun
:doc:`feeding data into carbon </feeding-carbon>`, use the parameters below to
customize your graphs and pull out raw data. For example:

.. code-block:: none

  # single server load on large graph
  http://graphite/render?target=server.web1.load&height=800&width=600

  # average load across web machines over last 12 hours
  http://graphite/render?target=averageSeries(server.web*.load)&from=-12hours

  # number of registered users over past day as raw json data
  http://graphite/render?target=app.numUsers&format=json

  # rate of new signups per minute
  http://graphite/render?target=summarize(deriviative(app.numUsers),"1min")&title=New_Users_Per_Minute

.. note::

  Most of the functions and parameters are case sensitive.
  For example ``&linewidth=2`` will fail silently.
  The correct parameter in this case is ``&lineWidth=2``

Graphing Metrics
================

To begin graphing specific metrics, pass one or more target_ parameters
and specify a time window for the graph via `from / until`_.

target
------

This will draw one or more metrics

Example:

.. code-block:: none

  &target=company.server05.applicationInstance04.requestsHandled
  (draws one metric)

Let's say there are 4 identical application instances running on each server.

.. code-block:: none

  &target=company.server05.applicationInstance*.requestsHandled
  (draws 4 metrics / lines)

Now let's say you have 10 servers.

.. code-block:: none

  &target=company.server*.applicationInstance*.requestsHandled
  (draws 40 metrics / lines)

You can also run any number of :doc:`functions </functions>` on the various metrics before graphing.

.. code-block:: none

  &target=averageSeries(company.server*.applicationInstance.requestsHandled)
  (draws 1 aggregate line)

The target param can also be repeated to graph multiple related metrics.

.. code-block:: none

  &target=company.server1.loadAvg&target=company.server1.memUsage

.. note::
  If more than 10 metrics are drawn the legend is no longer displayed. See the hideLegend_ parameter for details.

from / until
------------

These are optional parameters that specify the relative or absolute time period to graph.
``from`` specifies the beginning, ``until`` specifies the end.
If ``from`` is omitted, it defaults to 24 hours ago.
If ``until`` is omitted, it defaults to the current time (now).

There are multiple formats for these functions:

.. code-block:: none

  &from=-RELATIVE_TIME
  &from=ABSOLUTE_TIME

RELATIVE_TIME is a length of time since the current time.
It is always preceded my a minus sign ( - ) and follow by a unit of time.
Valid units of time:

============== ===============
Abbreviation   Unit
============== ===============
s              Seconds
min            Minutes
h              Hours
d              Days
w              Weeks
mon            30 Days (month)
y              365 Days (year)
============== ===============

ABSOLUTE_TIME is in the format HH:MM_YYMMDD, YYYYMMDD, MM/DD/YY, or any other
``at(1)``-compatible time format.

============= =======
Abbreviation  Meaning
============= =======
HH            Hours, in 24h clock format.  Times before 12PM must include leading zeroes.
MM            Minutes
YYYY          4 Digit Year.
MM            Numeric month representation with leading zero
DD            Day of month with leading zero
============= =======

``&from`` and ``&until`` can mix absolute and relative time if desired.

Examples:

.. code-block:: none

  &from=-8d&until=-7d
  (shows same day last week)

  &from=04:00_20110501&until=16:00_20110501
  (shows 4AM-4PM on May 1st, 2011)

  &from=20091201&until=20091231
  (shows December 2009)

  &from=noon+yesterday
  (shows data since 12:00pm on the previous day)

  &from=6pm+today
  (shows data since 6:00pm on the same day)

  &from=january+1
  (shows data since the beginning of the current year)

  &from=monday
  (show data since the previous monday)

Data Display Formats
====================

Along with rendering an image, the api can also generate
`SVG <http://www.w3.org/Graphics/SVG/>`_  with embedded metadata or return the raw data in various
formats for external graphing, analysis or monitoring.

format
------

Controls the format of data returned.
Affects all ``&targets`` passed in the URL.

Examples:

.. code-block:: none

  &format=png
  &format=raw
  &format=csv
  &format=json
  &format=svg

png
^^^
Renders the graph as a PNG image of size determined by width_ and height_

raw
^^^
Renders the data in a custom line-delimited format. Targets are output one per line and are of the format
``<target name>,<start timestamp>,<end timestamp>,<series step>|[data]*``

.. code-block:: none

  entries,1311836008,1311836013,1|1.0,2.0,3.0,5.0,6.0

csv
^^^
Renders the data in a CSV format suitable for import into a spreadsheet or for processing in a script

.. code-block:: none

  entries,2011-07-28 01:53:28,1.0
  entries,2011-07-28 01:53:29,2.0
  entries,2011-07-28 01:53:30,3.0
  entries,2011-07-28 01:53:31,5.0
  entries,2011-07-28 01:53:32,6.0

json
^^^^
Renders the data as a json object. The jsonp_ option can be used to wrap this data in a named call
for cross-domain access

.. code-block:: none

  [{
    "target": "entries",
    "datapoints": [
      [1.0, 1311836008],
      [2.0, 1311836009],
      [3.0, 1311836010],
      [5.0, 1311836011],
      [6.0, 1311836012]
    ]
  }]

svg
^^^
Renders the graph as SVG markup of size determined by width_ and  height_. Metadata about
the drawn graph is saved as an embedded script with the variable ``metadata`` being set to
an object describing the graph

.. code-block:: none

  <script>
    <![CDATA[
      metadata = {
        "area": {
          "xmin": 39.195507812499997,
          "ymin": 33.96875,
          "ymax": 623.794921875,
          "xmax": 1122
        },
        "series": [
          {
            "start": 1335398400,
            "step": 1800,
            "end": 1335425400,
            "name": "summarize(test.data, \"30min\", \"sum\")",
            "color": "#859900",
            "data": [null, null, 1.0, null, 1.0, null, 1.0, null, 1.0, null, 1.0, null, null, null, null],
            "options": {},
            "valuesPerPoint": 1
          }
        ],
        "y": {
          "labelValues": [0, 0.25, 0.5, 0.75, 1.0],
          "top": 1.0,
          "labels": ["0 ", "0.25 ", "0.50 ", "0.75 ", "1.00  "],
          "step": 0.25,
          "bottom": 0
        },
        "x": {
          "start": 1335398400,
          "end": 1335423600
        },
        "font": {
          "bold": false,
          "name": "Sans",
          "italic": false,
          "size": 10
        },
        "options": {
          "lineWidth": 1.2
        }
      }
    ]]>
  </script>

pickle
^^^^^^
Returns a Python `pickle <http://docs.python.org/library/pickle.html>`_ (serialized Python object).
The response will have the MIME type 'application/pickle'. The pickled object is a list of
dictionaries with the keys: ``name``, ``start``, ``end``, ``step``, and ``values`` as below:

.. code-block:: python

  [
    {
      'name' : 'summarize(test.data, "30min", "sum")',
      'start': 1335398400,
      'end'  : 1335425400,
      'step' : 1800,
      'values' : [None, None, 1.0, None, 1.0, None, 1.0, None, 1.0, None, 1.0, None, None, None, None],
    }
  ]

rawData
-------

.. deprecated:: 0.9.9

  This option is deprecated in favor of format_

Used to get numerical data out of the webapp instead of an image.
Can be set to true, false, csv.
Affects all ``&targets`` passed in the URL.

Example:

.. code-block:: none

  &target=carbon.agents.graphiteServer01.cpuUsage&from=-5min&rawData=true

Returns the following text:

.. code-block:: none

  carbon.agents.graphiteServer01.cpuUsage,1306217160,1306217460,60|0.0,0.00666666520965,0.00666666624282,0.0,0.0133345399694


Graph Parameters
================

areaAlpha
---------
*Default: 1.0*

Takes a floating point number between 0.0 and 1.0 
Sets the alpha (transparency) value of filled areas when using an areaMode_

areaMode
--------
*Default: none*

Enables filling of the area below the graphed lines. Fill area is the same color as
the line color associated with it. See areaAlpha_ to make this area transparent. 
Takes one of the following parameters which determines the fill mode to use:

``none``
  Disables areaMode
``first``
  Fills the area under the first target and no other
``all``
  Fills the areas under each target
``stacked``
  Creates a graph where the filled area of each target is stacked on one another.
  Each target line is displayed as the sum of all previous lines plus the value of the current line.


bgcolor
-------
*Default: value from the [default] template in graphTemplates.conf*

Sets the background color of the graph.

============ =============
Color Names  RGB Value
============ =============
black        0,0,0
white        255,255,255
blue         100,100,255
green        0,200,0
red          200,0,50
yellow       255,255,0
orange       255, 165, 0
purple       200,100,255
brown        150,100,50
aqua         0,150,150
gray         175,175,175
grey         175,175,175
magenta      255,0,255
pink         255,100,100
gold         200,200,0
rose         200,150,200
darkblue     0,0,255
darkgreen    0,255,0
darkred      255,0,0
darkgray     111,111,111
darkgrey     111,111,111
============ =============

RGB can be passed directly in the format #RRGGBB where RR, GG, and BB are 2-digit hex vaules for red, green and blue, respectively.

Examples:

.. code-block:: none

  &bgcolor=blue
  &bgcolor=#2222FF

cacheTimeout
------------
*Default: The value of DEFAULT_CACHE_DURATION from local_settings.py*

The time in seconds for the rendered graph to be cached (only relevant if memcached is configured)

colorList
---------
*Default: value from the [default] template in graphTemplates.conf*

Takes one or more comma-separated color names or RGB values (see bgcolor for a list of color names) and uses that list in order as the colors of the lines.  If more lines / metrics are drawn than colors passed, the list is reused in order.

Example:

.. code-block:: none

  &colorList=green,yellow,orange,red,purple,#DECAFF

drawNullAsZero
--------------
*Default: false*

Converts any None (null) values in the displayed metrics to zero at render time.

fgcolor
-------
*Default: value from the [default] template in graphTemplates.conf*

Sets the foreground color.
This only affects the title, legend text, and axis labels.

See majorGridLineColor_, and minorGridLineColor_ for further control of colors.

See bgcolor_ for a list of color names and details on formatting this parameter.

fontBold
--------
*Default: value from the [default] template in graphTemplates.conf*

If set to true, makes the font bold.

Example:

.. code-block:: none

  &fontBold=true

fontItalic
----------
*Default: value from the [default] template in graphTemplates.conf*

If set to true, makes the font italic / oblique.
Default is false.

Example:

.. code-block:: none

  &fontItalic=true

fontName
--------
*Default: value from the [default] template in graphTemplates.conf*

Change the font used to render text on the graph.
The font must be installed on the Graphite Server.

Example:

.. code-block:: none

  &fontName=FreeMono

fontSize
--------
*Default: value from the [default] template in graphTemplates.conf*

Changes the font size.
Must be passed a positive floating point number or integer equal to or greater than 1.
Default is 10

Example:

.. code-block:: none

  &fontSize=8

format
------
See: `Data Display Formats`_

from
----
See: `from / until`_

graphOnly
---------
*Default: False*

Display only the graph area with no grid lines, axes, or legend

graphTypes
----------
*Default: line*

Sets the type of graph to be rendered. Currently there are only two graph types:

``line``
  A line graph displaying metrics as lines over time
``pie``
  A pie graph with each slice displaying an aggregate of each metric calculated using the function
  specified by pieMode_

hideLegend
----------
*Default: <unset>*

If set to ``true``, the legend is not drawn.
If set to ``false``, the legend is drawn.
If unset, the ``LEGEND_MAX_ITEMS`` settings in ``local_settings.py`` is used to determine
whether or not to display the legend.

Hint: If set to ``false`` the ``&height`` parameter may need to be increased to accommodate the additional text.

Example:

.. code-block:: none

 &hideLegend=false

hideAxes
--------
*Default: False*

If set to ``true`` the X and Y axes will not be rendered
Example:

.. code-block:: none

  &hideAxes=true

hideYAxis
---------
*Default: False*

If set to ``true`` the Y Axis will not be rendered

hideGrid
--------
*Default: False*

If set to ``true`` the grid lines will not be rendered

Example:

.. code-block:: none

  &hideGrid=true

height
------
*Default: 250*

Sets the height of the generated graph image in pixels.

See also: width_

Example:

.. code-block:: none

  &width=650&height=250

jsonp
-----
*Default: <unset>*

If set and combined with ``format=json``, wraps the JSON response in a function call
named by the parameter specified.

leftColor
---------
*Default: color chosen from* colorList_

In dual Y-axis mode, sets the color of all metrics associated with the left Y-axis.

leftDashed
----------
*Default: False*

In dual Y-axis mode, draws all metrics associated with the left Y-axis using dashed lines

leftWidth
---------
*Default: value of the parameter* lineWidth_

In dual Y-axis mode, sets the line width of all metrics associated with the left Y-axis

lineMode
--------
*Default: slope*

Sets the line drawing behavior. Takes one of the following parameters:

``slope``
  Slope line mode draws a line from each point to the next. Periods will Null values will not be drawn
``staircase``
  Staircase draws a flat line for the duration of a time period and then a vertical line up or down to the next value
``connected``
  Like a slope line, but values are always connected with a slope line, regardless of whether or not there are Null values between them

Example:

.. code-block:: none

  &lineMode=staircase

lineWidth
---------
*Default: 1.2*

Takes any floating point or integer (negative numbers do not error but will cause no line to be drawn).
Changes the width of the line in pixels.

Example:

.. code-block:: none

  &lineWidth=2

logBase
-------
*Default: <unset>*

If set, draws the graph with a logarithmic scale of the specified base (e.g. 10 for common logarithm)

localOnly
---------
*Default: False*

Set to prevent fetching from remote Graphite servers, only returning metrics which are accessible locally

majorGridLineColor
------------------
*Default: value from the [default] template in graphTemplates.conf*

Sets the color of the major grid lines.

See bgcolor for valid color names and formats.


Example:

.. code-block:: none

  &majorGridLineColor=#FF22FF

margin
------
*Default: 10*
Sets the margin around a graph image in pixels on all sides.

Example:

.. code-block:: none

  &margin=20

max
---
.. deprecated:: 0.9.0
   See yMax_


minorGridLineColor
------------------
*Default: value from the [default] template in graphTemplates.conf*

Sets the color of the minor grid lines.

See bgcolor_ for valid color names and formats.

Example:

.. code-block:: none

  &minorGridLineColor=darkgrey

minorY
------
Sets the number of minor grid lines per major line on the y-axis.

Example:

.. code-block:: none

  &minorY=3

min
---
.. deprecated:: 0.9.0
  See yMin_

minXStep
--------
*Default: 1*

Sets the minimum pixel-step to use between datapoints drawn. Any value below this will trigger a
point consolidation of the series at render time. The default value of ``1`` combined with the default
lineWidth of ``1.2`` will cause a minimal amount of line overlap between close-together points. To
disable render-time point consolidation entirely, set this to ``0`` though note that series with more points
than there are pixels in the graph area (e.g. a few month's worth of per-minute data) will look very
'smooshed' as there will be a good deal of line overlap. In response, one may use lineWidth_ to compensate
for this.

noCache
-------
*Default: False*

Set to disable caching of rendered images

pickle
------
.. deprecated:: 0.9.10
  See `Data Display Formats`_

pieMode
-------
*Default: average*

The type of aggregation to use to calculate slices of a pie when ``graphType=pie``.
One of:

``average``
  The average of non-null points in the series
``maximum``
  The maximum of non-null points in the series
``minimum``
  THe minimum of non-null points in the series

rightColor
----------
*Default: color chosen from* colorList_

In dual Y-axis mode, sets the color of all metrics associated with the right Y-axis.

rightDashed
-----------
*Default: False*

In dual Y-axis mode, draws all metrics associated with the right Y-axis using dashed lines

rightWidth
----------
*Default: value of the parameter* lineWidth_

In dual Y-axis mode, sets the line width of all metrics associated with the right Y-axis

template
--------
*Default: default*

Used to specify a template from ``graphTemplates.conf`` to use for default
colors and graph styles.

Example:

.. code-block:: none

  &template=plain

thickness
---------
.. deprecated:: 0.9.0
  See: lineWidth_

title
-----
*Default: <unset>*

Puts a title at the top of the graph, center aligned.
If unset, no title is displayed.

Example:

.. code-block:: none

  &title=Apache Busy Threads, All Servers, Past 24h

tz
--
*Default: The timezone specified in local_settings.py*

Time zone to convert all times into.

Examples:

.. code-block:: none

  &tz=America/Los_Angeles
  &tz=UTC

.. note::

  To change the default timezone, edit ``webapp/graphite/local_settings.py``.

uniqueLegend
------------
*Default: False*

Display only unique legend items, removing any duplicates

until
-----
See: `from / until`_

vtitle
------
*Default: <unset>*

Labels the y-axis with vertical text.
If unset, no y-axis label is displayed.

Example:

.. code-block:: none

  &vtitle=Threads

vtitleRight
-----------
*Default: <unset>*

In dual Y-axis mode, sets the title of the right Y-Axis (See: `vtitle`_)

width
-----
*Default: 330*

Sets the width of the generated graph image in pixels.

See also: height_

Example:

.. code-block:: none

  &width=650&height=250

xFormat
-------
*Default: Determined automatically based on the time-width of the X axis*

Sets the time format used when displaying the X-axis. See
`datetime.date.strftime() <http://docs.python.org/library/datetime.html#datetime.date.strftime>`_
for format specification details.

yAxisSide
---------
*Default: left*

Sets the side of the graph on which to render the Y-axis. Accepts values of ``left`` or ``right``

yLimit
------
*Reserved for future use*
See: yMax_

yLimitLeft
----------
*Reserved for future use*
See: yMaxLeft_

yLimitRight
-----------
*Reserved for future use*
See: yMaxRight_

yMin
----
*Default: The lowest value of any of the series displayed*

Manually sets the lower bound of the graph. Can be passed any integer or floating point number.

Example:

.. code-block:: none

  &yMin=0

yMax
----
*Default: The highest value of any of the series displayed*

Manually sets the upper bound of the graph. Can be passed any integer or floating point number.

Example:

.. code-block:: none

  &yMax=0.2345

yMaxLeft
--------
In dual Y-axis mode, sets the upper bound of the left Y-Axis (See: `yMax`_)

yMaxRight
---------
In dual Y-axis mode, sets the upper bound of the right Y-Axis (See: `yMax`_)

yMinLeft
--------
In dual Y-axis mode, sets the lower bound of the left Y-Axis (See: `yMin`_)

yMinRight
---------
In dual Y-axis mode, sets the lower bound of the right Y-Axis (See: `yMin`_)

yStep
-----
*Default: Calculated automatically*

Manually set the value step between Y-axis labels and grid lines

yStepLeft
---------
In dual Y-axis mode, Manually set the value step between the left Y-axis labels and grid lines (See: `yStep`_)

yStepRight
----------
In dual Y-axis mode, Manually set the value step between the right Y-axis labels and grid lines (See: `yStep`_)

yUnitSystem
-----------
*Default: si*

Set the unit system for compacting Y-axis values (e.g. 23,000,000 becomes 23M).
Value can be one of:

``si``
  Use si units (powers of 1000) - K, M, G, T, P
``binary``
  Use binary units (powers of 1024) - Ki, Mi, Gi, Ti, Pi
``none``
  Dont compact values, display the raw number

