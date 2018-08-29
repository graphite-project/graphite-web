Feeding In Your Data
====================
Getting your data into Graphite is very flexible. There are three main methods for sending data to Graphite: Plaintext, Pickle, and AMQP.

It's worth noting that data sent to Graphite is actually sent to the :doc:`Carbon and Carbon-Relay </carbon-daemons>`, which then manage the data. The Graphite web interface reads this data back out, either from cache or straight off disk.

Choosing the right transfer method for you is dependent on how you want to build your application or script to send data:

* There are some tools and APIs which can help you get your data into Carbon.

* For a singular script, or for test data, the plaintext protocol is the most straightforward method.

* For sending large amounts of data, you'll want to batch this data up and send it to Carbon's pickle receiver.

* Finally, Carbon can listen to a message bus, via AMQP.


Existing tools and APIs
-----------------------
* :doc:`client daemons and tools </tools>`
* :doc:`client APIs </client-apis>`


The plaintext protocol
----------------------
The plaintext protocol is the most straightforward protocol supported by Carbon.

The data sent must be in the following format: ``<metric path> <metric value> <metric timestamp>``. Carbon will then help translate this line of text into a metric that the web interface and Whisper understand.

On Unix, the ``nc`` program (``netcat``) can be used to create a socket and send data to Carbon (by default, 'plaintext' runs on port 2003):

If you use the OpenBSD implementation of ``netcat``, please follow this example:

  .. code-block:: none

   PORT=2003
   SERVER=graphite.your.org
   echo "local.random.diceroll 4 `date +%s`" | nc -q0 ${SERVER} ${PORT}

  The ``-q0`` parameter instructs ``nc`` to close socket once data is sent. Without this option, some ``nc`` versions would keep the connection open.

If you use the GNU implementation of ``netcat``, please follow this example:

  .. code-block:: none

   PORT=2003
   SERVER=graphite.your.org
   echo "local.random.diceroll 4 `date +%s`" | nc -c ${SERVER} ${PORT}

  The ``-c`` parameter instructs ``nc`` to close socket once data is sent. Without this option, ``nc`` will keep the connection open and won't end.

The pickle protocol
-------------------
The pickle protocol is a much more efficient take on the plaintext protocol, and supports sending batches of metrics to Carbon in one go.

The general idea is that the pickled data forms a list of multi-level tuples:

.. code-block:: none

 [(path, (timestamp, value)), ...]

Once you've formed a list of sufficient size (don't go too big!), and pickled it (if your client is running a more recent version of python than your server, you may need to specify the protocol) send the data over a socket to Carbon's pickle receiver (by default, port 2004). You'll need to pack your pickled data into a packet containing a simple header:

.. code-block:: python

 payload = pickle.dumps(listOfMetricTuples, protocol=2)
 header = struct.pack("!L", len(payload))
 message = header + payload

You would then send the ``message`` object through a network socket.


Using AMQP
----------
When AMQP_METRIC_NAME_IN_BODY is set to True in your carbon.conf file, the data should be of the same format as the plaintext protocol, e.g. echo "local.random.diceroll 4 `date +%s`".
When AMQP_METRIC_NAME_IN_BODY is set to False, you should omit 'local.random.diceroll'.


Getting Your Data Into Graphite
===============================


The Basic Idea
--------------

Graphite is useful if you have some numeric values that change over time and you want to graph them. Basically you write a program to collect these numeric values which then sends them to graphite's backend, Carbon.


Step 1 - Plan a Naming Hierarchy
--------------------------------

Every series stored in Graphite has a unique identifier, which is composed of a metric name and optionally a set of tags.

In a traditional hierarchy, website.orbitz.bookings.air or something like that would represent the number of air bookings on orbitz. Before producing your data you need to decide what your naming scheme will be.  In a path such as "foo.bar.baz", each thing surrounded by dots is called a path component. So "foo" is a path component, as well as "bar", etc.

Each path component should have a clear and well-defined purpose.  Volatile path components should be kept as deep into the hierarchy as possible.

Matt _Aimonetti has a reasonably sane `post describing the organization of your namespace`__.

.. _Aimonetti: http://matt.aimonetti.net/posts/2013/06/26/practical-guide-to-graphite-monitoring/

__ Aimonetti_

The disadvantage of a purely hierarchical system is that it is very difficult to make changes to the hierarchy, since anything querying Graphite will also need to be updated.  Additionally, there is no built-in description of the meaning of any particular element in the hierarchy.

To address these issues, Graphite also supports using tags to describe your metrics, which makes it much simpler to design the initial structure and to evolve it over time.  A tagged series is made up of a name and a set of tags, like "disk.used;datacenter=dc1;rack=a1;server=web01".  In that example, the series name is "disk.used" and the tags are "datacenter" = "dc1", "rack" = "a1", and "server" = "web01".  When series are named this way they can be selected using the `seriesByTag <functions.html#graphite.render.functions.seriesByTag>`_ function as described in :doc:`Graphite Tag Support </tags>`.

When using a tagged naming scheme it is much easier to add or alter individual tags as needed.  It is important however to be aware that changing the number of tags reported for a given metric or the value of a tag will create a new database file on disk, so tags should not be used for data that changes over the lifetime of a particular metric.


Step 2 - Configure your Data Retention
--------------------------------------

Graphite is built on fixed-size databases (see :doc:`Whisper. </whisper>`) so we have to configure in advance how much data we intend to store and at what level of precision. For instance you could store your data with 1-minute precision (meaning you will have one data point for each minute) for say 2 hours. Additionally you could store your data with 10-minute precision for 2 weeks, etc. The idea is that the storage cost is determined by the number of data points you want to store, the less fine your precision, the more time you can cover with fewer points.
To determine the best retention configuration, you must answer all of the following questions.

1. How often can you produce your data?
2. What is the finest precision you will require?
3. How far back will you need to look at that level of precision?
4. What is the coarsest precision you can use?
5. How far back would you ever need to see data? (yes it has to be finite, and determined ahead of time)

Once you have picked your naming scheme and answered all of the retention questions, you need to create a schema by creating/editing the ``/opt/graphite/conf/storage-schemas.conf`` file.

The format of the schemas file is easiest to demonstrate with an example. Let's say we've written a script to collect system load data from various servers, the naming scheme will be like so:

``servers.HOSTNAME.METRIC``

Where HOSTNAME will be the server's hostname and METRIC will be something like cpu_load, mem_usage, open_files, etc. Also let's say we want to store this data with minutely precision for 30 days, then at 15 minute precision for 10 years.

For details of implementing your schema, see the :doc:`Configuring Carbon </config-carbon>` document.

Basically, when carbon receives a metric, it determines where on the filesystem the whisper data file should be for that metric. If the data file does not exist, carbon knows it has to create it, but since whisper is a fixed size database, some parameters must be determined at the time of file creation (this is the reason we're making a schema). Carbon looks at the schemas file, and in order of priority (highest to lowest) looks for the first schema whose pattern matches the metric name. If no schema matches the default schema (2 hours of minutely data) is used. Once the appropriate schema is determined, carbon uses the retention configuration for the schema to create the whisper data file appropriately.


Step 3 - Understanding the Graphite Message Format
--------------------------------------------------

Graphite understands messages with this format:

.. code-block:: none

    metric_path value timestamp\n

``metric_path`` is the metric namespace that you want to populate.

``value`` is the value that you want to assign to the metric at this time.

``timestamp`` is the number of seconds since unix epoch time.

A simple example of doing this from the unix terminal would look like this:

.. code-block:: none

    echo "test.bash.stats 42 `date +%s`" | nc graphite.example.com 2003

There are many tools that interact with Graphite.  See the :doc:`Tools </tools>` page for some choices of tools that may be used to feed Graphite.
