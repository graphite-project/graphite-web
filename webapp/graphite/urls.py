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
from django.conf.urls import patterns, include, url
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns

admin.autodiscover()

graphite_urls = patterns(
    '',
    ('^admin/', include(admin.site.urls)),
    ('^render/?', include('graphite.render.urls')),
    ('^cli/?', include('graphite.cli.urls')),
    ('^composer/?', include('graphite.composer.urls')),
    ('^metrics/?', include('graphite.metrics.urls')),
    ('^browser/?', include('graphite.browser.urls')),
    ('^account/', include('graphite.account.urls')),
    ('^dashboard/?', include('graphite.dashboard.urls')),
    ('^whitelist/?', include('graphite.whitelist.urls')),
    ('^graphlot/', include('graphite.graphlot.urls')),
    ('^version/', include('graphite.version.urls')),
    ('^events/', include('graphite.events.urls')),
    url('^$', 'graphite.browser.views.browser', name='browser'),
)
graphite_urls += staticfiles_urlpatterns()

urlpatterns = patterns(
    '',
    (r'^{0}/'.format(settings.URL_PREFIX.strip('/')),
     include(graphite_urls)),
)

handler500 = 'graphite.views.server_error'
