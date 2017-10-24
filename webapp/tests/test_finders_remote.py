import logging

from graphite.finders.remote import RemoteFinder

from .base import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())


class RemoteFinderTest(TestCase):

    def test_remote_stores(self):
        # Set test cluster servers
        with self.settings(CLUSTER_SERVERS=['127.0.0.1', '8.8.8.8']):

            # Test REMOTE_EXCLUDE_LOCAL = False
            with self.settings(REMOTE_EXCLUDE_LOCAL=False):
                test_finders = RemoteFinder.factory()
                remote_hosts = [finder.host for finder in test_finders]
                self.assertTrue('127.0.0.1' in remote_hosts)
                self.assertTrue('8.8.8.8' in remote_hosts)

            # Test REMOTE_EXCLUDE_LOCAL = True
            with self.settings(REMOTE_EXCLUDE_LOCAL=True):
                test_finders = RemoteFinder.factory()
                remote_hosts = [finder.host for finder in test_finders]
                self.assertTrue('127.0.0.1' not in remote_hosts)
                self.assertTrue('8.8.8.8' in remote_hosts)
