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
from django.contrib import admin
from django.urls import include, path, re_path
from graphite.url_shortener.views import shorten, follow
from graphite.browser.views import browser

graphite_urls = [
    path('admin/', admin.site.urls),
    path('render', include('graphite.render.urls')),
    path('composer', include('graphite.composer.urls')),
    path('metrics', include('graphite.metrics.urls')),
    path('browser', include('graphite.browser.urls')),
    path('account', include('graphite.account.urls')),
    path('dashboard', include('graphite.dashboard.urls')),
    path('whitelist', include('graphite.whitelist.urls')),
    path('version', include('graphite.version.urls')),
    path('events', include('graphite.events.urls')),
    path('tags', include('graphite.tags.urls')),
    path('functions', include('graphite.functions.urls')),
    re_path('^s/(?P<path>.*)', shorten, name='shorten'),
    re_path('^S/(?P<link_id>[a-zA-Z0-9]+)/?$', follow, name='follow'),
    path('', browser, name='browser'),
]

url_prefix = settings.URL_PREFIX.strip('/')
if url_prefix:
    urlpatterns = [
        re_path(f'^{url_prefix}/', include(graphite_urls)),
    ]
else:
    urlpatterns = graphite_urls

handler500 = 'graphite.views.server_error'
