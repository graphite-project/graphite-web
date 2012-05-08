## Overview

Graphite consists of two major components

1. the frontend Django webapp that runs under mod_python Apache
2. the backend carbon-cache.py daemon

Client applications connect to the running carbon-cache.py daemon on port 2003 and send it
lines of text of the following format:

    my.metric.name value unix_timestamp

For example:

    performance.servers.www01.cpuUsage 42.5 1208815315

The metric name is like a filesystem path that uses . as a separator instead of /
The value is some scalar integer or floating point value
The unix_timestamp is unix epoch time, as an integer

Each line like this corresponds to one data point for one metric.

Once you've got some clients sending data to carbon-cache, you can view
graphs of that data in the frontend webapp.


## Webapp Installation

Use the instructions in the INSTALL file.


## Running carbon-cache.py

First you must tell carbon-cache what user it should run as.
This must be a user with write privileges to `$GRAPHITE_ROOT/storage/whisper/`
Specify the user account in `$GRAPHITE_ROOT/carbon/conf/carbon.conf`

This user must also have write privileges to `$GRAPHITE_ROOT/storage/log/carbon-cache/`


## Writing a client

First you obviously need to decide what data it is you want to graph with
graphite. The script `examples/example-client.py` demonstrates a simple client
that sends loadavg data for your local machine to carbon on a minutely basis.

The default storage schema stores data in one-minute intervals for 2 hours.
This is probably not what you want so you should create a custom storage schema
according to the docs on the graphite wiki (http://graphite.wikidot.com)
