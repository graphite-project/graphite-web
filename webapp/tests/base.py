from django.test import TestCase as OriginalTestCase
from graphite.worker_pool.pool import stop_pool


class TestCase(OriginalTestCase):

  def tearDown(self):
    stop_pool()
