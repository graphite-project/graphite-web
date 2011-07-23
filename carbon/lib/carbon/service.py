#!/usr/bin/env python
"""Copyright 2009 Chris Davis

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

from os.path import exists

from twisted.application.service import MultiService
from twisted.application.internet import TCPServer, TCPClient, UDPServer
from carbon.protocols import protocolManager


def createBaseService(config):
    from carbon.conf import settings
    from carbon.protocols import MetricLineReceiver, MetricPickleReceiver, MetricDatagramReceiver

    root_service = MultiService()
    root_service.setName(settings.program)

    use_amqp = settings.get("ENABLE_AMQP", False)
    if use_amqp:
        from carbon import amqp_listener

        amqp_host = settings.get("AMQP_HOST", "localhost")
        amqp_port = settings.get("AMQP_PORT", 5672)
        amqp_user = settings.get("AMQP_USER", "guest")
        amqp_password = settings.get("AMQP_PASSWORD", "guest")
        amqp_verbose  = settings.get("AMQP_VERBOSE", False)
        amqp_vhost    = settings.get("AMQP_VHOST", "/")
        amqp_spec     = settings.get("AMQP_SPEC", None)
        amqp_exchange_name = settings.get("AMQP_EXCHANGE", "graphite")


    for interface, port, protocol in ((settings.LINE_RECEIVER_INTERFACE,
                                       settings.LINE_RECEIVER_PORT,
                                       MetricLineReceiver),
                                      (settings.PICKLE_RECEIVER_INTERFACE,
                                       settings.PICKLE_RECEIVER_PORT,
                                       MetricPickleReceiver)):
        factory = protocolManager.createFactory(protocol)
        service = TCPServer(int(port), factory, interface=interface)
        service.setServiceParent(root_service)

    if settings.ENABLE_UDP_LISTENER:
      service = UDPServer(int(settings.UDP_RECEIVER_PORT),
                          MetricDatagramReceiver(),
                          interface=settings.UDP_RECEIVER_INTERFACE)
      service.setServiceParent(root_service)

    if use_amqp:
        factory = amqp_listener.createAMQPListener(
            amqp_user, amqp_password,
            vhost=amqp_vhost, spec=amqp_spec,
            exchange_name=amqp_exchange_name,
            verbose=amqp_verbose)
        service = TCPClient(amqp_host, int(amqp_port), factory)
        service.setServiceParent(root_service)

    if settings.ENABLE_MANHOLE:
        from carbon import manhole

        factory = manhole.createManholeListener()
        service = TCPServer(int(settings.MANHOLE_PORT), factory,
                            interface=settings.MANHOLE_INTERFACE)
        service.setServiceParent(root_service)

    # have to import this *after* settings are defined
    from carbon.writer import WriterService

    service = WriterService()
    service.setServiceParent(root_service)

    # Instantiate an instrumentation service that will record metrics about
    # this service.
    from carbon.instrumentation import InstrumentationService

    service = InstrumentationService()
    service.setServiceParent(root_service)

    return root_service


def createCacheService(config):
    from carbon.cache import MetricCache
    from carbon.conf import settings
    from carbon.events import metricReceived
    from carbon.protocols import CacheQueryHandler

    # Configure application components
    metricReceived.installHandler(MetricCache.store)

    root_service = createBaseService(config)
    factory = ServerFactory()
    factory.protocol = CacheQueryHandler
    service = TCPServer(int(settings.CACHE_QUERY_PORT), factory,
                        interface=settings.CACHE_QUERY_INTERFACE)
    service.setServiceParent(root_service)

    # have to import this *after* settings are defined
    from carbon.writer import WriterService

    service = WriterService()
    service.setServiceParent(root_service)

    return root_service


def createAggregatorService(config):
    from carbon.events import metricReceived
    from carbon.aggregator import receiver
    from carbon.aggregator.rules import RuleManager
    from carbon.aggregator import client
    from carbon.rewrite import RewriteRuleManager
    from carbon.conf import settings

    root_service = createBaseService(config)

    # Configure application components
    metricReceived.installHandler(receiver.process)
    RuleManager.read_from(settings["aggregation-rules"])
    if exists(settings["rewrite-rules"]):
        RewriteRuleManager.read_from(settings["rewrite-rules"])

    client.connect(settings["DESTINATION_HOST"],
                   int(settings["DESTINATION_PORT"]))

    return root_service


def createRelayService(config):
    from carbon.log import msg
    from carbon.conf import settings
    from carbon.events import metricReceived
    from carbon.hashing import setDestinationHosts
    from carbon.relay import createClientConnections, relay
    from carbon.rules import loadRules, allDestinationServers, parseHostList

    root_service = createBaseService(config)

    # Configure application components
    metricReceived.installHandler(relay)

    if settings["RELAY_METHOD"] == "rules":
        loadRules(settings["relay-rules"])
        createClientConnections(allDestinationServers())
    elif settings["RELAY_METHOD"] == "consistent-hashing":
        hosts = parseHostList(settings["CH_HOST_LIST"])
        msg('consistent-hashing hosts = %s' % str(hosts))
        setDestinationHosts(hosts)
        createClientConnections(hosts)

    return root_service
