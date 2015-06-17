# -*- coding: utf-8 -*-
import json
import os

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test import TestCase
from django.test.utils import override_settings

from . import DATA_DIR


class BrowserTest(TestCase):
    def test_browser(self):
        url = reverse('browser')
        response = self.client.get(url)
        self.assertContains(response, 'Graphite Browser')

    def test_header(self):
        self.assertEqual(User.objects.count(), 0)
        url = reverse('browser_header')
        response = self.client.get(url)
        self.assertContains(response, 'Graphite Browser Header')

        # Graphite has created a default user
        self.assertEqual(User.objects.get().username, 'default')

    def test_url_prefix(self):
        self.assertEqual(reverse('browser'), '/graphite/')

    @override_settings(INDEX_FILE=os.path.join(DATA_DIR, 'index'))
    def test_search(self):
        url = reverse('browser_search')

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

    def test_unicode_graph_name(self):
        url = reverse('browser_my_graph')
        user = User.objects.create_user('test', 'test@example.com', 'pass')
        self.client.login(username='test', password='pass')

        response = self.client.get(url, {'path': ''})
        self.assertEqual(response.status_code, 200)
        user.profile.mygraph_set.create(name=u'fòo', url='bar')
        response = self.client.get(url, {'path': ''})
        self.assertEqual(response.status_code, 200)
        [leaf] = json.loads(response.content)
        self.assertEqual(leaf['text'], u'fòo')
