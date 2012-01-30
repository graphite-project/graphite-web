#!/usr/bin/env python
"""
Copyright 2009 Lucio Torre <lucio.torre@canonical.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

This is an AMQP client that will connect to the specified broker and read
messages, parse them, and post them as metrics.

Each message's routing key should be a metric name.
The message body should be one or more lines of the form:

<value> <timestamp>\n
<value> <timestamp>\n
...

Where each <value> is a real number and <timestamp> is a UNIX epoch time.


This program can be started standalone for testing or using carbon-cache.py
(see example config file provided)
"""
import sys
import os
import socket
from optparse import OptionParser

from twisted.internet.defer import inlineCallbacks
from twisted.internet import reactor
from twisted.internet.protocol import ReconnectingClientFactory
from txamqp.protocol import AMQClient
from txamqp.client import TwistedDelegate
import txamqp.spec

try:
    import carbon
except:
    # this is being run directly, carbon is not installed
    LIB_DIR = os.path.dirname(os.path.dirname(__file__))
    sys.path.insert(0, LIB_DIR)

import carbon.protocols #satisfy import order requirements
from carbon.conf import settings
from carbon import log, events, instrumentation


HOSTNAME = socket.gethostname().split('.')[0]


class AMQPGraphiteProtocol(AMQClient):
    """This is the protocol instance that will receive and post metrics."""

    consumer_tag = "graphite_consumer"

    @inlineCallbacks
    def connectionMade(self):
        yield AMQClient.connectionMade(self)
        log.listener("New AMQP connection made")
        yield self.setup()
        yield self.receive_loop()

    @inlineCallbacks
    def setup(self):
        exchange = self.factory.exchange_name

        yield self.authenticate(self.factory.username, self.factory.password)
        chan = yield self.channel(1)
        yield chan.channel_open()

        # declare the exchange and queue
        yield chan.exchange_declare(exchange=exchange, type="topic",
                                    durable=True, auto_delete=False)

        # we use a private queue to avoid conflicting with existing bindings
        reply = yield chan.queue_declare(exclusive=True)
        my_queue = reply.queue

        # bind each configured metric pattern
        for bind_pattern in settings.BIND_PATTERNS:
            log.listener("binding exchange '%s' to queue '%s' with pattern %s" \
                         % (exchange, my_queue, bind_pattern))
            yield chan.queue_bind(exchange=exchange, queue=my_queue,
                                  routing_key=bind_pattern)

        yield chan.basic_consume(queue=my_queue, no_ack=True,
                                 consumer_tag=self.consumer_tag)
    @inlineCallbacks
    def receive_loop(self):
        queue = yield self.queue(self.consumer_tag)

        while True:
            msg = yield queue.get()
            self.processMessage(msg)

    def processMessage(self, message):
        """Parse a message and post it as a metric."""

        if self.factory.verbose:
            log.listener("Message received: %s" % (message,))

        metric = message.routing_key

        for line in message.content.body.split("\n"):
            line = line.strip()
            if not line:
                continue
            try:
                if settings.get("AMQP_METRIC_NAME_IN_BODY", False):
                    metric, value, timestamp = line.split()
                else:
                    value, timestamp = line.split()
                datapoint = ( float(timestamp), float(value) )
            except ValueError:
                log.listener("invalid message line: %s" % (line,))
                continue

            events.metricReceived(metric, datapoint)

            if self.factory.verbose:
                log.listener("Metric posted: %s %s %s" %
                             (metric, value, timestamp,))


class AMQPReconnectingFactory(ReconnectingClientFactory):
    """The reconnecting factory.

    Knows how to create the extended client and how to keep trying to
    connect in case of errors."""

    protocol = AMQPGraphiteProtocol

    def __init__(self, username, password, delegate, vhost, spec, channel,
                 exchange_name, verbose):
        self.username = username
        self.password = password
        self.delegate = delegate
        self.vhost = vhost
        self.spec = spec
        self.channel = channel
        self.exchange_name = exchange_name
        self.verbose = verbose

    def buildProtocol(self, addr):
        p = self.protocol(self.delegate, self.vhost, self.spec)
        p.factory = self
        return p


def createAMQPListener(username, password, vhost, exchange_name,
                       spec=None, channel=1, verbose=False):
    """
    Create an C{AMQPReconnectingFactory} configured with the specified options.
    """
    # use provided spec if not specified
    if not spec:
        spec = txamqp.spec.load(os.path.normpath(
            os.path.join(os.path.dirname(__file__), 'amqp0-8.xml')))

    delegate = TwistedDelegate()
    factory = AMQPReconnectingFactory(username, password, delegate, vhost,
                                      spec, channel, exchange_name,
                                      verbose=verbose)
    return factory


def startReceiver(host, port, username, password, vhost, exchange_name,
                  spec=None, channel=1, verbose=False):
    """
    Starts a twisted process that will read messages on the amqp broker and
    post them as metrics.
    """
    factory = createAMQPListener(username, password, vhost, exchange_name,
                                 spec=spec, channel=channel, verbose=verbose)
    reactor.connectTCP(host, port, factory)


def main():
    parser = OptionParser()
    parser.add_option("-t", "--host", dest="host",
                      help="host name", metavar="HOST", default="localhost")

    parser.add_option("-p", "--port", dest="port", type=int,
                      help="port number", metavar="PORT",
                      default=5672)

    parser.add_option("-u", "--user", dest="username",
                      help="username", metavar="USERNAME",
                      default="guest")

    parser.add_option("-w", "--password", dest="password",
                      help="password", metavar="PASSWORD",
                      default="guest")

    parser.add_option("-V", "--vhost", dest="vhost",
                      help="vhost", metavar="VHOST",
                      default="/")

    parser.add_option("-e", "--exchange", dest="exchange",
                      help="exchange", metavar="EXCHANGE",
                      default="graphite")

    parser.add_option("-v", "--verbose", dest="verbose",
                      help="verbose",
                      default=False, action="store_true")

    (options, args) = parser.parse_args()


    startReceiver(options.host, options.port, options.username,
                  options.password, vhost=options.vhost,
                  exchange_name=options.exchange, verbose=options.verbose)
    reactor.run()

if __name__ == "__main__":
    main()
