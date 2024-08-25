import logging
import sys

try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.urls import reverse

from .base import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())

if sys.version_info[0] >= 3:
    def resp_text(r):
        return r.content.decode('utf-8')
else:
    def resp_text(r):
        return r.content


class RenderXSSTest(TestCase):
    def test_render_xss(self):
        url = reverse('render')
        xssStr = '<noscript><p title="</noscript><img src=x onerror=alert() onmouseover=alert()>">'

        # Check for issue #2779 and others
        response = self.client.get(url, {'target': 'test', 'format': 'raw', 'cacheTimeout': xssStr, 'from': xssStr})
        self.assertXSS(response, status_code=400, msg_prefix='XSS detected: ')


class FindXSSTest(TestCase):
    def test_render_xss(self):
        url = reverse('metrics_find')
        xssStr = '<noscript><p title="</noscript><img src=x onerror=alert() onmouseover=alert()>">'

        response = self.client.get(url, {'query': 'test', 'local': xssStr, 'from': xssStr, 'tz': xssStr})
        self.assertXSS(response, status_code=400, msg_prefix='XSS detected: ')
