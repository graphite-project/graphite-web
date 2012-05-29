"""Copyright 2009 Chris Davis

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

urlpatterns = patterns('graphite.metrics.views',
  ('^index\.json$', 'index_json'),
  ('^search/?$', 'search_view'),
  ('^find/?$', 'find_view'),
  ('^expand/?$', 'expand_view'),
  ('^get-metadata/?$', 'get_metadata_view'),
  ('^set-metadata/?$', 'set_metadata_view'),
  ('', 'find_view'),
)
