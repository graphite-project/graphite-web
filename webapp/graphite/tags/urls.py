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

from django.urls import re_path
from . import views

urlpatterns = [
  re_path(r'^/tagSeries$', views.tagSeries, name='tagSeries'),
  re_path(r'^/tagMultiSeries$', views.tagMultiSeries, name='tagMultiSeries'),
  re_path(r'^/delSeries$', views.delSeries, name='delSeries'),
  re_path(r'^/findSeries$', views.findSeries, name='findSeries'),
  re_path(r'^/autoComplete/tags$', views.autoCompleteTags, name='tagAutoCompleteTags'),
  re_path(r'^/autoComplete/values$', views.autoCompleteValues, name='tagAutoCompleteValues'),
  re_path(r'^/(.+)$', views.tagDetails, name='tagDetails'),
  re_path(r'^/?$', views.tagList, name='tagList'),
]
