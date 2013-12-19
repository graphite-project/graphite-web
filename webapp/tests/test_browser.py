import os
import warnings

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test import TestCase
from django.test.utils import override_settings

from . import DATA_DIR


class BrowserTest(TestCase):
    def test_browser(self):
        url = reverse('graphite.browser.views.browser')
        response = self.client.get(url)
        self.assertContains(response, 'Graphite Browser')

    def test_header(self):
        self.assertEqual(User.objects.count(), 0)
        url = reverse('graphite.browser.views.header')
        response = self.client.get(url)
        self.assertContains(response, 'Graphite Browser Header')

        # Graphite has created a default user
        self.assertEqual(User.objects.get().username, 'default')

    # Django 1.6.1 on python 2.7 throws a few warnings for this test
    # that need to be silenced to calm my inner OCD monster (@SEJeff)
    @override_settings(INDEX_FILE=os.path.join(DATA_DIR, 'index'))
    def test_search(self):
        url = reverse('graphite.browser.views.search')

        with warnings.catch_warnings():
            warnings.simplefilter('ignore', DeprecationWarning)
            response = self.client.post(url)
        self.assertEqual(response.content, '')

        # simple query
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', DeprecationWarning)
            response = self.client.post(url, {'query': 'collectd'})
        self.assertEqual(response.content.split(',')[0],
                         'collectd.test.df-root.df_complex-free')

        # No match
        response = self.client.post(url, {'query': 'other'})
        self.assertEqual(response.content, '')

        # Multiple terms (OR)
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', DeprecationWarning)
            response = self.client.post(url, {'query': 'midterm shortterm'})
        self.assertEqual(response.content.split(','),
                         ['collectd.test.load.load.midterm',
                          'collectd.test.load.load.shortterm'])
