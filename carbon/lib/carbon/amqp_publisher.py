#!/usr/bin/env python
"""
Copyright 2009 Lucio Torre <lucio.torre@canonical.com>

Will publish metrics over AMQP
"""
import os
import time
from optparse import OptionParser

from twisted.internet.defer import inlineCallbacks
from twisted.internet import reactor, task
from twisted.internet.protocol import ClientCreator
from txamqp.protocol import AMQClient
from txamqp.client import TwistedDelegate
from txamqp.content import Content
import txamqp.spec


@inlineCallbacks
def writeMetric(metric_path, value, timestamp, host, port, username, password,
                vhost, exchange, spec=None, channel_number=1):

    if not spec:
        spec = txamqp.spec.load(os.path.normpath(
            os.path.join(os.path.dirname(__file__), 'amqp0-8.xml')))

    delegate = TwistedDelegate()

    connector = ClientCreator(reactor, AMQClient, delegate=delegate,
                              vhost=vhost, spec=spec)
    conn = yield connector.connectTCP(host, port)

    yield conn.authenticate(username, password)
    channel = yield conn.channel(channel_number)
    yield channel.channel_open()

    yield channel.exchange_declare(exchange=exchange, type="topic",
                                   durable=True, auto_delete=False)

    message = Content( "%f %d" % (value, timestamp) )
    message["delivery mode"] = 2

    channel.basic_publish(exchange=exchange, content=message, routing_key=metric_path)
    yield channel.channel_close()


def main():
    parser = OptionParser(usage="%prog [options] <metric> <value> [timestamp]")
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

    parser.add_option("-e", "--exchange", dest="exchange",
                      help="exchange", metavar="EXCHANGE",
                      default="graphite")

    (options, args) = parser.parse_args()

    try:
      metric_path = args[0]
      value = float(args[1])

      if len(args) > 2:
        timestamp = int(args[2])
      else:
        timestamp = time.time()

    except:
      parser.print_usage()
      raise SystemExit(1)

    d = writeMetric(metric_path, value, timestamp, options.host, options.port,
                    options.username, options.password, vhost=options.vhost,
                    exchange=options.exchange)
    d.addErrback(lambda f: f.printTraceback())
    d.addBoth(lambda _: reactor.stop())
    reactor.run()

if __name__ == "__main__":
    main()
