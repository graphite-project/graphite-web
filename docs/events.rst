Graphite Events
===============
Graphite is well known for storing simple key/value metrics using the Whisper time-series database on-disk format. What is not well known about Graphite is that it also ships with a feature known as **Events** that supports a richer form of metrics storage suitable for irregular events often associated with metadata.

Examples of data appropriate for this storage format include releases, commits, application exceptions, and state changes where you may wish to track or correlate the event with traditional time-series activity.


Database Storage
----------------
As Whisper was designed to hold simple time-series data (metric key, value, and timestamp), it's altogether unsuitable for storing rich metric data such as events. Many users continue to store simple event-type data (e.g. releases, state changes, etc) in Whisper by encoding its meaning within the metric namespace and rendering them as a vertical line with Graphite's `drawAsInfinite <functions.html#graphite.render.functions.drawAsInfinite>`_ function.

However, taking advantage of this pattern typically requires the use of wildcards across a significant number of these singleton metric files and directories, which can cause a significant performance hit on the server and result in a poor experience for users. To accommodate this more sophisticated use case, Graphite's webapp database was extended to support this new metric type.

.. note::

  Events require Graphite webapp version 0.9.9 or newer.


Adding Events
-------------
Events can be submitted via HTTP POST using command-line tools such as ``curl`` or with a variety of HTTP programming libraries. The JSON format is simple and predictable.

.. code-block:: none

    $ curl -X POST "http://graphite/events/" 
        -d '{ "what": "Event - deploy", "tags": ["deploy"], "when": 1467844481,
        "data": "deploy of master branch happened at Wed Jul  6 22:34:41 UTC 2016" }'
 
``when`` is an optional key which is set to the current Unix timestamp if ``when`` is not set.

*Note*: Prior to 0.10.0, the value of ``tags`` is a string, with multiple tags being separated by a space.


Querying Events
---------------
Graphite allows you to query for tags associated with events. You can search for a single tag string, a combination of space-delimited tags, or a simple ``*`` wildcard using the `events <functions.html#graphite.render.functions.events>`_ function.

.. code-block:: none

    $ curl -s "http://graphite/render/?target=events('exception')&format=json" | json_pp

    [
       {
          "target" : "events(exception)",
          "datapoints" : [
             [
                1,
                1388966651
             ],
             [
                3,
                1388966652
             ]
          ]
       }
    ]

It's also possible to dump the raw events using the API.

.. code-block:: none

    $ curl -s "http://graphite/events/get_data?tags=deploy&from=-3hours&until=now" | json_pp

    [
       {
          "when" : 1392046352,
          "tags" : ["deploy"],
          "data" : "deploy of master branch happened at Fri Jan 3 22:34:41 UTC 2014",
          "id" : 2,
          "what" : "Event - deploy"
       },
       {
          "id" : 3,
          "what" : "Event - deploy",
          "when" : 1392046661,
          "tags" : ["deploy"],
          "data" : "deploy of master branch happened at Fri Jan 3 22:34:41 UTC 2014"
       }
    ]

The ``set`` parameter accepts an optional ``union`` or ``intersection`` argument to determine the behavior for filtering sets of tags (i.e. inclusive or exclusive). By default, Graphite uses a "lazy union" that will return any matching events for a given tag in a list of tags. This behavior is not intuitive and will therefore be deprecated in a future release.


Managing Events in the Admin UI
-------------------------------
Events can be managed using the Graphite `administration module <admin-webapp.html>`_. This is particularly handy for deleting a large number of events at once, although it also supports adding and editing individual events.


