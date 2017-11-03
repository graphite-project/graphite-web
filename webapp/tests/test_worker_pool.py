import mock
import unittest

from graphite.worker_pool import pool


class TestPool(unittest.TestCase):

    @classmethod
    def tearDownClass(cls):
        pool.stop_pools()

    def tearDown(self):
        pool.stop_pools()

    @mock.patch('django.conf.settings.USE_WORKER_POOL', True)
    def test_basic(self):
        p = pool.get_pool()
        pool.pool_apply(p, [])

    @mock.patch('django.conf.settings.USE_WORKER_POOL', True)
    def test_named(self):
        default = pool.get_pool()
        p = pool.get_pool(name='test')

        self.assertNotEqual(default, p)

        q = pool.pool_apply(p, [(lambda v: v, 'a')])

        self.assertEqual(q.get(True, 1), 'a')

    @mock.patch('django.conf.settings.USE_WORKER_POOL', False)
    def test_named_no_worker_pool(self):
        default = pool.get_pool()
        p = pool.get_pool(name='test')

        self.assertIsNone(p)
        self.assertIsNone(default)

        q = pool.pool_apply(p, [(lambda v: v, 'a')])

        self.assertEqual(q.get_nowait(), 'a')


if __name__ == '__main__':
    unittest.main()
