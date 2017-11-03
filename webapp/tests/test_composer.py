import copy
import errno
import json
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
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
except ImportError:
    from django.contrib.auth.models import User


class ComposerTest(TestCase):
    def test_send_email(self):
        url = reverse('send_email')
        request = {"sender": "noreply@localhost",
                   "recipients": "noreply@localhost",
                   "subject": "Test email",
                   "message": "Here is the test graph",
                   "graph_params": '{"target":["sumSeries(a.b.c.d)"],"title":"Test","width":"500","from":"-55minutes","until":"now","height":"400"}'}
        response = self.client.post(url, request)
        self.assertEqual(response.content, '{"success": true}')
 
