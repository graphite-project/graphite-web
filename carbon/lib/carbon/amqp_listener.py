#!/usr/bin/env python
"""
Copyright 2009 Lucio Torre <lucio.torre@canonical.com>

This is an AMQP client that will connect to the specified broker and read
messages, parse them, and post them as metrics.

The message format is the same as in the TCP line protocol
(METRIC, VALUE, TIMESTAMP) with the added possibility of putting multiple "\n"
separated lines in one message.

Can be started standalone for testing or using carbon-cache.py (see example
config file provided)

"""
import sys
import os
from optparse import OptionParser

from twisted.internet.defer import inlineCallbacks
from twisted.internet import reactor
from twisted.internet.protocol import ClientCreator, Protocol, \
    ReconnectingClientFactory
from txamqp.protocol import AMQClient
from txamqp.client import TwistedDelegate
import txamqp.spec

try:
    import carbon
except:
    # this is being run directly, carbon is not installed
    LIB_DIR = os.path.dirname(os.path.dirname(__file__))
    sys.path.insert(0, LIB_DIR)

import carbon.listeners #satisfy import order requirements
from carbon.instrumentation import increment
from carbon.events import metricReceived
from carbon import log



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
        yield self.authenticate(self.factory.username, self.factory.password)
        chan = yield self.channel(1)
        yield chan.channel_open()

        yield chan.queue_declare(queue=self.factory.queue_name, durable=False,
                                 exclusive=False, auto_delete=True)
        yield chan.exchange_declare(
            exchange=self.factory.exchange_name, type="fanout", durable=False,
            auto_delete=True)

        yield chan.queue_bind(queue=self.factory.queue_name,
                              exchange=self.factory.exchange_name)

        yield chan.basic_consume(queue=self.factory.queue_name, no_ack=True,
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

        for line in message.content.body.split("\n"):
            try:
                metric, value, timestamp = line.strip().split()
                datapoint = ( float(timestamp), float(value) )
            except ValueError:
                log.listener("wrong value in line: %s" % (line,))
                continue

            increment('metricsReceived')
            metricReceived(metric, datapoint)
            if self.factory.verbose:
                log.listener("Metric posted: %s %s %s" %
                             (metric, value, timestamp,))


class AMQPReconnectingFactory(ReconnectingClientFactory):
    """The reconnecting factory.

    Knows how to create the extended client and how to keep trying to
    connect in case of errors."""

    protocol = AMQPGraphiteProtocol

    def __init__(self, username, password, delegate, vhost, spec, channel,
                 exchange_name, queue_name, verbose):
        self.username = username
        self.password = password
        self.delegate = delegate
        self.vhost = vhost
        self.spec = spec
        self.channel = channel
        self.exchange_name = exchange_name
        self.queue_name = queue_name
        self.verbose = verbose

    def buildProtocol(self, addr):
        p = self.protocol(self.delegate, self.vhost, self.spec)
        p.factory = self
        return p

def startReceiver(host, port, username, password, vhost="/", spec=None,
                  channel=1, exchange_name="graphite_exchange",
                  queue_name="graphite_queue", verbose=False):
    """Starts a twisted process that will read messages on the amqp broker
    and post them as metrics."""

    # use provided spec if not specified
    if not spec:
        spec = txamqp.spec.load(os.path.normpath(
            os.path.join(os.path.dirname(__file__), 'amqp0-8.xml')))

    delegate = TwistedDelegate()
    factory = AMQPReconnectingFactory(username, password, delegate, vhost,
                                      spec, channel, exchange_name, queue_name,
                                      verbose=verbose)
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

    parser.add_option("-v", "--verbose", dest="verbose",
                      help="verbose",
                      default=False, action="store_true")

    (options, args) = parser.parse_args()


    log.logToStdout()
    startReceiver(options.host, options.port, options.username,
                  options.password, vhost=options.vhost,
                  verbose=options.verbose)
    reactor.run()

if __name__ == "__main__":
    main()
