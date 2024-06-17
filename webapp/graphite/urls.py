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
from django.conf.urls import include
from django.urls import re_path
from django.contrib import admin
from graphite.url_shortener.views import shorten, follow
from graphite.browser.views import browser

graphite_urls = [
    re_path('^admin/', admin.site.urls),
    re_path('^render', include('graphite.render.urls')),
    re_path('^composer', include('graphite.composer.urls')),
    re_path('^metrics', include('graphite.metrics.urls')),
    re_path('^browser', include('graphite.browser.urls')),
    re_path('^account', include('graphite.account.urls')),
    re_path('^dashboard', include('graphite.dashboard.urls')),
    re_path('^whitelist', include('graphite.whitelist.urls')),
    re_path('^version', include('graphite.version.urls')),
    re_path('^events', include('graphite.events.urls')),
    re_path('^tags', include('graphite.tags.urls')),
    re_path('^functions', include('graphite.functions.urls')),
    re_path('^s/(?P<path>.*)', shorten, name='shorten'),
    re_path('^S/(?P<link_id>[a-zA-Z0-9]+)/?$', follow, name='follow'),
    re_path('^$', browser, name='browser'),
]

if settings.URL_PREFIX.strip('/'):
    urlpatterns = [
        re_path(r'^{0}/'.format(settings.URL_PREFIX.strip('/')), include(graphite_urls)),
    ]
else:
    urlpatterns = graphite_urls

handler500 = 'graphite.views.server_error'
