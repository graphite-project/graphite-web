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
import os
from os.path import abspath, dirname, join
import logging
from graphite.logger import NullHandler
log = logging.getLogger(__name__)
log.addHandler(NullHandler())
_SEPARATOR = "-------------"

def _check_dir_exists(valuename, dirname):
    if not os.path.exists(dirname):
        message = "Directory '%s' (%s) doesn't exist."%(\
            dirname, valuename)
        # Perhaps the message should be written to sys.stderr also
        log.warning(message)
        return False
    return True

# Filesystem layout
# This is where graphite-query is installed (i.e. the directory
# that contains the "graphite" directory. Should not be modified
GRAPHITE_ROOT = dirname(dirname( abspath(__file__) ))
# Initialize additional path variables
STORAGE_DIR = ''
INDEX_FILE = ''
CERES_DIR = ''
WHISPER_DIR = ''
STANDARD_DIRS = []

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
MAX_FETCH_RETRIES = 2

#Miscellaneous settings
STORAGE_FINDERS = (
    'graphite.finders.standard.StandardFinder',
)

# If using rrdcached, set to the address or socket of the daemon
FLUSHRRDCACHED = ''


# Path configuration

def setup_storage_variables(storage_dir):
    """ This function can be called from user's code to setup
        the various storage variables automatically """
    global STORAGE_DIR
    global INDEX_FILE
    global CERES_DIR
    global WHISPER_DIR
    global STANDARD_DIRS

    STORAGE_DIR = storage_dir
    STANDARD_DIRS = []

    if os.path.commonprefix([STORAGE_DIR, GRAPHITE_ROOT]) == GRAPHITE_ROOT:
        log.warn("Note that all file and directory variables will "\
                          "be set relative to graphite-query's installation " \
                          "directory: %s!"%GRAPHITE_ROOT)
        log.warn("You'll probably want to set them relative to "\
                             "/opt/graphite")
    INDEX_FILE = join(STORAGE_DIR, 'index')
    # The code for ceres should become similar
    # to the code for whisper
    CERES_DIR = join(STORAGE_DIR, 'ceres')
    _check_dir_exists("CERES_DIR", CERES_DIR)
    try:
        import whisper
    except ImportError:
        # In the future, when/if there are more databases to chose from
        # warn should be changed to info
        #log.warn("whisper module could not be loaded, whisper support disabled")
        raise ImportError("The graphite-whisper module is required, please install it.")
    WHISPER_DIR = join(STORAGE_DIR, 'whisper')
    _check_dir_exists("WHISPER_DIR", WHISPER_DIR)

    STANDARD_DIRS.append(WHISPER_DIR)

if not STORAGE_DIR:
    STORAGE_DIR = os.environ.get('GRAPHITE_STORAGE_DIR', join(GRAPHITE_ROOT, 'storage'))
_check_dir_exists("STORAGE_DIR", STORAGE_DIR)

# Setup some default values
setup_storage_variables(STORAGE_DIR)