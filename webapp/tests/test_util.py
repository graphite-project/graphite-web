from django.test import TestCase

import socket

from graphite import util


class UtilTest(TestCase):
    def test_is_local_interface(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 0))  # connecting to a UDP address doesn't send packets
        local_ip_address = s.getsockname()[0]
        s.close()
        addresses = [local_ip_address, local_ip_address + ':8080', '127.0.0.1', '127.0.0.1:8080', '8.8.8.8']
        results = [ util.is_local_interface(a) for a in addresses ]
        self.assertEqual( results, [True, True, False, False, False] )
