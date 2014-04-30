"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""
# settings for graphite project.
# DO NOT MODIFY THIS FILE DIRECTLY - use local_settings.py instead
import sys, os
from os.path import abspath, dirname, join

_SEPARATOR = "-------------"

def _check_dir_exists(valuename, dirname):
    if not os.path.exists(dirname):
        print >> sys.stderr, """Directory '%s' (%s) doesn't exist.  Creating it... You can set it to another value by setting %s in local_settings.py"""%(dirname, valuename, valuename)
        print >> sys.stderr, _SEPARATOR
        os.makedirs(dirname)


# Filesystem layout
GRAPHITE_ROOT = ''
# Initialize additional path variables
# Defaults for these are set after local_settings is imported
STORAGE_DIR = ''
INDEX_FILE = ''
LOG_DIR = ''
CERES_DIR = ''
WHISPER_DIR = ''
STANDARD_DIRS = []

CLUSTER_SERVERS = []

# Cluster settings
CLUSTER_SERVERS = []
REMOTE_FIND_TIMEOUT = 3.0
REMOTE_FETCH_TIMEOUT = 6.0
REMOTE_RETRY_DELAY = 60.0
REMOTE_READER_CACHE_SIZE_LIMIT = 1000
CARBON_METRIC_PREFIX='carbon'
CARBONLINK_HOSTS = ["127.0.0.1:7002"]
CARBONLINK_TIMEOUT = 1.0
CARBONLINK_HASHING_KEYFUNC = None
CARBONLINK_RETRY_DELAY = 15
REPLICATION_FACTOR = 1

FIND_CACHE_DURATION = 300
FIND_TOLERANCE = 2 * FIND_CACHE_DURATION

# The value below was used with django
# DEFAULT_CACHE_DURATION = 60 #metric data and graphs are cached for one minute by default
LOG_CACHE_PERFORMANCE = False
LOG_ROTATE = True

MAX_FETCH_RETRIES = 2

#Miscellaneous settings
LOG_METRIC_ACCESS = False
STORAGE_FINDERS = (
    'graphite.finders.standard.StandardFinder',
)

# If using rrdcached, set to the address or socket of the daemon
FLUSHRRDCACHED = ''

## Load our local_settings
try:
    from graphite.local_settings import *
except ImportError:
    print >> sys.stderr, "Could not import graphite.local_settings, using defaults!"
    print >> sys.stderr, _SEPARATOR

if not GRAPHITE_ROOT:
    GRAPHITE_ROOT = dirname(dirname( abspath(__file__) ))

## Set config dependent on flags set in local_settings
# Path configuration
if not STORAGE_DIR:
    STORAGE_DIR = os.environ.get('GRAPHITE_STORAGE_DIR', join(GRAPHITE_ROOT, 'storage'))
_check_dir_exists("STORAGE_DIR", STORAGE_DIR)
if os.path.commonprefix([STORAGE_DIR, GRAPHITE_ROOT]) == GRAPHITE_ROOT:
    try:
        from graphite.local_settings import STORAGE_DIR
    except ImportError:
        print>>sys.stderr,"Note that all file and directory variables will "\
                      "be set relative to graphite-query's installation " \
                      "directory: %s!"%GRAPHITE_ROOT,
        print >> sys.stderr, "You'll probably want to set them relative to "\
                         "/opt/graphite in local_settings.py"
        print >> sys.stderr, _SEPARATOR
if not INDEX_FILE:
    INDEX_FILE = join(STORAGE_DIR, 'index')
if not LOG_DIR:
    LOG_DIR = join(STORAGE_DIR, 'log', 'graphite')
_check_dir_exists("LOG_DIR", LOG_DIR)
if not CERES_DIR:
    CERES_DIR = join(STORAGE_DIR, 'ceres/')
_check_dir_exists("CERES_DIR", CERES_DIR)
if not STANDARD_DIRS:
    try:
        import whisper
        if not WHISPER_DIR:
            WHISPER_DIR = join(STORAGE_DIR, 'whisper/')
        _check_dir_exists("WHISPER_DIR", WHISPER_DIR)
        if os.path.exists(WHISPER_DIR):
            STANDARD_DIRS.append(WHISPER_DIR)
    except ImportError:
        print >> sys.stderr, "WARNING: whisper module could not be loaded, whisper support disabled"
