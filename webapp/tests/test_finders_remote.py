import logging

from graphite.finders.remote import RemoteFinder

from django.conf import settings
from .base import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())


class RemoteFinderTest(TestCase):

    def test_remote_stores(self):
        # Save settings
        old_cluster_servers = settings.CLUSTER_SERVERS
        old_remote_exclude_local = settings.REMOTE_EXCLUDE_LOCAL

        # Set test cluster servers
        settings.CLUSTER_SERVERS = ['127.0.0.1', '8.8.8.8']

        # Test REMOTE_EXCLUDE_LOCAL = False
        settings.REMOTE_EXCLUDE_LOCAL = False
        test_finder = RemoteFinder()
        remote_hosts = [remote_store.host for remote_store in test_finder.remote_stores]
        self.assertTrue('127.0.0.1' in remote_hosts)
        self.assertTrue('8.8.8.8' in remote_hosts)

        # Test REMOTE_EXCLUDE_LOCAL = True
        settings.REMOTE_EXCLUDE_LOCAL = True
        test_finder = RemoteFinder()
        remote_hosts = [remote_store.host for remote_store in test_finder.remote_stores]
        self.assertTrue('127.0.0.1' not in remote_hosts)
        self.assertTrue('8.8.8.8' in remote_hosts)

        # Restore original settings
        settings.CLUSTER_SERVERS = old_cluster_servers
        settings.REMOTE_EXCLUDE_LOCAL = old_remote_exclude_local
