# From https://github.com/reyoung/singleton


import unittest
from graphite.singleton import Singleton, ThreadSafeSingleton


class TestSingleton(unittest.TestCase):

    def _test_singleton(self, cls):
        @cls
        class IntSingleton(object):
            def __init__(self, default=0):
                self.i = default

        IntSingleton.initialize(10)
        a = IntSingleton.instance()
        b = IntSingleton.instance()

        self.assertEqual(a, b)
        self.assertEqual(id(a), id(b))
        self.assertTrue(IntSingleton.is_initialized())
        self.assertEqual(a.i, 10)
        self.assertEqual(b.i, 10)
        a.i = 100
        self.assertEqual(b.i, 100)

    def test_singleton(self):
        self._test_singleton(Singleton)

    def test_thread_safe_singleton(self):
        self._test_singleton(ThreadSafeSingleton)


if __name__ == '__main__':
    unittest.main()
