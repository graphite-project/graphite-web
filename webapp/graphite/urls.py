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

from django.conf.urls.defaults import *
from django.conf import settings
from django.contrib import admin

admin.autodiscover()

urlpatterns = patterns('',
  ('^admin/', include(admin.site.urls)),
  ('^render/?', include('graphite.render.urls')),
  ('^cli/?', include('graphite.cli.urls')),
  ('^composer/?', include('graphite.composer.urls')),
  ('^metrics/?', include('graphite.metrics.urls')),
  ('^browser/?', include('graphite.browser.urls')),
  ('^account/?', include('graphite.account.urls')),
  ('^dashboard/?', include('graphite.dashboard.urls')),
  ('^whitelist/?', include('graphite.whitelist.urls')),
  ('^content/(?P<path>.*)$', 'django.views.static.serve', {'document_root' : settings.CONTENT_DIR}),
  ('graphlot/', include('graphite.graphlot.urls')),
  ('^version/', include('graphite.version.urls')),
  ('^events/', include('graphite.events.urls')),
  ('', 'graphite.browser.views.browser'),
)

handler500 = 'graphite.views.server_error'
