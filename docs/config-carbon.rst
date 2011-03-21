Configuring Carbon
==================

Carbon's config files all live in ``/opt/graphite/conf/``. If you've just installed Graphite, none of the ``.conf`` files will
exist yet, but there will be a ``.conf.example`` file for each one. Simply copy the example files and customize your settings.


carbon.conf
-----------
This is the main config file defines the settings for each Carbon daemon. If this is your first time using Graphite, don't worry about
anything but the ``[cache]`` section for now. If you're curious you can read about :doc:`The Carbon Daemons </carbon-daemons>`.


storage-schemas.conf
--------------------
...


relay-rules.conf
----------------
...


aggregation-rules.conf
----------------------
...
