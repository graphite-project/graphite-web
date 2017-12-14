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

from django.conf.urls import url
from . import views

urlpatterns = [
  url(r'^/tagSeries$', views.tagSeries, name='tagSeries'),
  url(r'^/tagMultiSeries$', views.tagMultiSeries, name='tagMultiSeries'),
  url(r'^/delSeries$', views.delSeries, name='delSeries'),
  url(r'^/findSeries$', views.findSeries, name='findSeries'),
  url(r'^/autoComplete/tags$', views.autoCompleteTags, name='tagAutoCompleteTags'),
  url(r'^/autoComplete/values$', views.autoCompleteValues, name='tagAutoCompleteValues'),
  url(r'^/(.+)$', views.tagDetails, name='tagDetails'),
  url(r'^/?$', views.tagList, name='tagList'),
]
