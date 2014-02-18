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

from django.conf.urls import patterns, url

urlpatterns = patterns('graphite.metrics.views',
  url(r'^index\.json$', 'index_json'),
  url(r'^search/?$', 'search_view'),
  url(r'^find/?$', 'find_view'),
  url(r'^expand/?$', 'expand_view'),
  url(r'^get-metadata/?$', 'get_metadata_view'),
  url(r'^set-metadata/?$', 'set_metadata_view'),
  url('', 'find_view'),
)
