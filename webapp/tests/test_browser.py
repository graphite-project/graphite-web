import os

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
        url = reverse('graphite.browser.views.header')
        response = self.client.get(url)
        self.assertContains(response, 'Graphite Browser Header')

    @override_settings(INDEX_FILE=os.path.join(DATA_DIR, 'index'))
    def test_search(self):
        url = reverse('graphite.browser.views.search')

        response = self.client.post(url)
        self.assertEqual(response.content, '')

        # simple query
        response = self.client.post(url, {'query': 'collectd'})
        self.assertEqual(response.content.split(',')[0],
                         'collectd.test.df-root.df_complex-free')

        # No match
        response = self.client.post(url, {'query': 'other'})
        self.assertEqual(response.content, '')

        # Multiple terms (OR)
        response = self.client.post(url, {'query': 'midterm shortterm'})
        self.assertEqual(response.content.split(','),
                         ['collectd.test.load.load.midterm',
                          'collectd.test.load.load.shortterm'])
