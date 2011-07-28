The URL API
===========

Basics
======

Terminology
-----------
You should be familiar with these definitions before reading the URL API

datapoint
---------
A value for a given time.

metric
------
A metric is a named set of datapoints ranging over time. 
You determine the name for the data when you send messages to port 2003. 
An example would be system load on a server called 'apache02' in datacenter 'MetroEast':

MetroEast.servers.apache02.system.loadAvg

time
----
Time is represented on the x-axis. 

The smallest time that Graphite can currently save is one second, however,  many metrics are recorded once a minute. Others may only be kept hourly or daily. You pick the length (of time) of one datapoint by configuring storage-schemas.conf *before sending the first datapoint*.

If you send more frequently than defined in storage-schemas.conf, by default Graphite drops the old value and replaces it with the last one it receives.  You can confiure a hit-count function, to add all values, instead of replacing, or have your data collection agent aggregate and send only one value. 

When creating a graph, a dot is place above each time on the x-axis, at the value on the y-axis, and a line is drawn connecting them. If no data was sent, the line will not be drawn and you will see a gap. When using any function that combines many lines (metrics) into one, the lowest resolution (the longest time period per datapoint) is used. 

Parameters
==========
These are separated by an ampersand ( & ) and are in the format

.. code-block:: none
  
  &name=value

(As opposed to functions, which are described in the next section)

.. note::

  Most of the functions and parameters are case sensitive.
  For example &linewidth=2 will fail silently.  
  The correct parameter is &lineWidth=2

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

.. note::
  If more than 10 metrics are drawn the legend is no longer displayed. See the &hideLegend parameter for details. 

width / height
--------------

.. code-block:: none
  
  &width=XXX&height=XXX

These are optional parameters that define the image size in pixels

Example: 

.. code-block:: none
  
  &width=650&height=250

from / until
------------

These are optional parameters that specify the relative or absolute time period to graph. 
``&from`` specifies the beginning, ``&until`` specifies the end.
If ``&from`` is omitted, it defaults to 24 hours ago.
If ``&until`` is omittied, it defaults to the current time (now).

There are multiple formats for these functions:

.. code-block:: none

  &from=-RELATIVE_TIME
  &from=ABSOLUTE_TIME

RELATIVE_TIME is a length of time since the current time.
It is always preceded my a minus sign ( - ) and follow by a unit of time.
Valid units of time:

============== ===============
Abbrieviation  Unit
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
Abbreiviation Meaning
============= =======
HH            Hours, in 24h clock format.  Times before 12PM must include leading zeroes.
MM            Minutes
YYYY          4 Digit Year.
MM            Numeric month representation with leading zero
DD            Day of month with leadng zero
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

rawData
-------

.. note::

  This option is deprecated in favor of ``&format``

Used to get numerical data out of the webapp instead of an image.
Can be set to true, false, csv.
Affects all ``&targets`` passed in the URL.

Example:

.. code-block:: none

  &target=carbon.agents.graphiteServer01.cpuUsage&from=-5min&rawData=true

Returns the following text:

.. code-block:: none

  carbon.agents.graphiteServer01.cpuUsage,1306217160,1306217460,60|0.0,0.00666666520965,0.00666666624282,0.0,0.0133345399694

format
------

Returns raw data instead of a graph.
Affects all ``&targets`` passed in the URL.

Examples:

.. code-block:: none

  &format=raw
  &format=csv
  &format=json

Raw output:

.. code-block:: none

  entries,1311836008,1311836013,1|1.0,2.0,3.0,5.0,6.0

CSV output:

.. code-block:: none

  entries,2011-07-28 01:53:28,1.0
  entries,2011-07-28 01:53:29,2.0
  entries,2011-07-28 01:53:30,3.0
  entries,2011-07-28 01:53:31,5.0
  entries,2011-07-28 01:53:32,6.0

JSON output:

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

margin
------

Used to increase the margin around a graph image on all sides. 
Must be passed a positive integer.
If omitted, the default margin is 10 pixels. 

Example:

.. code-block:: none

  &margin=20

bgcolor
-------

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

fgcolor
-------
Sets the foreground color.  
This only affects the title, legend text, and axis labels.

See majorGridLineColor, and minorGridLineColor to change more of the graph to your preference.

See bgcolor for a list of color names and details on formatting this parameter.

fontName
--------
Change the font used to render text on the graph. 
The font must be installed on the Graphite Server.

Example:

.. code-block:: none

  &fontName=FreeMono

fontSize
--------
Changes the font size.
Must be passed a positive floating point number or integer equal to or greater than 1.
Default is 10

Example:

.. code-block:: none

  &fontSize=8

fontBold
--------
If set to true, makes the font bold. 
Default is false.

Example:

.. code-block:: none

  &fontBold=true

fontItalic
----------
If set to true, makes the font italic / oblique. 
Default is false.

Example:

.. code-block:: none

  &fontItalic=true

yMin
----

Manually sets the lower bound of the graph. Can be passed any integer or floating point number.
By deafult, Graphite attempts to fit all data on one graph. 

Example:

.. code-block:: none

  &yMin=0


yMax
----
Manually sets the upper bound of the graph. Can be passed any integer or floating point number.
By deafult, Graphite attempts to fit all data on one graph. 

Example:

.. code-block:: none

  &yMax=0.2345


colorList
---------
Passed one or more comma-separated color names or RGB values (see bgcolor for a list of color names) and uses that list in order as the colors of the lines.  If more lines / metrics are drawn than colors passed, the list is reused in order. 

Example:

.. code-block:: none

  &colorList=green,yellow,orange,red,purple,#DECAFF

title
-----
Puts a title at the top of the graph, center aligned.
If omitted, no title is displayed.

Example:

.. code-block:: none

  &title=Apache Busy Threads, All Servers, Past 24h


vtitle
------
Labels the y-axis with vertical text.
If omitted, no y-axis labe is displayed.

Example:

.. code-block:: none

  &vtitle=Threads

lineMode
--------
Sets the type of line to be drawn.
Valid modes are 'staircase' (each data point is flat for the duration of the time period) and 'slope' (comes to a point at the time, and slopes to the next time.)
If omitted, default is 'slope'.

Example:

.. code-block:: none

  &lineMode=staircase

lineWidth
---------
Takes any floating point or integer.  (negative numbers do not error but will cause no line to be drawn.
Changes the width of the line in pixels.

Example:

.. code-block:: none

  &lineWidth=2

hideLegend
----------
If set to 'true', the legend is not drawn. 
If set to 'false', the legend is drawn.

*Default value changes depending on the number of targets.*
If there are 10 or less targets, default is true.
If there are more than 10 targets, default is false.

You can force the legend to be draw for more than 10 targets by setting this to false.
You may need to increase the ``&height`` parameter to accomodate the additional text.

Example:

.. code-block:: none

 &hideLegend=false

hideAxes
--------
true or false.
Hides the x- and y-axes.
Default is false.

Example:

.. code-block:: none

  &hideAxes=true
 
hideGrid
--------
true or false
Hides the grid lines. 
Default is false. 

Example:

.. code-block:: none

  &hideGrid=true

minXStep
--------

majorGridLineColor
------------------
Sets the color of the major grid lines.  

See bgcolor for valid color names and formats. 


Example:

.. code-block:: none

  &majorGridLineColor=#FF22FF

minorGridLineColor
------------------
Sets the color of the minor grid lines.

See bgcolor for valid color names and formats.

Example:

.. code-block:: none

  &minorGridLineColor=darkgrey


thickness
---------
Alias for lineWidth

min
---
alias for yMin

max
---
alias for yMax

