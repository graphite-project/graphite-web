"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License"""
import django

from django.conf import settings
from django.conf.urls import patterns, include, url
from django.contrib import admin

if django.VERSION < (1, 5):  # load the "future" {% url %} tag
    from django.template.loader import add_to_builtins
    add_to_builtins('django.templatetags.future')

if django.VERSION < (1, 7):
    # Django doing autodiscover automatically:
    # https://docs.djangoproject.com/en/dev/releases/1.7/#app-loading-refactor
    admin.autodiscover()

graphite_urls = patterns(
    '',
    ('^admin/', include(admin.site.urls)),
    ('^render/?', include('graphite.render.urls')),
    ('^composer/?', include('graphite.composer.urls')),
    ('^metrics/?', include('graphite.metrics.urls')),
    ('^browser/?', include('graphite.browser.urls')),
    ('^account/', include('graphite.account.urls')),
    ('^dashboard/?', include('graphite.dashboard.urls')),
    ('^whitelist/?', include('graphite.whitelist.urls')),
    ('^version/', include('graphite.version.urls')),
    ('^events/', include('graphite.events.urls')),
    url('^s/(?P<path>.*)',
        'graphite.url_shortener.views.shorten', name='shorten'),
    url('^S/(?P<link_id>[a-zA-Z0-9]+)/?$',
        'graphite.url_shortener.views.follow', name='follow'),
    url('^$', 'graphite.browser.views.browser', name='browser'),
)

url_prefix = ''
if settings.URL_PREFIX.strip('/'):
    url_prefix = '{0}/'.format(settings.URL_PREFIX.strip('/'))

urlpatterns = patterns(
    '',
    (r'^{0}'.format(url_prefix), include(graphite_urls)),
)

handler500 = 'graphite.views.server_error'
