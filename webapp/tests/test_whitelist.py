import errno
import mock
import os
import pickle

from . import DATA_DIR

from django.conf import settings
from django.core.urlresolvers import reverse
from django.test import TestCase

from graphite.metric_filters.views import load_allowed_metrics, save_allowed_metrics

class AllowedMetricsTester(TestCase):
    settings.METRIC_FILTERS_FILE = os.path.join(DATA_DIR, 'lists/allowed_metrics')

    def wipe_metric_filters(self):
        try:
            os.remove(settings.METRIC_FILTERS_FILE)
        except OSError:
            pass

    def create_metric_filters(self):
        try:
            os.makedirs(settings.METRIC_FILTERS_FILE.replace('allowed_metrics', ''))
        except OSError:
            pass
        fh = open(settings.METRIC_FILTERS_FILE, 'wb')
        pickle.dump({'a.b.c.d', 'e.f.g.h'}, fh)
        fh.close()

    def test_metric_filters_show_no_metric_filters(self):
        url = reverse('metric_filters_show')
        with self.assertRaises(IOError):
          response = self.client.get(url)

    def test_metric_filters_show(self):
        url = reverse('metric_filters_show')
        self.create_metric_filters()
        self.addCleanup(self.wipe_metric_filters)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "a.b.c.d\ne.f.g.h")

    def test_metric_filters_add(self):
        self.create_metric_filters()
        self.addCleanup(self.wipe_metric_filters)

        url = reverse('metric_filters_add')
        response = self.client.post(url, {'metrics': ['i.j.k.l']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "OK")

        url = reverse('metric_filters_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "a.b.c.d\ne.f.g.h\ni.j.k.l")

    def test_metric_filters_add_existing(self):
        self.create_metric_filters()
        self.addCleanup(self.wipe_metric_filters)

        url = reverse('metric_filters_add')
        response = self.client.post(url, {'metrics': ['a.b.c.d']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "OK")

        url = reverse('metric_filters_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "a.b.c.d\ne.f.g.h")

    def test_metric_filters_remove(self):
        self.create_metric_filters()
        self.addCleanup(self.wipe_metric_filters)

        url = reverse('metric_filters_remove')
        response = self.client.post(url, {'metrics': ['a.b.c.d']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "OK")

        url = reverse('metric_filters_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "e.f.g.h")

    def test_metric_filters_remove_missing(self):
        self.create_metric_filters()
        self.addCleanup(self.wipe_metric_filters)

        url = reverse('metric_filters_remove')
        response = self.client.post(url, {'metrics': ['i.j.k.l']})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "OK")

        url = reverse('metric_filters_show')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "a.b.c.d\ne.f.g.h")

    def test_save_metric_filters(self):
        try:
            os.makedirs(settings.METRIC_FILTERS_FILE.replace('allowed_metrics', ''))
        except OSError:
            pass
        self.addCleanup(self.wipe_metric_filters)
        self.assertEqual(save_allowed_metrics({'a.b.c.d','e.f.g.h'}), None)
        self.assertEqual(load_allowed_metrics(), {'a.b.c.d','e.f.g.h'})

    @mock.patch('os.rename')
    def test_save_metric_filters_rename_failure(self, rename):
        self.addCleanup(self.wipe_metric_filters)
        rename.side_effect = OSError(errno.EPERM, 'Operation not permitted')
        with self.assertRaises(OSError):
            save_allowed_metrics({'a.b.c.d','e.f.g.h'})
