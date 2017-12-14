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
    url(r'^/login/?$', views.loginView, name='account_login'),
    url(r'^/logout/?$', views.logoutView, name='account_logout'),
    url(r'^/edit/?$', views.editProfile, name='account_edit'),
    url(r'^/update/?$', views.updateProfile, name='account_update'),
]
