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
import sys, os
from django import VERSION as DJANGO_VERSION
from os.path import abspath, dirname, join
from warnings import warn


GRAPHITE_WEB_APP_SETTINGS_LOADED = False
WEBAPP_VERSION = '0.10.0-alpha'
DEBUG = False
JAVASCRIPT_DEBUG = False

# Filesystem layout
WEB_DIR = dirname( abspath(__file__) )
WEBAPP_DIR = dirname(WEB_DIR)
GRAPHITE_ROOT = dirname(WEBAPP_DIR)
# Initialize additional path variables
# Defaults for these are set after local_settings is imported
CONTENT_DIR = ''
CSS_DIR = ''
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

CLUSTER_SERVERS = []

sys.path.insert(0, WEBAPP_DIR)

# Cluster settings
CLUSTER_SERVERS = []
REMOTE_FIND_TIMEOUT = 3.0
REMOTE_FETCH_TIMEOUT = 6.0
REMOTE_RETRY_DELAY = 60.0
REMOTE_READER_CACHE_SIZE_LIMIT = 1000
CARBONLINK_HOSTS = ["127.0.0.1:7002"]
CARBONLINK_TIMEOUT = 1.0
CARBONLINK_HASHING_KEYFUNC = None
CARBONLINK_RETRY_DELAY = 15
REPLICATION_FACTOR = 1
MEMCACHE_HOSTS = []
FIND_CACHE_DURATION = 300
FIND_TOLERANCE = 2 * FIND_CACHE_DURATION
DEFAULT_CACHE_DURATION = 60 #metric data and graphs are cached for one minute by default
LOG_CACHE_PERFORMANCE = False

MAX_FETCH_RETRIES = 2

#Remote rendering settings
REMOTE_RENDERING = False #if True, rendering is delegated to RENDERING_HOSTS
RENDERING_HOSTS = []
REMOTE_RENDER_CONNECT_TIMEOUT = 1.0
LOG_RENDERING_PERFORMANCE = False

#Miscellaneous settings
SMTP_SERVER = "localhost"
DOCUMENTATION_URL = "http://graphite.readthedocs.org/"
ALLOW_ANONYMOUS_CLI = True
LOG_METRIC_ACCESS = False
LEGEND_MAX_ITEMS = 10
RRD_CF = 'AVERAGE'

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

#Set this to True to delegate authentication to the web server
USE_REMOTE_USER_AUTHENTICATION = False

# Django 1.5 requires this so we set a default but warn the user
SECRET_KEY = 'UNSAFE_DEFAULT'

# Django 1.5 requires this to be set. Here we default to prior behavior and allow all
ALLOWED_HOSTS = [ '*' ]

# Override to link a different URL for login (e.g. for django_openid_auth)
LOGIN_URL = '/account/login'

# Set to True to require authentication to save or delete dashboards
DASHBOARD_REQUIRE_AUTHENTICATION = False
# Require Django change/delete permissions to save or delete dashboards.
# NOTE: Requires DASHBOARD_REQUIRE_AUTHENTICATION to be set
DASHBOARD_REQUIRE_PERMISSIONS = False
# Name of a group to which the user must belong to save or delete dashboards.  Alternative to
# DASHBOARD_REQUIRE_PERMISSIONS, particularly useful when using only LDAP (without Admin app)
# NOTE: Requires DASHBOARD_REQUIRE_AUTHENTICATION to be set
DASHBOARD_REQUIRE_EDIT_GROUP = None

if DJANGO_VERSION < (1,4):
  #Initialize database settings - Old style (pre 1.2)
  DATABASE_ENGINE = 'django.db.backends.sqlite3' # 'postgresql', 'mysql', 'sqlite3' or 'ado_mssql'.
  DATABASE_NAME = ''                           # Or path to database file if using sqlite3.
  DATABASE_USER = ''                           # Not used with sqlite3.
  DATABASE_PASSWORD = ''                       # Not used with sqlite3.
  DATABASE_HOST = ''                           # Set to empty string for localhost. Not used with sqlite3.
  DATABASE_PORT = ''                           # Set to empty string for default. Not used with sqlite3.
else:
  DATABASES = {
    'default': {
      'NAME': '/opt/graphite/storage/graphite.db',
      'ENGINE': 'django.db.backends.sqlite3',
      'USER': '',
      'PASSWORD': '',
      'HOST': '',
      'PORT': ''
  }
}

# If using rrdcached, set to the address or socket of the daemon
FLUSHRRDCACHED = ''

## Load our local_settings
try:
  from graphite.local_settings import *
except ImportError:
  print >> sys.stderr, "Could not import graphite.local_settings, using defaults!"

## Load Django settings if they werent picked up in local_settings
if not GRAPHITE_WEB_APP_SETTINGS_LOADED:
  from graphite.app_settings import *

## Set config dependent on flags set in local_settings
# Path configuration
if not CONTENT_DIR:
  CONTENT_DIR = join(WEBAPP_DIR, 'content')
if not CSS_DIR:
  CSS_DIR = join(CONTENT_DIR, 'css')

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
    import whisper
    if os.path.exists(WHISPER_DIR):
      STANDARD_DIRS.append(WHISPER_DIR)
  except ImportError:
    print >> sys.stderr, "WARNING: whisper module could not be loaded, whisper support disabled"
  try:
    import rrdtool
    if os.path.exists(RRD_DIR):
      STANDARD_DIRS.append(RRD_DIR)
  except ImportError:
    pass

# Default sqlite db file
# This is set here so that a user-set STORAGE_DIR is available
if DJANGO_VERSION < (1,4):
  if 'sqlite3' in DATABASE_ENGINE \
      and not DATABASE_NAME:
    DATABASE_NAME = join(STORAGE_DIR, 'graphite.db')
else:
  if 'sqlite3' in DATABASES.get('default',{}).get('ENGINE','') \
      and not DATABASES.get('default',{}).get('NAME'):
    DATABASES['default']['NAME'] = join(STORAGE_DIR, 'graphite.db')

# Caching shortcuts
if MEMCACHE_HOSTS:
  CACHE_BACKEND = 'memcached://' + ';'.join(MEMCACHE_HOSTS) + ('/?timeout=%d' % DEFAULT_CACHE_DURATION)

# Authentication shortcuts
if USE_LDAP_AUTH and LDAP_URI is None:
  LDAP_URI = "ldap://%s:%d/" % (LDAP_SERVER, LDAP_PORT)

if USE_REMOTE_USER_AUTHENTICATION:
  MIDDLEWARE_CLASSES += ('django.contrib.auth.middleware.RemoteUserMiddleware',)
  AUTHENTICATION_BACKENDS.insert(0,'django.contrib.auth.backends.RemoteUserBackend')

if USE_LDAP_AUTH:
  AUTHENTICATION_BACKENDS.insert(0,'graphite.account.ldapBackend.LDAPBackend')

if SECRET_KEY == 'UNSAFE_DEFAULT':
  warn('SECRET_KEY is set to an unsafe default. This should be set in local_settings.py for better security')
