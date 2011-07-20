from django.conf.urls.defaults import *

urlpatterns = patterns('graphite.dashboard.views',
  ('^save/(?P<name>[^/]+)', 'save'),
  ('^load/(?P<name>[^/]+)', 'load'),
  ('^delete/(?P<name>[^/]+)', 'delete'),
  ('^create-temporary/?', 'create_temporary'),
  ('^find/', 'find'),
  ('^help/', 'help'),
  ('^(?P<name>[^/]+)', 'dashboard'),
  ('', 'dashboard'),
)
