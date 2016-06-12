import copy
import json

from django.conf import settings

from django.core.urlresolvers import reverse
from django.test import TestCase

class DashboardTest(TestCase):
    def test_dashboard(self):

        # Test when settings.DASHBOARD_CONF has a missing file
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Set config to the example file
        settings.DASHBOARD_CONF = settings.DASHBOARD_CONF + '.example'

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
        request = {"query": "test"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": [{"name": "testdashboard"}]}')

        # Find dashboards
        url = reverse('dashboard_find')
        request = {"query": "not here"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": []}')

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

        # Append dashboard name to URL and load it
        url = reverse('dashboard', args=['testdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

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

        # Test create-temporary
        url = reverse('dashboard_create_temporary')
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"name": "temporary-0"}')

        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"name": "temporary-1"}')

        url = reverse('dashboard_find')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": []}')

        # Append template name to URL and load it
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

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

        # Save a templatea
        testtemplate = {"state": '{"graphs": [[ "target=a.b.c.*.__VALUE__.d", {  "from":"-2days", "target":[  "a.b.c.*.__VALUE__.d" ], "until":"now" }, "/render?width=400&from=-2days&until=now&height=250&target=a.b.c.*.__VALUE__.d&_uniq=0.6526056618895382&title=a.b.c.*.__VALUE__.d" ]]}'}

        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Save again after it now exists
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Append dashboard name to URL and load it
        url = reverse('dashboard_template', args=['testtemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        # Find templates
        url = reverse('dashboard_find_template')
        request = {"query": "test"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": [{"name": "testtemplate"}]}')

        # Find templates
        url = reverse('dashboard_find_template')
        request = {"query": "not here"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": []}')

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
        graph_data = json.loads(testtemplate["state"].replace('__VALUE__', 'testkey'))
        self.assertEqual(data, json.loads('{"state": {"name": "testtemplate/testkey", "graphs": ' + json.dumps(graph_data['graphs']) + '}}'))

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

        # Test that help returns content
        url = reverse('dashboard_help')
        request = {}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)

        # Test sending an email
        url = reverse('dashboard_email')
        request = {"sender": "noreply@localhost",
                   "recipients": "noreply@localhost",
                   "subject": "Test email",
                   "message": "Here is the test graph",
                   "graph_params": '{"target":["sumSeries(a.b.c.d)"],"title":"Test","width":"500","from":"-55minutes","until":"now","height":"400"}'}
        response = self.client.post(url, request)
        self.assertEqual(response.content, '{"success": true}')

        # Test that login and logout works
        url = reverse('dashboard_login')
        request = {"username": "testuser",
                   "password": "testpassword"}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_logout')
        request = {"username": "testuser"}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
