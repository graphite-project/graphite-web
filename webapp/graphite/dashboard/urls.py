from django.conf.urls import *

urlpatterns = patterns('graphite.dashboard.views',
  ('^save/(?P<name>[^/]+)', 'save'),
  ('^load/(?P<name>[^/]+)', 'load'),
  ('^delete/(?P<name>[^/]+)', 'delete'),
  ('^create-temporary/?', 'create_temporary'),
  ('^email', 'email'),
  ('^find/', 'find'),
  ('^login/?', 'user_login'),
  ('^logout/?', 'user_logout'),
  ('^help/', 'help'),
  ('^(?P<name>[^/]+)', 'dashboard'),
  ('', 'dashboard'),
)
