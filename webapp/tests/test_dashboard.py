import json

from django.core.urlresolvers import reverse
from django.test import TestCase

class DashboardTest(TestCase):
    def test_dashboard(self):
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Append dashboard name to URL and load it
        url = reverse('dashboard', args=['bogusdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Find dashboards
        url = reverse('dashboard_find')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": []}')

        # Save a dashboard
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Save again after it now exists
        url = reverse('dashboard_save', args=['testdashboard'])
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Find dashboards
        url = reverse('dashboard_find')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": [{"name": "testdashboard"}]}')

        # Load nonexistent dashboard
        url = reverse('dashboard_load', args=['bogusdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"error": "Dashboard \'bogusdashboard\' does not exist. "}')

        # Load the dashboard
        url = reverse('dashboard_load', args=['testdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"state": {}}')

        # Delete nonexistent dashboard
        url = reverse('dashboard_delete', args=['bogusdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"error": "Dashboard \'bogusdashboard\' does not exist. "}')

        # Delete the testdashboard
        url = reverse('dashboard_delete', args=['testdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"success": true}')

        url = reverse('dashboard_find')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": []}')
 
        # Find templates
        url = reverse('dashboard_find_template')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": []}')

        # Find dashboard_template
        url = reverse('dashboard_find_template')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": []}')

        # Save a template
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = {"state": '{"graphs": {}}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Save again after it now exists
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Find templates
        url = reverse('dashboard_find_template')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": [{"name": "testtemplate"}]}')

        # Load nonexistent template
        url = reverse('dashboard_load_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"error": "Template \'bogustemplate\' does not exist. "}')

        # Load the template
        url = reverse('dashboard_load_template', args=['testtemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data, json.loads('{"state": {"name": "testtemplate/testkey", "graphs": {}}}'))

        # Delete nonexistent template
        url = reverse('dashboard_delete_template', args=['bogustemplate'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"error": "Template \'bogustemplate\' does not exist. "}')

        # Delete the testtemplate
        url = reverse('dashboard_delete_template', args=['testtemplate'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"success": true}')

        url = reverse('dashboard_find_template')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": []}')
