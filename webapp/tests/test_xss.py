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


class LogoutOpenRedirectTest(TestCase):
    def test_logout_external_redirect_blocked(self):
        url = reverse('account_logout')
        response = self.client.get(url, {'nextPage': 'http://evil.example.com'})
        location = response.get('Location', '')
        self.assertNotIn('evil.example.com', location)

    def test_logout_local_redirect_allowed(self):
        url = reverse('account_logout')
        response = self.client.get(url, {'nextPage': '/browser/'})
        location = response.get('Location', '')
        self.assertEqual(location, '/browser/')


class URLShortenerOpenRedirectTest(TestCase):
    def test_shorten_strips_leading_slashes(self):
        shorten_url = reverse('shorten', kwargs={'path': '//evil.example.com'})
        shorten_response = self.client.get(shorten_url)
        self.assertEqual(shorten_response.status_code, 200)
        link_id = shorten_response.content.decode('utf-8').rsplit('/', 1)[-1]
        follow_url = reverse('follow', kwargs={'link_id': link_id})
        follow_response = self.client.get(follow_url)
        location = follow_response.get('Location', '')
        self.assertFalse(
            location.startswith('//') or location.startswith('http://evil') or location.startswith('https://evil'),
            msg='Open redirect detected: %s' % location,
        )
