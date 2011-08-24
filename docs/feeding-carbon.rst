Feeding In Your Data
====================
Getting data into graphite is very flexible. There are three main methods for sending data to Graphite: The Plaintext protocol, the Pickle protocol, and AMQP.

It's worth noting that data sent to Graphite is actually sent to `Carbon and Carbon-Relay </carbon-daemons>`, which then manage the data. The Graphite web interface reads this data back out, either from cache or straight off disk.

Choosing the right transfer method for you is dependent on how you want to build your application or script to send data.

If you are building a singular script, or you would like to just test sending data, the plaintext protocol is the most straightforward method.

Eventually, however, the plaintext protocol becomes inefficient for sending large amounts of data, and it's possible for performance to suffer. In this case, you'll want to batch this data up and send it to Carbon's pickle receiver.

Finally, Carbon can listen to a message bus, via AMQP.


The plaintext protocol
----------------------
The plaintext protocol is the simplest method to send data to Carbon. The data sent must be in the following format: ``<metric path> <metric value> <metric timestamp>``. Carbon will then help translate this line of text into a metric that the web interface and Whisper understand.

On Unix, the ``nc`` program can be used to create a socket and send data to Carbon.

.. code-block:: none

 echo "local.test.diceroll 4 `date +%s`" | nc $SERVER $PORT; # http://www.xkcd.com/221/


The pickle protocol
-------------------
...


Using AMQP
----------
...
