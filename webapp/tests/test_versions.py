from django.conf import settings
try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse
from .base import TestCase


class VersionTest(TestCase):
    def test_version(self):
        url = reverse('version_index')
        response = self.client.get(url)
        self.assertContains(response, settings.WEBAPP_VERSION)
