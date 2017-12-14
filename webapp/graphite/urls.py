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
from django.conf import settings
from django.conf.urls import include, url
from django.contrib import admin
from graphite.url_shortener.views import shorten, follow
from graphite.browser.views import browser

graphite_urls = [
    url('^admin/', admin.site.urls),
    url('^render', include('graphite.render.urls')),
    url('^composer', include('graphite.composer.urls')),
    url('^metrics', include('graphite.metrics.urls')),
    url('^browser', include('graphite.browser.urls')),
    url('^account', include('graphite.account.urls')),
    url('^dashboard', include('graphite.dashboard.urls')),
    url('^whitelist', include('graphite.whitelist.urls')),
    url('^version', include('graphite.version.urls')),
    url('^events', include('graphite.events.urls')),
    url('^tags', include('graphite.tags.urls')),
    url('^functions', include('graphite.functions.urls')),
    url('^s/(?P<path>.*)', shorten, name='shorten'),
    url('^S/(?P<link_id>[a-zA-Z0-9]+)/?$', follow, name='follow'),
    url('^$', browser, name='browser'),
]

if settings.URL_PREFIX.strip('/'):
    urlpatterns = [
        url(r'^{0}/'.format(settings.URL_PREFIX.strip('/')), include(graphite_urls)),
    ]
else:
    urlpatterns = graphite_urls

handler500 = 'graphite.views.server_error'
