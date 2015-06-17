from django.test import TestCase

from graphite import util
from graphite.wsgi import application  # NOQA makes sure we have a working WSGI app


class UtilTest(TestCase):
    def test_is_local_interface(self):
        addresses = ['127.0.0.1', '127.0.0.1:8080', '8.8.8.8']
        results = [ util.is_local_interface(a) for a in addresses ]
        self.assertEqual( results, [True, True, False] )
