"""Startup hooks for Graphite internal instrumentation."""

import logging

from django.apps import AppConfig
from django.conf import settings
try:
    from prometheus_client.bridge.graphite import GraphiteBridge
except ImportError:
    GraphiteBridge = None


class CustomAppConfig(AppConfig):
    name = 'graphite.prometheus'
    verbose_name = 'Graphite Instrumentation'

    def ready(self):
        if GraphiteBridge and settings.CARBON_ADDRESS and settings.CARBON_INTERVAL:
            # Report metrics to carbon if configured.
            logging.info(
                "Starting Graphite reporter (%s, %s, %s)" %
                (settings.CARBON_ADDRESS, settings.CARBON_INTERVAL,
                 settings.CARBON_PREFIX)
            )
            host, port = settings.CARBON_ADDRESS.split(':')
            gb = GraphiteBridge((host, port))
            gb.start(
                interval=settings.CARBON_INTERVAL,
                prefix=settings.CARBON_PREFIX or ''
            )
