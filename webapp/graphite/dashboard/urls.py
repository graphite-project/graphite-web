from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^/save/(?P<name>[^/]+)$', views.save, name='dashboard_save'),
    url(r'^/save_template/(?P<name>[^/]+)/(?P<key>[^/]+)$', views.save_template,
        name='dashboard_save_template'),
    url(r'^/load/(?P<name>[^/]+)$', views.load, name='dashboard_load'),
    url(r'^/load/(?P<name>[^/]+)/(?P<val>[^/]+)$', views.load_template,
        name='dashboard_load_template'),
    url(r'^/load_template/(?P<name>[^/]+)/(?P<val>[^/]+)$', views.load_template,
        name='dashboard_load_template'),
    url(r'^/delete/(?P<name>[^/]+)$', views.delete, name='dashboard_delete'),
    url(r'^/create-temporary/?$', views.create_temporary, name='dashboard_create_temporary'),
    url(r'^/email$', views.email, name='dashboard_email'),
    url(r'^/find/?$', views.find, name='dashboard_find'),
    url(r'^/delete_template/(?P<name>[^/]+)$', views.delete_template,
        name='dashboard_delete_template'),
    url(r'^/find_template/?$', views.find_template, name='dashboard_find_template'),
    url(r'^/login/?$', views.user_login, name='dashboard_login'),
    url(r'^/logout/?$', views.user_logout, name='dashboard_logout'),
    url(r'^/help/?$', views.help, name='dashboard_help'),
    url(r'^/(?P<name>[^/]+)/(?P<val>[^/]+)$', views.template, name='dashboard_template'),
    url(r'^/(?P<name>[^/]+)$', views.dashboard, name='dashboard'),
    url(r'^/?$', views.dashboard, name='dashboard'),
]
