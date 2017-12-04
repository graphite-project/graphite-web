import copy
import errno
import mock
import os

from . import TEST_CONF_DIR

from django.conf import settings
try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse
from django.http import HttpResponse
from .base import TestCase
from django.test.utils import override_settings
from graphite.util import json
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
except ImportError:
    from django.contrib.auth.models import User


class DashboardTest(TestCase):
    # Set config to the test config file
    settings.DASHBOARD_CONF = os.path.join(TEST_CONF_DIR, 'dashboard.conf')

    # Define a testtemplate
    testtemplate = {"state": '{"graphs": [[ "target=a.b.c.*.__VALUE__.d", {  "from":"-2days", "target":[  "a.b.c.*.__VALUE__.d" ], "until":"now" }, "/render?width=400&from=-2days&until=now&height=250&target=a.b.c.*.__VALUE__.d&_uniq=0.6526056618895382&title=a.b.c.*.__VALUE__.d" ]]}'}

    @override_settings(DASHBOARD_CONF=os.path.join(TEST_CONF_DIR, 'dashboard.conf.missing'))
    def test_dashboard_missing_conf(self):
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    @override_settings(DASHBOARD_CONF=os.path.join(TEST_CONF_DIR, 'dashboard.conf.missing'))
    def test_dashboard_template_missing_template(self):
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    @mock.patch('graphite.dashboard.views.DashboardConfig.check')
    def test_dashboard_conf_read_failure(self, check):
        check.side_effect = OSError(errno.EPERM, 'Operation not permitted')
        url = reverse('dashboard')
        with self.assertRaises(Exception):
            response = self.client.get(url)

    @mock.patch('graphite.dashboard.views.DashboardConfig.check')
    def test_dashboard_template_conf_read_failure(self, check):
        check.side_effect = OSError(errno.EPERM, 'Operation not permitted')
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        with self.assertRaises(Exception):
            response = self.client.get(url)

    @override_settings(DASHBOARD_CONF=os.path.join(TEST_CONF_DIR, 'dashboard.conf.missing_ui'))
    def test_dashboard_conf_missing_ui(self):
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    @override_settings(DASHBOARD_CONF=os.path.join(TEST_CONF_DIR, 'dashboard.conf.missing_ui'))
    def test_dashboard_template_missing_ui(self):
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    @override_settings(DASHBOARD_CONF=os.path.join(TEST_CONF_DIR, 'dashboard.conf.missing_keyboard-shortcuts'))
    def test_dashboard_conf_missing_keyboard_shortcuts(self):
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    @override_settings(DASHBOARD_CONF=os.path.join(TEST_CONF_DIR, 'dashboard.conf.missing_keyboard-shortcuts'))
    def test_dashboard_template_missing_keyboard_shortcuts(self):
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    @override_settings(DASHBOARD_CONF=os.path.join(TEST_CONF_DIR, 'dashboard.conf.invalid_theme'))
    def test_dashboard_conf_invalid_theme(self):
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    @override_settings(DASHBOARD_CONF=os.path.join(TEST_CONF_DIR, 'dashboard.conf.invalid_theme'))
    def test_dashboard_template_invalid_theme(self):
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard(self):
        url = reverse('dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_no_user(self):
        url = reverse('dashboard')
        request = {"user": '', "state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_pass_valid(self):
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard', args=['testdashboard'])
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
        self.assertEqual(response.content, b'{"dashboards": []}')

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
        self.assertEqual(response.content, b'{"dashboards": [{"name": "testdashboard"}]}')

    def test_dashboard_find_not_existing(self):
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_find')
        request = {"query": "not here"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"dashboards": []}')

    def test_dashboard_load_not_existing(self):
        url = reverse('dashboard_load', args=['bogusdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"error": "Dashboard \'bogusdashboard\' does not exist. "}')

    def test_dashboard_load_existing(self):
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_load', args=['testdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"state": {}}')

    def test_dashboard_delete_nonexisting(self):
        url = reverse('dashboard_delete', args=['bogusdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"error": "Dashboard \'bogusdashboard\' does not exist. "}')

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
        self.assertEqual(response.content, b'{"success": true}')

        # Confirm it was deleted
        url = reverse('dashboard_find')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"dashboards": []}')

    def test_dashboard_create_temporary(self):
        url = reverse('dashboard_create_temporary')
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"name": "temporary-0"}')

        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"name": "temporary-1"}')

        url = reverse('dashboard_find')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"dashboards": []}')

    def test_dashboard_template_pass_invalid(self):
        url = reverse('dashboard_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_template_pass_valid(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_template', args=['testtemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_find_template_empty(self):
        url = reverse('dashboard_find_template')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"templates": []}')

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

    def test_dashboard_find_template(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_find_template')
        request = {"query": "test"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"templates": [{"name": "testtemplate"}]}')

    def test_dashboard_find_template_nonexistent(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_find_template')
        request = {"query": "not here"}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"templates": []}')

    def test_dashboard_load_template_nonexistent(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_load_template', args=['bogustemplate', 'testkey'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"error": "Template \'bogustemplate\' does not exist. "}')

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
        self.assertEqual(response.content, b'{"error": "Template \'bogustemplate\' does not exist. "}')

    def test_dashboard_delete_template_existing(self):
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)

        url = reverse('dashboard_delete_template', args=['testtemplate'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"success": true}')

        url = reverse('dashboard_find_template')
        request = {"query": ""}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"templates": []}')

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
        self.assertEqual(response.content, b'{"success": true}')

    @mock.patch('graphite.dashboard.views.renderView')
    def test_dashboard_email_mock_renderView(self, rv):
        url = reverse('dashboard_email')
        request = {"sender": "noreply@localhost",
                   "recipients": "noreply@localhost",
                   "subject": "Test email",
                   "message": "Here is the test graph",
                   "graph_params": '{"target":["sumSeries(a.b.c.d)"],"title":"Test","width":"500","from":"-55minutes","until":"now","height":"400"}'}
        responseObject = HttpResponse()
        responseObject.content = ''
        rv.return_value = responseObject
        response = self.client.post(url, request)
        self.assertEqual(response.content, b'{"success": true}')

    def test_dashboard_login_invalid_authenticate(self):
        url = reverse('dashboard_login')
        request = {"username": "testuser",
                   "password": "testpassword"}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), json.loads('{"errors": {"reason": "Username and/or password invalid."}, "success": false, "text": {}, "permissions": []}'))

    @mock.patch('graphite.dashboard.views.authenticate')
    def test_dashboard_login_valid_authenticate(self, authenticate):
        url = reverse('dashboard_login')
        request = {"username": "testuser",
                   "password": "testpassword"}
        user = User.objects.create(email='testuser@test.com')
        user.backend = ''
        authenticate.return_value = user
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), json.loads('{"permissions": ["change", "delete"], "success": true, "text": {}, "errors": {}}'))

    @mock.patch('graphite.dashboard.views.authenticate')
    def test_dashboard_login_valid_authenticate_not_active(self, authenticate):
        url = reverse('dashboard_login')
        request = {"username": "testuser",
                   "password": "testpassword"}
        user = User.objects.create(email='testuser@test.com')
        user.backend = ''
        user.is_active = False
        authenticate.return_value = user
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), json.loads('{"permissions": [], "success": false, "errors": {"reason": "Account disabled."}, "text": {}}'))

    def test_dashboard_logout(self):
        url = reverse('dashboard_logout')
        request = {"username": "testuser"}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), json.loads('{"errors": {}, "success": true, "text": {}}'))

    @mock.patch('graphite.dashboard.views.getPermissions')
    def test_dashboard_save_no_permissions(self, gp):
        gp.return_value = [None]
        url = reverse('dashboard_save', args=['testdashboard'])
        request = {"state": '{}'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"error": "Must be logged in with appropriate permissions to save"}')

    @mock.patch('graphite.dashboard.views.getPermissions')
    def test_dashboard_delete_no_permissions(self, gp):
        gp.return_value = [None]
        url = reverse('dashboard_delete', args=['testdashboard'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"error": "Must be logged in with appropriate permissions to delete"}')

    @mock.patch('graphite.dashboard.views.getPermissions')
    def test_dashboard_save_template_no_permissions(self, gp):
        gp.return_value = [None]
        url = reverse('dashboard_save_template', args=['testtemplate', 'testkey'])
        request = copy.deepcopy(self.testtemplate)
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"error": "Must be logged in with appropriate permissions to save the template"}')

    @mock.patch('graphite.dashboard.views.getPermissions')
    def test_dashboard_delete_template_no_permissions(self, gp):
        gp.return_value = [None]
        url = reverse('dashboard_delete_template', args=['testtemplate'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b'{"error": "Must be logged in with appropriate permissions to delete the template"}')

    def test_getPermissions_no_user(self):
        settings.DASHBOARD_REQUIRE_AUTHENTICATION=False
        settings.DASHBOARD_REQUIRE_PERMISSIONS=False
        settings.DASHBOARD_REQUIRE_EDIT_GROUP=False
        from graphite.dashboard.views import getPermissions
        self.assertEqual(getPermissions(False), ['change', 'delete'])

    def test_getPermissions_no_user_require_auth(self):
        settings.DASHBOARD_REQUIRE_AUTHENTICATION=True
        settings.DASHBOARD_REQUIRE_PERMISSIONS=False
        settings.DASHBOARD_REQUIRE_EDIT_GROUP=False
        from graphite.dashboard.views import getPermissions
        self.assertEqual(getPermissions(False), [])

    def test_getPermissions_valid_user(self):
        settings.DASHBOARD_REQUIRE_AUTHENTICATION=True
        settings.DASHBOARD_REQUIRE_PERMISSIONS=False
        settings.DASHBOARD_REQUIRE_EDIT_GROUP=False
        from graphite.dashboard.views import getPermissions
        user = User.objects.create(email='testuser@test.com')
        user.backend = ''
        self.assertEqual(getPermissions(user), ['change', 'delete'])

    def test_getPermissions_valid_user_require_perm(self):
        settings.DASHBOARD_REQUIRE_AUTHENTICATION=True
        settings.DASHBOARD_REQUIRE_PERMISSIONS=True
        settings.DASHBOARD_REQUIRE_EDIT_GROUP=False
        from graphite.dashboard.views import getPermissions
        user = User.objects.create(email='testuser@test.com')
        user.backend = ''
        self.assertEqual(getPermissions(user), [])

    def test_getPermissions_valid_user_edit_group(self):
        settings.DASHBOARD_REQUIRE_AUTHENTICATION=True
        settings.DASHBOARD_REQUIRE_PERMISSIONS=False
        settings.DASHBOARD_REQUIRE_EDIT_GROUP=True
        from graphite.dashboard.views import getPermissions
        user = User.objects.create(email='testuser@test.com')
        user.backend = ''
        self.assertEqual(getPermissions(user), [])

    def test_getPermissions_valid_user_require_perms_edit_group(self):
        settings.DASHBOARD_REQUIRE_AUTHENTICATION=True
        settings.DASHBOARD_REQUIRE_PERMISSIONS=True
        settings.DASHBOARD_REQUIRE_EDIT_GROUP=True
        from graphite.dashboard.views import getPermissions
        user = User.objects.create(email='testuser@test.com')
        user.backend = ''
        self.assertEqual(getPermissions(user), [])
