import logging

from django.test import override_settings
from mock import patch

from graphite.finders.remote import RemoteFinder

from .base import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())


# Set test cluster servers
@override_settings(CLUSTER_SERVERS=['127.0.0.1', '8.8.8.8'])
class RemoteFinderTest(TestCase):

    def test_remote_stores(self):
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

    @override_settings(REMOTE_RETRY_DELAY=10)
    def test_fail(self):
        finder = RemoteFinder('127.0.0.1')

        self.assertEqual(finder.last_failure, 0)
        self.assertFalse(finder.disabled)

        with patch('graphite.finders.remote.time.time', lambda: 100):
          finder.fail()
          self.assertEqual(finder.last_failure, 100)
          self.assertTrue(finder.disabled)

        with patch('graphite.finders.remote.time.time', lambda: 109):
          self.assertTrue(finder.disabled)

        with patch('graphite.finders.remote.time.time', lambda: 110):
          self.assertFalse(finder.disabled)
