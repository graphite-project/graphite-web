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
from os.path import dirname, join, abspath

TEMPLATE_DIRS = (
  join(dirname( abspath(__file__) ), 'templates'),
)

#Django settings below, do not touch!
APPEND_SLASH = False
TEMPLATE_DEBUG = False
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    },
}

# Language code for this installation. All choices can be found here:
# http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
# http://blogs.law.harvard.edu/tech/stories/storyReader$15
LANGUAGE_CODE = 'en-us'

# Absolute path to the directory that holds media.
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT.
# Example: "http://media.lawrence.com"
MEDIA_URL = ''

MIDDLEWARE_CLASSES = (
  'graphite.middleware.LogExceptionsMiddleware',
  'django.middleware.common.CommonMiddleware',
  'django.middleware.gzip.GZipMiddleware',
  'django.contrib.sessions.middleware.SessionMiddleware',
  'django.contrib.auth.middleware.AuthenticationMiddleware',
  'django.contrib.messages.middleware.MessageMiddleware',
)

ROOT_URLCONF = 'graphite.urls'

INSTALLED_APPS = (
  'graphite.metrics',
  'graphite.render',
  'graphite.browser',
  'graphite.composer',
  'graphite.account',
  'graphite.dashboard',
  'graphite.whitelist',
  'graphite.events',
  'graphite.url_shortener',
  'django.contrib.auth',
  'django.contrib.sessions',
  'django.contrib.admin',
  'django.contrib.contenttypes',
  'django.contrib.staticfiles',
  'tagging',
)

AUTHENTICATION_BACKENDS = ['django.contrib.auth.backends.ModelBackend']

GRAPHITE_WEB_APP_SETTINGS_LOADED = True
