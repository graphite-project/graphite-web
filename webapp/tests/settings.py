from django.conf import settings, global_settings

# Silence the warning about an insecure SECRET_KEY
global_settings.SECRET_KEY = 'SUPER_SAFE_TESTING_KEY'

settings.configure(default_settings=global_settings)
from graphite.settings import *  # noqa

from django import VERSION

if VERSION < (1, 6):
    TEST_RUNNER = 'discover_runner.DiscoverRunner'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    },
}
