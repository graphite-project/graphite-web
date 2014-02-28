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

from django.conf.urls import patterns, url, include
from django.conf import settings
from django.contrib import admin

admin.autodiscover()

urlpatterns = patterns('',
  url(r'^admin/', include(admin.site.urls)),
  url(r'^render$', 'graphite.render.views.renderView'),
  url(r'^render/', include('graphite.render.urls')),
  url(r'^cli$', 'graphite.cli.views.cli'),
  url(r'^cli/', include('graphite.cli.urls')),
  url(r'^composer$', 'graphite.composer.views.composer'),
  url(r'^composer/', include('graphite.composer.urls')),
  url(r'^metrics$', 'graphite.metrics.views.find_view'),
  url(r'^metrics/', include('graphite.metrics.urls')),
  url(r'^browser$', 'graphite.browser.views.browser'),
  url(r'^browser/', include('graphite.browser.urls')),
  url(r'^account/', include('graphite.account.urls')),
  url(r'^dashboard$', 'graphite.dashboard.views.dashboard'),
  url(r'^dashboard/', include('graphite.dashboard.urls')),
  url(r'^whitelist/?', include('graphite.whitelist.urls')),
  url(r'^content/(?P<path>.*)$', 'django.views.static.serve', {'document_root' : settings.CONTENT_DIR}),
  url(r'^graphlot$', 'graphite.graphlot.views.graphlot_render'),
  url(r'^graphlot/', include('graphite.graphlot.urls')),
  url(r'^version/?', include('graphite.version.urls')),
  url(r'^events$', 'graphite.events.views.view_events'),
  url(r'^events/', include('graphite.events.urls')),
  url(r'^/$', 'graphite.browser.views.browser'),
  url(r'^$', 'graphite.browser.views.browser'),
)

handler500 = 'graphite.views.server_error'
