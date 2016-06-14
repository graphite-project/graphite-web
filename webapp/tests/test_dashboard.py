import copy
import json

from django.conf import settings

from django.core.urlresolvers import reverse
from django.test import TestCase

class DashboardTest(TestCase):
    # Set config to the example file
    settings.DASHBOARD_CONF = settings.DASHBOARD_CONF + '.example'

    # Define a testtemplate
    testtemplate = {"state": '{"graphs": [[ "target=a.b.c.*.__VALUE__.d", {  "from":"-2days", "target":[  "a.b.c.*.__VALUE__.d" ], "until":"now" }, "/render?width=400&from=-2days&until=now&height=250&target=a.b.c.*.__VALUE__.d&_uniq=0.6526056618895382&title=a.b.c.*.__VALUE__.d" ]]}'}

    def test_dashboard_missing_conf(self):
        settings.DASHBOARD_CONF = settings.DASHBOARD_CONF + '.bad'
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        settings.DASHBOARD_CONF = settings.DASHBOARD_CONF + '.example'
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_template_missing_template(self):
        settings.DASHBOARD_CONF = settings.DASHBOARD_CONF + '.bad'
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        settings.DASHBOARD_CONF = settings.DASHBOARD_CONF + '.example'
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)


    def test_dashboard(self):
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_pass_invalid_name(self):
        url = reverse('dashboard', args=['bogusdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_find_empty(self):
        url = reverse('dashboard_find')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": []}')

    def test_dashboard_save_empty(self):
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_save_overwrite(self):
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_find_existing(self):
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_find')
        request = {"query": "test"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": [{"name": "testdashboard"}]}')

    def test_dashboard_find_not_existing(self):
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_find')
        request = {"query": "not here"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": []}')

    def test_dashboard_load_not_existing(self):
        url = reverse('dashboard_load', args=['bogusdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"error": "Dashboard \'bogusdashboard\' does not exist. "}')

    def test_dashboard_load_existing(self):
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_load', args=['testdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"state": {}}')

    def test_dashboard_delete_nonexisting(self):
        url = reverse('dashboard_delete', args=['bogusdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"error": "Dashboard \'bogusdashboard\' does not exist. "}')

    def test_dashboard_delete_existing(self):
        # Create a dashboard entry
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Delete it
        url = reverse('dashboard_delete', args=['testdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"success": true}')

        # Confirm it was deleted
        url = reverse('dashboard_find')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"dashboards": []}')

    def test_dashboard_create_temporary(self):
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

    def test_dashboard_template(self):
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_find_template_empty(self):
        url = reverse('dashboard_find_template')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": []}')

    def test_dashboard_save_template(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Save again after it now exists
    def test_dashboard_save_template_overwrite(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_template_load(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        # Append dashboard name to URL and load it
        url = reverse('dashboard_template', args=['testtemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_find_template(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_find_template')
        request = {"query": "test"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": [{"name": "testtemplate"}]}')

    def test_dashboard_find_template_nonexistent(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_find_template')
        request = {"query": "not here"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": []}')

    def test_dashboard_find_template_nonexistent(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_load_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"error": "Template \'bogustemplate\' does not exist. "}')

    def test_dashboard_load_template_existing(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_load_template', args=['testtemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        graph_data = json.loads(self.testtemplate["state"].replace('__VALUE__', 'testkey'))
        self.assertEqual(data, json.loads('{"state": {"name": "testtemplate/testkey", "graphs": ' + json.dumps(graph_data['graphs']) + '}}'))

    def test_dashboard_delete_template_nonexisting(self):
        # Delete nonexistent template
        url = reverse('dashboard_delete_template', args=['bogustemplate'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"error": "Template \'bogustemplate\' does not exist. "}')

    def test_dashboard_delete_template_existing(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_delete_template', args=['testtemplate'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"success": true}')

        url = reverse('dashboard_find_template')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, '{"templates": []}')

    def test_dashboard_help(self):
        url = reverse('dashboard_help')
        request = {}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_email(self):
        url = reverse('dashboard_email')
        request = {"sender": "noreply@localhost",
                   "recipients": "noreply@localhost",
                   "subject": "Test email",
                   "message": "Here is the test graph",
                   "graph_params": '{"target":["sumSeries(a.b.c.d)"],"title":"Test","width":"500","from":"-55minutes","until":"now","height":"400"}'}
        response = self.client.post(url, request)
        self.assertEqual(response.content, '{"success": true}')

    def test_dashboard_login(self):
        url = reverse('dashboard_login')
        request = {"username": "testuser",
                   "password": "testpassword"}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_logout(self):
        url = reverse('dashboard_logout')
        request = {"username": "testuser"}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
