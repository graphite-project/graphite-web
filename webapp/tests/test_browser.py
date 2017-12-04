# -*- coding: utf-8 -*-
import os

from django.contrib.auth.models import User
try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse
from .base import TestCase
from django.test.utils import override_settings
from graphite.util import json

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
        self.assertEqual(response.content, b'')

        # simple query
        response = self.client.post(url, {'query': 'collectd'})
        self.assertEqual(response.content.split(b',')[0],
                         b'collectd.test.df-root.df_complex-free')

        # No match
        response = self.client.post(url, {'query': 'other'})
        self.assertEqual(response.content, b'')

        # Multiple terms (OR)
        response = self.client.post(url, {'query': 'midterm shortterm'})
        self.assertEqual(response.content.split(b','),
                         [b'collectd.test.load.load.midterm',
                          b'collectd.test.load.load.shortterm'])

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

    def test_unicode_usergraph(self):
        url = reverse('browser_usergraph')
        user = User.objects.create_user('tèst', 'test@example.com', 'pass')
        self.client.login(username='tèst', password='pass')
        self.client.get(reverse('browser_header'))  # this creates a profile for the user
        user.profile.mygraph_set.create(name=u'fòo', url='bar')
        response = self.client.get(url, {'query': 'tèst.*',
                                         'format': 'treejson',
                                         'path': 'tèst',
                                         'user': 'tèst',
                                         'node': 'tèst'})
        self.assertEqual(response.status_code, 200)
        [leaf] = json.loads(response.content)
        self.assertEqual(leaf, {
            u'leaf': 1,
            u'text': u'fòo',
            u'allowChildren': 0,
            u'graphUrl': u'bar',
            u'id': u'tèst.845aa5781192007e1866648eea9f7355',
            u'expandable': 0,
        })
