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
from twisted.internet.protocol import ServerFactory
from twisted.python.components import Componentized
from twisted.python.log import ILogObserver
# Attaching modules to the global state module simplifies import order hassles
from carbon import util, state, events, instrumentation
from carbon.log import carbonLogObserver
state.events = events
state.instrumentation = instrumentation


class CarbonRootService(MultiService):
  """Root Service that properly configures twistd logging"""

  def setServiceParent(self, parent):
    MultiService.setServiceParent(self, parent)
    if isinstance(parent, Componentized):
      parent.setComponent(ILogObserver, carbonLogObserver)



def createBaseService(config):
    from carbon.conf import settings
    from carbon.protocols import (MetricLineReceiver, MetricPickleReceiver,
                                  MetricDatagramReceiver)

    root_service = CarbonRootService()
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
        if port:
            factory = ServerFactory()
            factory.protocol = protocol
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

    # Instantiate an instrumentation service that will record metrics about
    # this service.
    from carbon.instrumentation import InstrumentationService

    service = InstrumentationService()
    service.setServiceParent(root_service)

    return root_service


def createCacheService(config):
    from carbon.cache import MetricCache
    from carbon.conf import settings
    from carbon.protocols import CacheManagementHandler

    # Configure application components
    events.metricReceived.addHandler(MetricCache.store)

    root_service = createBaseService(config)
    factory = ServerFactory()
    factory.protocol = CacheManagementHandler
    service = TCPServer(int(settings.CACHE_QUERY_PORT), factory,
                        interface=settings.CACHE_QUERY_INTERFACE)
    service.setServiceParent(root_service)

    # have to import this *after* settings are defined
    from carbon.writer import WriterService

    service = WriterService()
    service.setServiceParent(root_service)

    if settings.USE_FLOW_CONTROL:
      events.cacheFull.addHandler(events.pauseReceivingMetrics)
      events.cacheSpaceAvailable.addHandler(events.resumeReceivingMetrics)

    return root_service


def createAggregatorService(config):
    from carbon.aggregator import receiver
    from carbon.aggregator.rules import RuleManager
    from carbon.routers import ConsistentHashingRouter
    from carbon.client import CarbonClientManager
    from carbon.rewrite import RewriteRuleManager
    from carbon.conf import settings
    from carbon import events

    root_service = createBaseService(config)

    # Configure application components
    router = ConsistentHashingRouter()
    client_manager = CarbonClientManager(router)
    client_manager.setServiceParent(root_service)

    events.metricReceived.addHandler(receiver.process)
    events.metricGenerated.addHandler(client_manager.sendDatapoint)

    RuleManager.read_from(settings["aggregation-rules"])
    if exists(settings["rewrite-rules"]):
        RewriteRuleManager.read_from(settings["rewrite-rules"])

    if not settings.DESTINATIONS:
      raise Exception("Required setting DESTINATIONS is missing from carbon.conf")

    for destination in util.parseDestinations(settings.DESTINATIONS):
      client_manager.startClient(destination)

    return root_service


def createRelayService(config):
    from carbon.routers import RelayRulesRouter, ConsistentHashingRouter
    from carbon.client import CarbonClientManager
    from carbon.conf import settings
    from carbon import events

    root_service = createBaseService(config)

    # Configure application components
    if settings.RELAY_METHOD == 'rules':
      router = RelayRulesRouter(settings["relay-rules"])
    elif settings.RELAY_METHOD == 'consistent-hashing':
      router = ConsistentHashingRouter(settings.REPLICATION_FACTOR)

    client_manager = CarbonClientManager(router)
    client_manager.setServiceParent(root_service)

    events.metricReceived.addHandler(client_manager.sendDatapoint)
    events.metricGenerated.addHandler(client_manager.sendDatapoint)

    if not settings.DESTINATIONS:
      raise Exception("Required setting DESTINATIONS is missing from carbon.conf")

    for destination in util.parseDestinations(settings.DESTINATIONS):
      client_manager.startClient(destination)

    return root_service
