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
from os.path import join, dirname, abspath

WEBAPP_VERSION = '0.9.9'
DEBUG = False
JAVASCRIPT_DEBUG = False

# Filesystem layout (all directores should end in a /)
WEB_DIR = dirname( abspath(__file__) ) + '/'
WEBAPP_DIR = dirname( dirname(WEB_DIR) ) + '/'
GRAPHITE_ROOT = dirname( dirname(WEBAPP_DIR) ) + '/'
CONTENT_DIR = WEBAPP_DIR + 'content/'
CSS_DIR = CONTENT_DIR + 'css/'
THIRDPARTY_DIR = WEB_DIR + 'thirdparty/'

CONF_DIR = os.environ.get('GRAPHITE_CONF_DIR', GRAPHITE_ROOT + 'conf/')
STORAGE_DIR = os.environ.get('GRAPHITE_STORAGE_DIR', GRAPHITE_ROOT + 'storage/')
LISTS_DIR = STORAGE_DIR + 'lists/'
INDEX_FILE = STORAGE_DIR + 'index'
WHITELIST_FILE = LISTS_DIR + 'whitelist'
LOG_DIR = STORAGE_DIR + 'log/webapp/'

CLUSTER_SERVERS = []

sys.path.insert(0, THIRDPARTY_DIR)
sys.path.insert(0, WEBAPP_DIR)

# Do not override WHISPER_DIR, RRD_DIR, etc directly in
# local_settings.py, instead you should override DATA_DIRS
# to list all directories that should be searched for files
# of a supported format.
WHISPER_DIR = STORAGE_DIR + 'whisper/'
RRD_DIR = STORAGE_DIR + 'rrd/'
try:
  import rrdtool
  DATA_DIRS = [WHISPER_DIR, RRD_DIR]
except:
  DATA_DIRS = [WHISPER_DIR]


#Memcache settings
MEMCACHE_HOSTS = []
DEFAULT_CACHE_DURATION = 60 #metric data and graphs are cached for one minute by default
LOG_CACHE_PERFORMANCE = False

# Remote store settings
REMOTE_STORE_FETCH_TIMEOUT = 6
REMOTE_STORE_FIND_TIMEOUT = 2.5
REMOTE_STORE_RETRY_DELAY = 60
REMOTE_FIND_CACHE_DURATION = 300

#Remote rendering settings
REMOTE_RENDERING = False #if True, rendering is delegated to RENDERING_HOSTS
RENDERING_HOSTS = []
REMOTE_RENDER_CONNECT_TIMEOUT = 1.0
LOG_RENDERING_PERFORMANCE = False

#Miscellaneous settings
CARBONLINK_HOSTS = ["127.0.0.1:7002"]
CARBONLINK_TIMEOUT = 1.0
SMTP_SERVER = "localhost"
DOCUMENTATION_URL = "http://graphite.readthedocs.org/"
ALLOW_ANONYMOUS_CLI = True
LOG_METRIC_ACCESS = False
LEGEND_MAX_ITEMS = 10

#Authentication settings
USE_LDAP_AUTH = False
LDAP_SERVER = "" # "ldapserver.mydomain.com"
LDAP_PORT = 389
LDAP_SEARCH_BASE = "" # "OU=users,DC=mydomain,DC=com"
LDAP_BASE_USER = "" # "CN=some_readonly_account,DC=mydomain,DC=com"
LDAP_BASE_PASS = "" # "my_password"
LDAP_USER_QUERY = "" # "(username=%s)"  For Active Directory use "(sAMAccountName=%s)"
LDAP_URI = None

#Set this to True to delegate authentication to the web server
USE_REMOTE_USER_AUTHENTICATION = False

#Database settings, sqlite is intended for single-server setups
DATABASE_ENGINE = 'sqlite3'			# 'postgresql', 'mysql', 'sqlite3' or 'ado_mssql'.
DATABASE_NAME = STORAGE_DIR + 'graphite.db'	# Or path to database file if using sqlite3.
DATABASE_USER = ''				# Not used with sqlite3.
DATABASE_PASSWORD = ''				# Not used with sqlite3.
DATABASE_HOST = ''				# Set to empty string for localhost. Not used with sqlite3.
DATABASE_PORT = ''				# Set to empty string for default. Not used with sqlite3.

DASHBOARD_CONF = join(CONF_DIR, 'dashboard.conf')
GRAPHTEMPLATES_CONF = join(CONF_DIR, 'graphTemplates.conf')

ADMINS = ()
MANAGERS = ADMINS

TEMPLATE_DIRS = (
  join(WEB_DIR, 'templates'),
)

#Pull in overrides from local_settings.py
try:
  from graphite.local_settings import *
except ImportError:
  print >> sys.stderr, "Could not import graphite.local_settings, using defaults!"


if USE_LDAP_AUTH and LDAP_URI is None:
  LDAP_URI = "ldap://%s:%d/" % (LDAP_SERVER, LDAP_PORT)

#Django settings below, do not touch!
APPEND_SLASH = False
TEMPLATE_DEBUG = DEBUG
if MEMCACHE_HOSTS:
  CACHE_BACKEND = 'memcached://' + ';'.join(MEMCACHE_HOSTS) + ('/?timeout=%d' % DEFAULT_CACHE_DURATION)
else:
  CACHE_BACKEND = "dummy:///"

# Local time zone for this installation. All choices can be found here:
# http://www.postgresql.org/docs/current/static/datetime-keywords.html#DATETIME-TIMEZONE-SET-TABLE
#TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
# http://blogs.law.harvard.edu/tech/stories/storyReader$15
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT.
# Example: "http://media.lawrence.com"
MEDIA_URL = ''

# URL prefix for admin media -- CSS, JavaScript and images. Make sure to use a
# trailing slash.
# Examples: "http://foo.com/media/", "/media/".
ADMIN_MEDIA_PREFIX = '/media/'

# Make this unique, and don't share it with anybody.
SECRET_KEY = ''

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
  'django.template.loaders.filesystem.load_template_source',
  'django.template.loaders.app_directories.load_template_source',
)

MIDDLEWARE_CLASSES = (
  'django.middleware.common.CommonMiddleware',
  'django.middleware.gzip.GZipMiddleware',
  'django.contrib.sessions.middleware.SessionMiddleware',
  'django.contrib.auth.middleware.AuthenticationMiddleware',
)

if USE_REMOTE_USER_AUTHENTICATION:
  MIDDLEWARE_CLASSES += ('django.contrib.auth.middleware.RemoteUserMiddleware',)

ROOT_URLCONF = 'graphite.urls'

INSTALLED_APPS = (
  'graphite.metrics',
  'graphite.render',
  'graphite.cli',
  'graphite.browser',
  'graphite.composer',
  'graphite.account',
  'graphite.dashboard',
  'graphite.whitelist',
  'graphite.events',
  'django.contrib.auth',
  'django.contrib.sessions',
  'django.contrib.admin',
  'django.contrib.contenttypes',
  'tagging',
)

if USE_REMOTE_USER_AUTHENTICATION:
  AUTHENTICATION_BACKENDS = ['django.contrib.auth.backends.RemoteUserBackend']
else:
  AUTHENTICATION_BACKENDS = ['django.contrib.auth.backends.ModelBackend']

if USE_LDAP_AUTH:
  AUTHENTICATION_BACKENDS.insert(0,'graphite.account.ldapBackend.LDAPBackend')
