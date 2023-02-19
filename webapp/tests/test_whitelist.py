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

from graphite.metric_filters.views import load_allowed_metrics, save_allowed_metrics


class WhitelistTester(TestCase):
    settings.METRIC_FILTERS_FILE = os.path.join(DATA_DIR, 'lists/allowlist')

    def wipe_allowlist(self):
        try:
            os.remove(settings.METRIC_FILTERS_FILE)
        except OSError:
            pass

    def create_allowlist(self):
        try:
            os.makedirs(settings.METRIC_FILTERS_FILE.replace('allowlist', ''))
        except OSError:
            pass
        fh = open(settings.METRIC_FILTERS_FILE, 'wb')
        pickle.dump({'a.b.c.d', 'e.f.g.h'}, fh)
        fh.close()

    def test_allowed_metrics_show_no_allowlist(self):
        url = reverse('metric_filters_show')
        with self.assertRaises(IOError):
            _ = self.client.get(url)

    def test_allowed_metrics_show(self):
        url = reverse('metric_filters_show')
        self.create_allowlist()
        self.addCleanup(self.wipe_allowlist)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"a.b.c.d\ne.f.g.h")

    def test_allowed_metrics_add(self):
        self.create_allowlist()
        self.addCleanup(self.wipe_allowlist)

        url = reverse('metric_filters_add')
        response = self.client.post(url, {'metrics': ['i.j.k.l']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

        url = reverse('metric_filters_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"a.b.c.d\ne.f.g.h\ni.j.k.l")

    def test_allowed_metrics_add_existing(self):
        self.create_allowlist()
        self.addCleanup(self.wipe_allowlist)

        url = reverse('metric_filters_add')
        response = self.client.post(url, {'metrics': ['a.b.c.d']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

        url = reverse('metric_filters_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"a.b.c.d\ne.f.g.h")

    def test_allowed_metrics_remove(self):
        self.create_allowlist()
        self.addCleanup(self.wipe_allowlist)

        url = reverse('metric_filters_remove')
        response = self.client.post(url, {'metrics': ['a.b.c.d']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

        url = reverse('metric_filters_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"e.f.g.h")

    def test_allowed_metrics_remove_missing(self):
        self.create_allowlist()
        self.addCleanup(self.wipe_allowlist)

        url = reverse('metric_filters_remove')
        response = self.client.post(url, {'metrics': ['i.j.k.l']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"OK")

        url = reverse('metric_filters_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"a.b.c.d\ne.f.g.h")

    def test_save_allowed_metrics(self):
        try:
            os.makedirs(settings.METRIC_FILTERS_FILE.replace('allowlist', ''))
        except OSError:
            pass
        self.addCleanup(self.wipe_allowlist)
        self.assertEqual(save_allowed_metrics({'a.b.c.d','e.f.g.h'}), None)
        self.assertEqual(load_allowed_metrics(), {'a.b.c.d','e.f.g.h'})

    @mock.patch('os.rename')
    def test_save_allowed_metrics_rename_failure(self, rename):
        self.addCleanup(self.wipe_allowlist)
        rename.side_effect = OSError(errno.EPERM, 'Operation not permitted')
        with self.assertRaises(OSError):
            save_allowed_metrics({'a.b.c.d','e.f.g.h'})
