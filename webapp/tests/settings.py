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

WHISPER_DIR = join(TEMP_GRAPHITE_DIR, 'whisper/')
os.mkdir(WHISPER_DIR)

# Manually add WHISPER_DIR to STANDARD_DIRS
# STANDARD_DIRS is generated programtically in settings.py, the modification of
# WHISPER_DIR above does not change the value in STANDARD_DIRS.
STANDARD_DIRS = [WHISPER_DIR]

INDEX_FILE = os.path.join(TEMP_GRAPHITE_DIR, 'index')

URL_PREFIX = '/graphite'
