try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse

from urllib.parse import urlparse

from django.utils.http import url_has_allowed_host_and_scheme

from .base import TestCase


class UrlShortenerTest(TestCase):
    def test_shorten_and_follow(self):
        """Test normal URL shortening and following."""
        shorten_url = reverse('shorten', kwargs={'path': 'render/'})
        response = self.client.get(shorten_url, {'target': 'test'})
        self.assertEqual(response.status_code, 200)
        short_path = response.content.decode('utf-8')

        follow_response = self.client.get(short_path)
        self.assertEqual(follow_response.status_code, 301)
        redirect_url = follow_response['Location']
        # Should redirect to an internal path, not a protocol-relative or absolute URL
        self.assertFalse(redirect_url.startswith('//'))
        parsed = urlparse(redirect_url)
        self.assertFalse(bool(parsed.netloc),
                         'Redirect to external domain detected: %s' % redirect_url)

    def test_follow_open_redirect_prevention(self):
        """Test that protocol-relative URLs stored in links cannot cause open redirects."""
        # Simulate shortening a crafted path that starts with //
        shorten_url = reverse('shorten', kwargs={'path': '//evil.com'})
        response = self.client.get(shorten_url)
        self.assertEqual(response.status_code, 200)
        short_path = response.content.decode('utf-8')

        follow_response = self.client.get(short_path)
        self.assertEqual(follow_response.status_code, 301)
        redirect_url = follow_response['Location']
        # The redirect must not be a protocol-relative URL pointing to an external domain
        self.assertFalse(redirect_url.startswith('//'),
                         'Open redirect detected: %s' % redirect_url)
        # Should not redirect to an external host
        parsed = urlparse(redirect_url)
        self.assertFalse(bool(parsed.netloc),
                         'Open redirect to external domain detected: %s' % redirect_url)

    def test_follow_open_redirect_backslash_prevention(self):
        """Test that backslash-prefixed URLs cannot cause open redirects.

        Some browsers interpret /\\evil.com as //evil.com (a protocol-relative
        URL pointing to evil.com). The follow() view must reject such URLs.
        """
        shorten_url = reverse('shorten', kwargs={'path': '\\evil.com'})
        response = self.client.get(shorten_url)
        self.assertEqual(response.status_code, 200)
        short_path = response.content.decode('utf-8')

        follow_response = self.client.get(short_path)
        self.assertEqual(follow_response.status_code, 301)
        redirect_url = follow_response['Location']
        # The redirect must be a safe internal URL
        self.assertTrue(
            url_has_allowed_host_and_scheme(url=redirect_url, allowed_hosts={'testserver'}),
            'Unsafe redirect detected: %s' % redirect_url,
        )
