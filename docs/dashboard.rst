
============================
The Dashboard User Interface
============================

The Dashboard interface is the tool of choice for displaying more than one graph at a time, with all graphs showing the
same time range.  Unless you're using the HTTP interface to embed graphs in your own applications or web pages,
this is the Graphite interface you'll use most often.  It's certainly the interface that will be of most use
to operations staff.

Getting Started with the Dashboard Interface
--------------------------------------------
You can access the Dashboard interface directly at ``http://my.graphite.host/dashboard``, or via the link at the top
of the Composer interface.

Completer or browser tree?
^^^^^^^^^^^^^^^^^^^^^^^^^^
When you open the Dashboard interface, you'll see the top of the page taken up by a completer.  This allows you to
select a metric series to show on a graph in the dashboard.

If you're only viewing a dashboard rather than modifying one, the completer just gets in the way.  You can either resize
it by dragging the splitter bar (between the completer and graph panels), or hide it by clicking on the little triangular
icon in the splitter bar.  Once hidden, the same triangular icon serves to display the panel again.

An alternative to the completer is a browser tree, which shows to the left of the graph panel.  To change to this mode, use
the *Dashboard | Configure UI* menu item, and choose *Tree (left nav)*.  You'll have to refresh the page to get this to
show.  The completer and browser tree do the same job, so the choice is down to your personal preference.  Your choice is
recorded in a persistent browser cookie, so it should be preserved across sessions.


Creating or Modifying a Dashboard
---------------------------------
When you open the Dashboard interface, no dashboard is open.  You can either start building a new dashboard, or you
can open an existing one (see `Opening a Dashboard`_) and modify that.  If you're working on a previously-saved
dashboard, its name will show at the top of the completer and browser tree panels.

**Note for Power Users:** Any action that can be performed via the UI, as explained in this section, can also be performed using
the Edit Dashboard function (as JSON text). See `Editing, Importing and Exporting via JSON`_. 

Adding a Graph
^^^^^^^^^^^^^^
To add a new graph directly, you select a metric series in the completer or browser tree, and a graph for that value is added to the
end of the dashboard.  Alternatively, if a graph for that metric series already exists on the dashboard, it will be removed.

See later for ways of customizing the graph, including adding multiple metric series, changing axes, adding titles and legends etc.

Importing a Graph
^^^^^^^^^^^^^^^^^
Existing graphs can be imported into your dashboard, either from URLs or from saved graphs.

Import a graph from a URL when you already have the graph you want displaying elsewhere (maybe you built it in the
Completer, or you want to copy it from another dashboard).  Use the *Graphs | New Graph | From URL* menu item
and enter the URL, which you probably copied from another browser window.

Alternatively, if you've saved a graph in the Composer, you can import it.  Use the
*Graphs | New Graph | From Saved Graph* menu item, and select the graph to import.

Deleting a Graph
^^^^^^^^^^^^^^^^
When you hover the mouse over a graph, a red cross icon appears at the top right.  Click this to delete the graph from
the dashboard.

Multiple Metrics - Combining Graphs
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The simplest way to show more than one metric on a graph is to add each as a separate graph, and then combine the graphs.
To combine 2 graphs, drag one over the other and then wait until the target graph shows "Drop to Merge".  Drop the graph,
and the target graph will now show all metrics from both graphs.  Repeat for as many metrics as required.

Note, however, that if you have multiple *related* metrics, it may be easier to use a single path containing wildcards -
see `Paths and wildcards`_.

Re-ordering Graphs
^^^^^^^^^^^^^^^^^^
Drag a graph to the position you want, and drop it *before the "Drop to Merge" message shows.*

For power users wanting to perform a large scale re-ordering of graphs in a dashboard, consider using
`Editing, Importing and Exporting via JSON`_.

Saving the Dashboard
^^^^^^^^^^^^^^^^^^^^
If the dashboard has previously been saved, and assuming you have any required permissions (see later), you can use
the *Dashboard | Save* menu item to save your changes.  Note that your dashboard will be visible to all users, whether
logged in or not, and can be edited and/or deleted by any user with the required permissions.

You can use the *Dashboard | Save As* menu item to save your dashboard for the first time, or to save it with a different
name.


Viewing a Dashboard
-------------------
This section explains the options available when viewing an existing dashboard. Once you've defined the dashboards you need,
you'll spend most of your time in this mode.

Note that you'll most likely want to hide the completer when working in this mode - see earlier.

Opening a Dashboard
^^^^^^^^^^^^^^^^^^^
Use the *Dashboard | Finder* menu item to select the dashboard to open.

Setting the Time Range
^^^^^^^^^^^^^^^^^^^^^^
Graphite allows you to set a time range as relative or absolute.  Relative time ranges are most commonly used. The same time
range is applied to every graph on the dashboard, and the current time range is shown in the center of the menu bar.

To set a relative time range, click the *Relative Time Range* menu button, and enter the time range to display (value
and units, e.g. "6 hours").  By default, this time range ends at the current time, as shown by "Now" in the "Until" units field.
However, you can move the time range back by entering your own value and units in the "Until" fields.

To set an absolute time range, click the *Absolute Time range* menu button, and set the start and end dates and times (all
are required).  Dates can be selected using the calendar picker or entered directly in US format (mm/dd/yyyy), while
times can be selected from the dropdown or entered in 12 or 24 hour format (e.g. "5:00 PM", "17:00").

Manual and Auto Refresh
^^^^^^^^^^^^^^^^^^^^^^^
By default, dashboards are set to manually refresh. Click the green refresh menu button to the left of the
*Auto-Refresh* button to refresh the dashboard. The time of the last refresh is shown at the right of the menu bar.

Alternatively, set the dashboard to auto-refresh by ensuring that the *Auto-Refresh* menu button is pressed in.  The refresh
defaults to 60 seconds, but you can change this in the edit field to the right of the *Auto-Refresh* button.

Note that refresh options are saved with the dashboard.


Customizing Graphs
------------------
To change a graph on the dashboard, click on it.  This will display a pop-up containing the following sections:

* A list of all metric elements, i.e. the path and functions for each of the data elements displayed on the graph
* An *Apply Function* menu button, which allows functions to be applied to the currently-selected item in
  the metrics list
* A *Render Operations* menu button, which allows customization of the graph as a whole
* A *Graph Operations* menu button, providing menu items for miscellaneous actions to take on the graph.

.. note::
  The items in the list of metrics can be edited in place.  Double-click the item, edit as required, then
  hit Enter to complete.


Paths and Wildcards
^^^^^^^^^^^^^^^^^^^
In any reasonably-sized environment, you'll have the same or similar metrics being collected from a number
of points.  Rather than requiring you to add each one to the graph individually, Graphite provides a powerful
wildcard mechanism - for example, the metric path ``servers.*ehssvc*.cpu.total.{user,system,iowait}`` will
include a line on the graph for the user, system and I/O wait CPU usage for every server whose name contains
``ehssvc``.  Each of these is referred to as a metric series.  Graphite also provides a large number of functions
for working on groups of metric series, e.g. showing only the top 5 metric series from a group.

See :ref:`paths-and-wildcards` for further information.

Customizing a Single Metric Element
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
To customize a single metric element, you select the element in the metric list, then use the menu items on the
*Apply Function* menu button to apply functions to the metric element.  Note that each metric element in the
list may include multiple metric series, e.g. if the path includes wildcards.

.. note::
  All these actions use functions documented on :ref:`the functions page <list-of-functions>`. For further
  information, read the documentation for the appropriate function on that page.  Function names are included
  in brackets in the list below.

The functions are grouped in the menu, as follows:

*Combine*
  Functions that combine a group of metric series (returned by a path containing wildcards) into a single series
  (and therefore a single line).  Includes sum, average, product, minimum, maximum.

*Transform*
  Functions that transform the values in a metric series, against either the Y-axis or (less commonly) the X-axis. Includes
  scale, scale to seconds, offset, derivative, integral, time-shift, log.

*Calculate*
  Functions that calculate a new metric series based on an existing metric series. Includes moving average, percentage, Holt-Winters
  forecast, ratio and difference (of 2 metrics)

*Filter*
  Functions that filter metric series from a group. Includes highest current value,
  current value above limit, most deviant, remove below percentile.

*Special*
  Functions that control how the metric series are drawn on the graph.  Includes line colors/widths/styles, drawing stacked,
  drawing on the second Y-axis, and setting the legend name either directly or from the path.

The last menu item is *Remove Outer Call*, which removes the outer-most function on the current metric.

Customizing the Whole Graph
^^^^^^^^^^^^^^^^^^^^^^^^^^^
The *Render Options* menu button is used to set options that apply to the whole graph, rather than just the selected
metric.

.. note::
  
  Each of the items in this menu matches a graph parameter in the :doc:`render_api`.  For further information, read the
  documentation for the appropriate parameter on that page.

The functions are grouped as follows:

*Graph Title*
  Unsurprisingly, this sets the title for the graph.  See :ref:`param-title`.

*Display*
  Provides options for:

  - fonts (see :ref:`param-fontName`, :ref:`param-fontBold`, :ref:`param-fontItalic`, :ref:`param-fontSize` and
    :ref:`param-fgcolor`)
  - colors (see :ref:`param-colorList`, :ref:`param-bgcolor`, :ref:`param-majorGridLineColor`, :ref:`param-minorGridLineColor`
    and :ref:`param-areaAlpha`)
  - legends (see :ref:`param-hideLegend` and :ref:`param-uniqueLegend`)
  - line thickness (see :ref:`param-lineWidth`)
  - hiding of graph elements (see :ref:`param-graphOnly`, :ref:`param-hideAxes`, :ref:`param-hideYAxis` and :ref:`param-hideGrid`)
  - apply a template (see :ref:`param-template`).

*Line Mode*
  Sets the way lines are rendered, e.g. sloped, staircase, connected, and how the value ``None`` is rendered.
  See :ref:`param-lineMode` and :ref:`param-drawNullAsZero`.

*Area Mode*
  Determines whether the area below lines is filled, and whether the lines are stacked.  See :ref:`param-areaMode`.

*X-Axis*
  Allows setting the time format for dates/times on the axis (see :ref:`param-xFormat`), the timezone for interpretation of
  timestamps (see :ref:`param-tz`), and the threshold for point consolidation (the closest number of pixels between points
  before they are consolidated, see :ref:`param-minXStep`).

*Y-Axis*
  Determines how the Y-axis or axes are rendered.  This includes:

  - label (see :ref:`param-vtitle`)
  - minimum/maximum values on the axis (see :ref:`param-yMin` and :ref:`param-yMax`)
  - the number of minor lines to draw (see :ref:`param-minorY`)
  - drawing on a logarithmic scale of the specified base (see :ref:`param-logBase`)
  - step between the Y-axis labels and gridlines (see :ref:`param-yStep`)
  - divisor for the axis (see :ref:`param-yDivisor`)
  - unit system (SI, binary, or none - see :ref:`param-yUnitSystem`)
  - side the axis appears (see :ref:`param-yAxisSide`).

  When you have more than one Y-axis (because you selected *Apply Function | Special | Draw in second Y axis* for at least one
  metric series), use the *Dual Y-Axis Options* item on this menu.  This provides individual control of both the left and right
  Y-axes, with the same settings as listed above.

Other Operations on the Graph
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The *Graph Operations* menu button is used to perform miscellaneous actions on the graph.

*Breakout*
  Creates new graphs for each of the metrics in the graph, adds them to the dashboard, and removes the original.

*Clone*
  Creates a copy of the graph, and adds it to the dashboard.

*Email*
  Allows you to send a copy of the graph to someone via email.

*Direct URL*
  Provides the URL for rendering this graph, suitable for copying and pasting.  Note that changing this URL does not affect
  the chart it came from, i.e. this is not a mechanism for editing the chart.


Other Global Menu Options
-------------------------

Editing, Importing and Exporting via JSON
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
The *Dashboard | Edit Dashboard* menu item shows a JSON (JavaScript Object Notation) representation of the current dashboard
and all its graphs in an editor dialog.

If you're a power user, you can edit the dashboard configuration directly.  When you click the *Update* button, the changes are
applied to the dashboard on screen only.  This function also provides a convenient mechanism for importing and exporting
dashboards, for instance to promote dashboards from development to production systems.

.. note::
  The Update button does not save your changes - you'll need to use *Save* or *Save As* to do this.


Sharing a Dashboard
^^^^^^^^^^^^^^^^^^^
The *Share* menu button shows a URL for the dashboard, allowing others to access it directly.  This first warns you that your
dashboard must be saved, then presents the URL.

.. note::
  If you haven't yet saved your dashboard (ever), it will be given a name like "temporary-0", so you probably want to
  save it first.  It's important to note that temporary dashboards are never shown in the Finder, and so the only
  way to delete them is via the Admin webapp or the database.  You probably don't want that...

Changing Graph Sizes
^^^^^^^^^^^^^^^^^^^^
The *Graphs | Resize* menu item and the Gear menu button allow all graphs on the dashboard to be set to a specified size.  You
can either choose one of the preset sizes, or select *Custom* and enter your own width and height (in pixels).

New Dashboard
^^^^^^^^^^^^^
Selecting the *Dashboard | New* menu item removes the association between the current dashboard on the screen and its saved version
(if any), which means that you'll need to use *Dashboard | Save As* to save it again.  Note that it doesn't clear the contents
of the dashboard, i.e. the graphs - use *Remove All* to achieve this.

Removing All Graphs
^^^^^^^^^^^^^^^^^^^
To remove all graphs on the current dashboard, use the *Graphs | Remove All* menu item or the red cross menu button.  This asks
for confirmation, and also gives you the option to skip confirmation in future.

Deleting a Dashboard
^^^^^^^^^^^^^^^^^^^^
To delete a dashboard, open the Finder (using the *Dashboard | Finder* menu item), select the dashboard to delete in the list,
and click *Delete*.  Note that you may need to be logged in as a user with appropriate permissions to do this, depending on
the configuration of Graphite.

Login/logout
^^^^^^^^^^^^
By default, it's not necessary to be logged in to use or change dashboards.  However, your system may be configured to
require users to be logged in to change or delete dashboards, and may also require appropriate permissions to do so.

Log into Graphite using the *Dashboard | Log in* menu item, which shows a standard login dialog.  Once you're logged in,
the menu item changes to *Log out from "username"* - click this to log out again.  Note that logins are recorded by a
persistent browser cookie, so you don't have to log in again each time you connect to Graphite.

Changing Default Graph Parameters
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
By default, graphs are generated with a standard render template. If you find yourself applying *Render Options* to each and every graph you create, then you can select *Edit Default Parameters* in the *Graphs* menu to automatically handle that. These parameters are saved with the dashboard and persisted in a cookie.
  
The format is as a set of key-value pairs separated by ampersands, like a query string. The keys and values come from :doc:`render_api` and they're all available. For example:
  
``drawNullAsZero=true&graphOnly=true``
  
Any new graphs created after saving that as the default graph parameters would have unreported metrics graphed as zeroes and omit the grid lines.
