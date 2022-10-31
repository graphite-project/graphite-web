from django.test import TestCase as OriginalTestCase
from graphite.worker_pool.pool import stop_pools


def is_unsafe_str(s):
    for symbol in '<>':
        if s.find(symbol) > 0:
            return True
        return False


class TestCase(OriginalTestCase):
    def tearDown(self):
        stop_pools()

    # Assert that a response is unsanitized (for check XSS issues)
    def assertXSS(self, response, status_code=200, msg_prefix=''):
        if status_code is not None:
            self.assertEqual(
                response.status_code, status_code,
                msg_prefix + "Couldn't retrieve content: Response code was %d"
                " (expected %d)" % (response.status_code, status_code)
            )

        content = str(response.content)
        xss = is_unsafe_str(content)
        self.assertFalse(xss, msg=msg_prefix+content)
