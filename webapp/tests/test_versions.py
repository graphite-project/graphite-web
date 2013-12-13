from django.conf import settings
from django.core.urlresolvers import reverse
from django.test import TestCase


class VersionTest(TestCase):
    def test_version(self):
        url = reverse('graphite.version.views.index')
        response = self.client.get(url)
        self.assertContains(response, settings.WEBAPP_VERSION)
