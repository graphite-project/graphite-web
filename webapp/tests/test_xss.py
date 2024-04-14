import logging

from django.urls import reverse

from .base import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
    LOGGER.addHandler(logging.NullHandler())

def resp_text(r):
    return r.content.decode('utf-8')


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
