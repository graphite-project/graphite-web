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
        response = self.client.get(url, {'target': 'test', 'format': 'raw', 'cacheTimeout': xssStr, 'from': xssStr, 'until': xssStr})
        self.assertXSS(response, status_code=400, msg_prefix='XSS detected: ')


class FindXSSTest(TestCase):
    def test_render_xss(self):
        url = reverse('metrics_find')
        xssStr = '<noscript><p title="</noscript><img src=x onerror=alert() onmouseover=alert()>">'

        response = self.client.get(url, {'query': 'test', 'local': xssStr, 'from': xssStr, 'until': xssStr, 'tz': xssStr})
        self.assertXSS(response, status_code=400, msg_prefix='XSS detected: ')

    def test_find_xss_script_tag(self):
        """Test that <script> tags in from/until parameters are properly escaped (issue #2870)"""
        url = reverse('metrics_find')
        xssStr = "<script>alert('XSS')</script>"

        for param in ('from', 'until'):
            response = self.client.get(url, {'query': 'test', param: xssStr})
            self.assertXSS(response, status_code=400, msg_prefix='XSS detected in %s: ' % param)
