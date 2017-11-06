import mock
import time
import unittest

from graphite.worker_pool import pool


class TestPool(unittest.TestCase):
    def tearDown(self):
        pool.stop_pools()

    @mock.patch('django.conf.settings.USE_WORKER_POOL', True)
    def test_basic(self):
        p = pool.get_pool()
        results = pool.pool_exec(p, [], 1)

        self.assertEqual(list(results), [])

    @mock.patch('django.conf.settings.USE_WORKER_POOL', True)
    def test_exception(self):
        p = pool.get_pool()

        err = Exception('this is a test')

        def testfunc():
          raise err

        results = pool.pool_exec(p, [pool.Job(testfunc)], 1)

        self.assertEqual(list(results)[0].exception, err)

    @mock.patch('django.conf.settings.USE_WORKER_POOL', True)
    def test_named(self):
        default = pool.get_pool()
        p = pool.get_pool(name='test')

        self.assertIn('test', pool._pools)

        self.assertNotEqual(default, p)

        results = pool.pool_exec(p, [pool.Job(lambda v: v, 'a')], 1)

        self.assertEqual(list(results)[0].result, 'a')

        pool.stop_pool('test')

        self.assertNotIn('test', pool._pools)

    @mock.patch('django.conf.settings.USE_WORKER_POOL', False)
    def test_named_no_worker_pool(self):
        default = pool.get_pool()
        p = pool.get_pool(name='test')

        self.assertIsNone(p)
        self.assertIsNone(default)

        results = pool.pool_exec(p, [pool.Job(lambda v: v, 'a')], 1)

        self.assertEqual(list(results)[0].result, 'a')

    @mock.patch('django.conf.settings.USE_WORKER_POOL', True)
    def test_timeout(self):
        p = pool.get_pool()

        jobs = [pool.Job(lambda v: time.sleep(2) and v, i) for i in range(1, 5)]

        with self.assertRaises(pool.PoolTimeoutError):
          results = pool.pool_exec(p, jobs, 1)

          list(results)

    @mock.patch('django.conf.settings.USE_WORKER_POOL', False)
    def test_timeout_sync(self):
        p = pool.get_pool()

        jobs = [pool.Job(lambda v: time.sleep(1) and v, i) for i in range(1, 5)]

        with self.assertRaises(pool.PoolTimeoutError):
          results = pool.pool_exec(p, jobs, 1)

          list(results)

if __name__ == '__main__':
    unittest.main()
