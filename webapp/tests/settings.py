from graphite.settings import *

from django import VERSION

if VERSION < (1, 6):
    TEST_RUNNER = 'discover_runner.DiscoverRunner'
