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
from django import VERSION as DJANGO_VERSION
try:
    import raven
except ImportError:
    raven = None

#Django settings below, do not touch!
APPEND_SLASH = False
TEMPLATE_DEBUG = False

SILENCED_SYSTEM_CHECKS = ['urls.W002']

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            join(dirname( abspath(__file__) ), 'templates')
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                # Insert your TEMPLATE_CONTEXT_PROCESSORS here or use this
                # list if you haven't customized them:
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.debug',
                'django.template.context_processors.i18n',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.tz',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Language code for this installation. All choices can be found here:
# http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
# http://blogs.law.harvard.edu/tech/stories/storyReader$15
LANGUAGE_CODE = 'en-us'

# Absolute path to the directory that holds media.
MEDIA_ROOT = ''

# URL that handles the media served from MEDIA_ROOT.
# Example: "http://media.lawrence.com"
MEDIA_URL = ''

MIDDLEWARE = (
  'graphite.middleware.LogExceptionsMiddleware',
  'django.middleware.common.CommonMiddleware',
  'django.middleware.gzip.GZipMiddleware',
  'django.contrib.sessions.middleware.SessionMiddleware',
  'django.contrib.auth.middleware.AuthenticationMiddleware',
  'django.contrib.messages.middleware.MessageMiddleware',
)
# SessionAuthenticationMiddleware is enabled by default since 1.10 and
# deprecated since 2.0
if DJANGO_VERSION < (1, 10):
    MIDDLEWARE_CLASSES = MIDDLEWARE + \
        ('django.contrib.auth.middleware.SessionAuthenticationMiddleware',)

ROOT_URLCONF = 'graphite.urls'

INSTALLED_APPS = (
  'graphite.account',
  'graphite.browser',
  'graphite.composer',
  'graphite.dashboard',
  'graphite.events',
  'graphite.functions',
  'graphite.metrics',
  'graphite.render',
  'graphite.tags',
  'graphite.url_shortener',
  'graphite.whitelist',
  'django.contrib.auth',
  'django.contrib.sessions',
  'django.contrib.admin',
  'django.contrib.contenttypes',
  'django.contrib.staticfiles',
  'tagging',
)
if raven is not None:
    INSTALLED_APPS = INSTALLED_APPS + ('raven.contrib.django.raven_compat',)


AUTHENTICATION_BACKENDS = ['django.contrib.auth.backends.ModelBackend']

GRAPHITE_WEB_APP_SETTINGS_LOADED = True
