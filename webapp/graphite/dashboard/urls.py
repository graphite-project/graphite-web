from django.conf.urls import patterns, url

urlpatterns = patterns('graphite.dashboard.views',
  url(r'^save/(?P<name>[^/]+)', 'save'),
  url(r'^load/(?P<name>[^/]+)', 'load'),
  url(r'^delete/(?P<name>[^/]+)', 'delete'),
  url(r'^create-temporary/?', 'create_temporary'),
  url(r'^email', 'email'),
  url(r'^find/', 'find'),
  url(r'^login/?', 'user_login'),
  url(r'^logout/?', 'user_logout'),
  url(r'^help/', 'help'),
  url(r'^(?P<name>[^/]+)', 'dashboard'),
  url('', 'dashboard'),
)
