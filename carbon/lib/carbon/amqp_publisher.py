#!/usr/bin/env python
"""
Copyright 2009 Lucio Torre <lucio.torre@canonical.com>

Will publish metrics over AMQP
"""

import os
from optparse import OptionParser

from twisted.internet.defer import inlineCallbacks
from twisted.internet import reactor, task
from twisted.internet.protocol import ClientCreator
from txamqp.protocol import AMQClient
from txamqp.client import TwistedDelegate
from txamqp.content import Content
import txamqp.spec

@inlineCallbacks
def gotConnection(conn, message, username, password,
                  channel_number, exchange_name):
    yield conn.authenticate(username, password)
    channel = yield conn.channel(channel_number)
    yield channel.channel_open()

    msg = Content(message)
    msg["delivery mode"] = 2
    channel.basic_publish(exchange=exchange_name, content=msg)
    yield channel.channel_close()

def writeMetric(message, host, port, username, password, vhost,
                spec= None, channel=1, exchange_name="graphite_exchange"):

    if not spec:
        spec = txamqp.spec.load(os.path.normpath(
            os.path.join(os.path.dirname(__file__), 'amqp0-8.xml')))

    delegate = TwistedDelegate()

    d = ClientCreator(reactor, AMQClient, delegate=delegate, vhost=vhost,
        spec=spec).connectTCP(host, port)

    d.addCallback(gotConnection, message, username, password,
                  channel, exchange_name)

    return d


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

    parser.add_option("-v", "--vhost", dest="vhost",
                      help="vhost", metavar="VHOST",
                      default="/")

    (options, args) = parser.parse_args()


    message = " ".join(args)
    d = writeMetric(message, options.host, options.port, options.username,
                  options.password, vhost=options.vhost)
    d.addErrback(lambda f: f.printTraceback())
    d.addBoth(lambda _: reactor.stop())
    reactor.run()

if __name__ == "__main__":
    main()
