# -*- coding: utf-8 -*-

from django.contrib.auth.models import User
from django.urls import reverse
from .base import TestCase


class LogoutViewTest(TestCase):
    def test_logout_default_redirect(self):
        """Logout without nextPage redirects to the browser."""
        url = reverse('account_logout')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], reverse('browser'))

    def test_logout_safe_relative_redirect(self):
        """Logout with a safe relative nextPage redirects there."""
        url = reverse('account_logout')
        response = self.client.get(url, {'nextPage': '/graphite/'})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], '/graphite/')

    def test_logout_open_redirect_blocked(self):
        """Logout with an external nextPage falls back to the browser URL."""
        url = reverse('account_logout')
        response = self.client.get(url, {'nextPage': 'http://evil.example.com'})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], reverse('browser'))

    def test_logout_open_redirect_blocked_https(self):
        """Logout with an external HTTPS nextPage falls back to the browser URL."""
        url = reverse('account_logout')
        response = self.client.get(url, {'nextPage': 'https://evil.example.com/path'})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], reverse('browser'))


class LoginViewTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', password='testpass', is_active=True
        )

    def test_login_open_redirect_blocked_get(self):
        """GET login page with external nextPage falls back to the browser URL."""
        url = reverse('account_login')
        response = self.client.get(url, {'nextPage': 'http://evil.example.com'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, reverse('browser'))

    def test_login_open_redirect_blocked_post(self):
        """POST login with external nextPage falls back to the browser URL."""
        url = reverse('account_login')
        response = self.client.post(url, {
            'username': 'testuser',
            'password': 'testpass',
            'nextPage': 'http://evil.example.com',
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], reverse('browser'))

    def test_login_safe_relative_redirect(self):
        """POST login with a safe relative nextPage redirects there."""
        url = reverse('account_login')
        response = self.client.post(url, {
            'username': 'testuser',
            'password': 'testpass',
            'nextPage': '/graphite/',
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], '/graphite/')
