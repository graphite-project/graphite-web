import errno
import mock
import os
import pickle

from . import DATA_DIR

from django.conf import settings
try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse
from .base import TestCase

from graphite.whitelist.views import load_whitelist, save_whitelist

class WhitelistTester(TestCase):
    settings.WHITELIST_FILE = os.path.join(DATA_DIR, 'lists/whitelist')

    def wipe_whitelist(self):
        try:
            os.remove(settings.WHITELIST_FILE)
        except OSError:
            pass

    def create_whitelist(self):
        try:
            os.makedirs(settings.WHITELIST_FILE.replace('whitelist', ''))
        except OSError:
            pass
        fh = open(settings.WHITELIST_FILE, 'wb')
        pickle.dump({'a.b.c.d', 'e.f.g.h'}, fh)
        fh.close()

    def test_whitelist_show_no_whitelist(self):
        url = reverse('whitelist_show')
        with self.assertRaises(IOError):
          response = self.client.get(url)

    def test_whitelist_show(self):
        url = reverse('whitelist_show')
        self.create_whitelist()
        self.addCleanup(self.wipe_whitelist)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"a.b.c.d\ne.f.g.h")

    def test_whitelist_add(self):
        self.create_whitelist()
        self.addCleanup(self.wipe_whitelist)

        url = reverse('whitelist_add')
        response = self.client.post(url, {'metrics': ['i.j.k.l']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

        url = reverse('whitelist_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"a.b.c.d\ne.f.g.h\ni.j.k.l")

    def test_whitelist_add_existing(self):
        self.create_whitelist()
        self.addCleanup(self.wipe_whitelist)

        url = reverse('whitelist_add')
        response = self.client.post(url, {'metrics': ['a.b.c.d']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

        url = reverse('whitelist_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"a.b.c.d\ne.f.g.h")

    def test_whitelist_remove(self):
        self.create_whitelist()
        self.addCleanup(self.wipe_whitelist)

        url = reverse('whitelist_remove')
        response = self.client.post(url, {'metrics': ['a.b.c.d']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

        url = reverse('whitelist_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"e.f.g.h")

    def test_whitelist_remove_missing(self):
        self.create_whitelist()
        self.addCleanup(self.wipe_whitelist)

        url = reverse('whitelist_remove')
        response = self.client.post(url, {'metrics': ['i.j.k.l']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

        url = reverse('whitelist_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"a.b.c.d\ne.f.g.h")

    def test_save_whitelist(self):
        try:
            os.makedirs(settings.WHITELIST_FILE.replace('whitelist', ''))
        except OSError:
            pass
        self.addCleanup(self.wipe_whitelist)
        self.assertEqual(save_whitelist({'a.b.c.d','e.f.g.h'}), None)
        self.assertEqual(load_whitelist(), {'a.b.c.d','e.f.g.h'})

    @mock.patch('os.rename')
    def test_save_whitelist_rename_failure(self, rename):
        self.addCleanup(self.wipe_whitelist)
        rename.side_effect = OSError(errno.EPERM, 'Operation not permitted')
        with self.assertRaises(OSError):
            save_whitelist({'a.b.c.d','e.f.g.h'})
