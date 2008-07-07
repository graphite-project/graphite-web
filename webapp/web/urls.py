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

urlpatterns = patterns('',
  ('^admin/', include('django.contrib.admin.urls')),
  ('^render/?', include('web.render.urls')),
  ('^cli/?', include('web.cli.urls')),
  ('^composer/?', include('web.composer.urls')),
  ('^browser/?', include('web.browser.urls')),
  ('^account/?', include('web.account.urls')),
  ('^content/(?P<path>.*)$', 'django.views.static.serve', {'document_root' : settings.CONTENT_DIR}),
  ('', include('web.browser.urls')),
)
