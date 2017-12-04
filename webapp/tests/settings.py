from __future__ import print_function
import atexit
import os
import shutil
import tempfile

from django import VERSION
from django.conf import settings, global_settings

# Silence the warning about an insecure SECRET_KEY
global_settings.SECRET_KEY = 'SUPER_SAFE_TESTING_KEY'

settings.configure(default_settings=global_settings)
from graphite.settings import *  # noqa

# support testing with mysql & postgres via tox
if os.environ.get('TEST_MYSQL'):
    DATABASES = {
        'default': {
            'NAME': 'graphite',
            'ENGINE': 'django.db.backends.mysql',
            'USER': os.environ.get('TEST_MYSQL_USER') or 'graphite',
            'PASSWORD': os.environ.get('TEST_MYSQL_PASSWORD') or '',
            'HOST': os.environ.get('TEST_MYSQL_HOST') or 'localhost',
            'PORT': os.environ.get('TEST_MYSQL_PORT') or '3306',
            'TEST': {
                'NAME': os.environ.get('TEST_MYSQL_NAME') or 'test_graphite',
            },
        },
    }
elif os.environ.get('TEST_POSTGRESQL'):
    DATABASES = {
        'default': {
            'NAME': 'graphite',
            'ENGINE': 'django.db.backends.postgresql',
            'USER': os.environ.get('TEST_POSTGRESQL_USER') or 'graphite',
            'PASSWORD': os.environ.get('TEST_POSTGRESQL_PASSWORD') or '',
            'HOST': os.environ.get('TEST_POSTGRESQL_HOST') or 'localhost',
            'PORT': os.environ.get('TEST_POSTGRESQL_PORT') or '5432',
            'TEST': {
                'NAME': os.environ.get('TEST_POSTGRESQL_NAME') or 'test_graphite',
            },
        },
    }

if VERSION < (1, 6):
    TEST_RUNNER = 'discover_runner.DiscoverRunner'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    },
}

# Temporaray directories

def atexit_tmpremover(dirname):
    """ Utility to remove a temporary directory during program exit. """
    try:
        shutil.rmtree(dirname)
        print("Removed temporary directory: %s" % dirname)
    except OSError:
        # if the temp dir was removed already by other means
        pass


# create a temporary directory
TEMP_GRAPHITE_DIR = tempfile.mkdtemp(prefix='graphite-test-')
atexit.register(atexit_tmpremover, TEMP_GRAPHITE_DIR)

LOG_DIR = os.path.join(TEMP_GRAPHITE_DIR, 'log')
os.mkdir(LOG_DIR)

WHISPER_DIR = os.path.join(TEMP_GRAPHITE_DIR, 'whisper/')
os.mkdir(WHISPER_DIR)

# Manually add WHISPER_DIR to STANDARD_DIRS
# STANDARD_DIRS is generated programtically in settings.py, the modification of
# WHISPER_DIR above does not change the value in STANDARD_DIRS.
STANDARD_DIRS = [WHISPER_DIR]

INDEX_FILE = os.path.join(TEMP_GRAPHITE_DIR, 'index')

URL_PREFIX = '/graphite'
