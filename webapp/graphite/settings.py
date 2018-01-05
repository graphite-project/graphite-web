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
# Django settings for graphite project.
# DO NOT MODIFY THIS FILE DIRECTLY - use local_settings.py instead
from __future__ import print_function
import os
import sys
from os.path import abspath, dirname, join
from warnings import warn

from django import VERSION as DJANGO_VERSION
try:
    from django.urls import reverse_lazy
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse_lazy


GRAPHITE_WEB_APP_SETTINGS_LOADED = False
WEBAPP_VERSION = '1.2.0-dev'
DEBUG = False
JAVASCRIPT_DEBUG = False

DATE_FORMAT = '%m/%d'

# Filesystem layout
WEB_DIR = dirname( abspath(__file__) )
WEBAPP_DIR = dirname(WEB_DIR)
GRAPHITE_ROOT = dirname(WEBAPP_DIR)
# Initialize additional path variables
# Defaults for these are set after local_settings is imported
STATIC_ROOT = ''
STATIC_URL = '/static/'
URL_PREFIX = ''
CONF_DIR = ''
DASHBOARD_CONF = ''
GRAPHTEMPLATES_CONF = ''
STORAGE_DIR = ''
WHITELIST_FILE = ''
INDEX_FILE = ''
LOG_DIR = ''
CERES_DIR = ''
WHISPER_DIR = ''
RRD_DIR = ''
STANDARD_DIRS = []

# Timeout settings
FIND_TIMEOUT = None  # default 3.0 see below
FETCH_TIMEOUT = None  # default 6.0 see below

# Cluster settings
CLUSTER_SERVERS = []

# Worker Pool
USE_WORKER_POOL = True
POOL_MAX_WORKERS = 10

# This settings control whether https is used to communicate between cluster members
INTRACLUSTER_HTTPS = False
REMOTE_FIND_TIMEOUT = None  # Replaced by FIND_TIMEOUT
REMOTE_FETCH_TIMEOUT = None  # Replaced by FETCH_TIMEOUT
REMOTE_RETRY_DELAY = 60.0
REMOTE_EXCLUDE_LOCAL = False
REMOTE_STORE_MERGE_RESULTS = True
REMOTE_STORE_FORWARD_HEADERS = []
REMOTE_STORE_USE_POST = False
REMOTE_BUFFER_SIZE = 1024 * 1024

# Carbonlink settings
CARBON_METRIC_PREFIX='carbon'
CARBONLINK_HOSTS = ["127.0.0.1:7002"]
CARBONLINK_TIMEOUT = 1.0
CARBONLINK_HASHING_KEYFUNC = None
CARBONLINK_HASHING_TYPE = 'carbon_ch'
CARBONLINK_RETRY_DELAY = 15
REPLICATION_FACTOR = 1

# Cache settings.
MEMCACHE_HOSTS = []
MEMCACHE_KEY_PREFIX = ''
MEMCACHE_OPTIONS = {}
CACHES={}
FIND_CACHE_DURATION = 300
FIND_TOLERANCE = 2 * FIND_CACHE_DURATION
DEFAULT_CACHE_DURATION = 60 #metric data and graphs are cached for one minute by default
DEFAULT_CACHE_POLICY = []

# this setting controls the default xFilesFactor used for query-time aggregration
DEFAULT_XFILES_FACTOR = 0

# These can also be configured using:
# https://docs.djangoproject.com/en/1.11/topics/logging/
LOG_RENDERING_PERFORMANCE = False
LOG_CACHE_PERFORMANCE = False
LOG_ROTATION = True
LOG_ROTATION_COUNT = 1

LOG_FILE_INFO = 'info.log'
LOG_FILE_EXCEPTION = 'exception.log'
LOG_FILE_CACHE = 'cache.log'
LOG_FILE_RENDERING = 'rendering.log'

MAX_FETCH_RETRIES = 2

# This settings limit metrics find to prevent from too large query
METRICS_FIND_WARNING_THRESHOLD = float('Inf') # Print a warning if more than X metrics are returned
METRICS_FIND_FAILURE_THRESHOLD = float('Inf') # Fail if more than X metrics are returned

#Remote rendering settings
REMOTE_RENDERING = False #if True, rendering is delegated to RENDERING_HOSTS
RENDERING_HOSTS = []
REMOTE_RENDER_CONNECT_TIMEOUT = 1.0

#Miscellaneous settings
SMTP_SERVER = "localhost"
DOCUMENTATION_VERSION = 'latest' if 'dev' in WEBAPP_VERSION else WEBAPP_VERSION
DOCUMENTATION_URL = 'https://graphite.readthedocs.io/en/{}/'.format(DOCUMENTATION_VERSION)
ALLOW_ANONYMOUS_CLI = True
LEGEND_MAX_ITEMS = 10
RRD_CF = 'AVERAGE'
STORAGE_FINDERS = (
    'graphite.finders.remote.RemoteFinder',
    'graphite.finders.standard.StandardFinder',
)

# TagDB settings
TAGDB = 'graphite.tags.localdatabase.LocalDatabaseTagDB'

TAGDB_CACHE_DURATION = 60

TAGDB_AUTOCOMPLETE_LIMIT = 100

TAGDB_REDIS_HOST = 'localhost'
TAGDB_REDIS_PORT = 6379
TAGDB_REDIS_DB = 0

TAGDB_HTTP_URL = ''
TAGDB_HTTP_USER = ''
TAGDB_HTTP_PASSWORD = ''
TAGDB_HTTP_AUTOCOMPLETE = False

# Function plugins
FUNCTION_PLUGINS = []


MIDDLEWARE = ()
if DJANGO_VERSION < (1, 10):
    MIDDLEWARE_CLASSES = MIDDLEWARE
MAX_TAG_LENGTH = 50
AUTO_REFRESH_INTERVAL = 60

#Authentication settings
USE_LDAP_AUTH = False
LDAP_SERVER = "" # "ldapserver.mydomain.com"
LDAP_PORT = 389
LDAP_USE_TLS = False
LDAP_SEARCH_BASE = "" # "OU=users,DC=mydomain,DC=com"
LDAP_BASE_USER = "" # "CN=some_readonly_account,DC=mydomain,DC=com"
LDAP_BASE_PASS = "" # "my_password"
LDAP_USER_QUERY = "" # "(username=%s)"  For Active Directory use "(sAMAccountName=%s)"
LDAP_URI = None
LDAP_USER_DN_TEMPLATE = None

#Set this to True to delegate authentication to the web server
USE_REMOTE_USER_AUTHENTICATION = False
REMOTE_USER_BACKEND = "" # Provide an alternate or subclassed backend
REMOTE_USER_MIDDLEWARE = "" # Provide an alternate or subclassed middleware
AUTHENTICATION_BACKENDS=[]

# Django 1.5 requires this so we set a default but warn the user
SECRET_KEY = 'UNSAFE_DEFAULT'

# Django 1.5 requires this to be set. Here we default to prior behavior and allow all
ALLOWED_HOSTS = [ '*' ]

# Override to link a different URL for login (e.g. for django_openid_auth)
LOGIN_URL = reverse_lazy('account_login')

# Set the default timezone to UTC
TIME_ZONE = 'UTC'

# Set to True to require authentication to save or delete dashboards
DASHBOARD_REQUIRE_AUTHENTICATION = False
# Require Django change/delete permissions to save or delete dashboards.
# NOTE: Requires DASHBOARD_REQUIRE_AUTHENTICATION to be set
DASHBOARD_REQUIRE_PERMISSIONS = False
# Name of a group to which the user must belong to save or delete dashboards.  Alternative to
# DASHBOARD_REQUIRE_PERMISSIONS, particularly useful when using only LDAP (without Admin app)
# NOTE: Requires DASHBOARD_REQUIRE_AUTHENTICATION to be set
DASHBOARD_REQUIRE_EDIT_GROUP = None

DATABASES = None

# If using rrdcached, set to the address or socket of the daemon
FLUSHRRDCACHED = ''

## Load our local_settings
try:
  from graphite.local_settings import *  # noqa
except ImportError:
  print("Could not import graphite.local_settings, using defaults!", file=sys.stderr)

## Load Django settings if they werent picked up in local_settings
if not GRAPHITE_WEB_APP_SETTINGS_LOADED:
  from graphite.app_settings import *  # noqa


STATICFILES_DIRS = (
    join(WEBAPP_DIR, 'content'),
)

# Handle renamed timeout settings
FIND_TIMEOUT = FIND_TIMEOUT or REMOTE_FIND_TIMEOUT or 3.0
FETCH_TIMEOUT = FETCH_TIMEOUT or REMOTE_FETCH_TIMEOUT or 6.0

## Set config dependent on flags set in local_settings
# Path configuration
if not STATIC_ROOT:
  STATIC_ROOT = join(GRAPHITE_ROOT, 'static')

if not CONF_DIR:
  CONF_DIR = os.environ.get('GRAPHITE_CONF_DIR', join(GRAPHITE_ROOT, 'conf'))
if not DASHBOARD_CONF:
  DASHBOARD_CONF = join(CONF_DIR, 'dashboard.conf')
if not GRAPHTEMPLATES_CONF:
  GRAPHTEMPLATES_CONF = join(CONF_DIR, 'graphTemplates.conf')

if not STORAGE_DIR:
  STORAGE_DIR = os.environ.get('GRAPHITE_STORAGE_DIR', join(GRAPHITE_ROOT, 'storage'))
if not WHITELIST_FILE:
  WHITELIST_FILE = join(STORAGE_DIR, 'lists', 'whitelist')
if not INDEX_FILE:
  INDEX_FILE = join(STORAGE_DIR, 'index')
if not LOG_DIR:
  LOG_DIR = join(STORAGE_DIR, 'log', 'webapp')
if not WHISPER_DIR:
  WHISPER_DIR = join(STORAGE_DIR, 'whisper/')
if not CERES_DIR:
  CERES_DIR = join(STORAGE_DIR, 'ceres/')
if not RRD_DIR:
  RRD_DIR = join(STORAGE_DIR, 'rrd/')
if not STANDARD_DIRS:
  try:
    import whisper  # noqa
    if os.path.exists(WHISPER_DIR):
      STANDARD_DIRS.append(WHISPER_DIR)
  except ImportError:
    print("WARNING: whisper module could not be loaded, whisper support disabled", file=sys.stderr)
  try:
    import ceres  # noqa
    if os.path.exists(CERES_DIR):
      STANDARD_DIRS.append(CERES_DIR)
  except ImportError:
    pass
  try:
    import rrdtool  # noqa
    if os.path.exists(RRD_DIR):
      STANDARD_DIRS.append(RRD_DIR)
  except ImportError:
    pass

if DATABASES is None:
    DATABASES = {
      'default': {
        'NAME': join(STORAGE_DIR, 'graphite.db'),
        'ENGINE': 'django.db.backends.sqlite3',
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': '',
      },
    }

# Handle URL prefix in static files handling
if URL_PREFIX and not STATIC_URL.startswith(URL_PREFIX):
    STATIC_URL = '/{0}{1}'.format(URL_PREFIX.strip('/'), STATIC_URL)

# Default sqlite db file
# This is set here so that a user-set STORAGE_DIR is available
if 'sqlite3' in DATABASES.get('default',{}).get('ENGINE','') \
    and not DATABASES.get('default',{}).get('NAME'):
  DATABASES['default']['NAME'] = join(STORAGE_DIR, 'graphite.db')

# Caching shortcuts
if MEMCACHE_HOSTS:
    CACHES['default'] = {
        'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
        'LOCATION': MEMCACHE_HOSTS,
        'TIMEOUT': DEFAULT_CACHE_DURATION,
        'KEY_PREFIX': MEMCACHE_KEY_PREFIX,
        'OPTIONS': MEMCACHE_OPTIONS,
    }

if not CACHES:
  CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    },
  }

# Authentication shortcuts
if USE_LDAP_AUTH and LDAP_URI is None:
  LDAP_URI = "ldap://%s:%d/" % (LDAP_SERVER, LDAP_PORT)

if USE_REMOTE_USER_AUTHENTICATION or REMOTE_USER_BACKEND:
  if REMOTE_USER_MIDDLEWARE:
    MIDDLEWARE += (REMOTE_USER_MIDDLEWARE,)
  else:
    MIDDLEWARE += ('django.contrib.auth.middleware.RemoteUserMiddleware',)
  if DJANGO_VERSION < (1, 10):
      MIDDLEWARE_CLASSES = MIDDLEWARE
  if REMOTE_USER_BACKEND:
    AUTHENTICATION_BACKENDS.insert(0,REMOTE_USER_BACKEND)
  else:
    AUTHENTICATION_BACKENDS.insert(0,'django.contrib.auth.backends.RemoteUserBackend')

if USE_LDAP_AUTH:
  AUTHENTICATION_BACKENDS.insert(0,'graphite.account.ldapBackend.LDAPBackend')

if SECRET_KEY == 'UNSAFE_DEFAULT':
  warn('SECRET_KEY is set to an unsafe default. This should be set in local_settings.py for better security')

USE_TZ = True
