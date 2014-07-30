from django.core.urlresolvers import reverse
from django.test import TestCase


class DashboardTest(TestCase):
    def test_dashboard(self):
        url = reverse('graphite.dashboard.views.dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
