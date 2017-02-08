from django.test import TestCase
from graphite.worker_pool.pool import stop_pool


class BaseTestCase(TestCase):

  def tearDown(self):
    stop_pool()
