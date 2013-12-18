from graphite.settings import *  # noqa

from django import VERSION

if VERSION < (1, 6):
    TEST_RUNNER = 'discover_runner.DiscoverRunner'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    },
}
