from django.urls import re_path
from . import views

urlpatterns = [
    re_path(r'^/save/(?P<name>[^/]+)$', views.save, name='dashboard_save'),
    re_path(r'^/save_template/(?P<name>[^/]+)/(?P<key>[^/]+)$', views.save_template,
        name='dashboard_save_template'),
    re_path(r'^/load/(?P<name>[^/]+)$', views.load, name='dashboard_load'),
    re_path(r'^/load/(?P<name>[^/]+)/(?P<val>[^/]+)$', views.load_template,
        name='dashboard_load_template'),
    re_path(r'^/load_template/(?P<name>[^/]+)/(?P<val>[^/]+)$', views.load_template,
        name='dashboard_load_template'),
    re_path(r'^/delete/(?P<name>[^/]+)$', views.delete, name='dashboard_delete'),
    re_path(r'^/create-temporary/?$', views.create_temporary, name='dashboard_create_temporary'),
    re_path(r'^/email$', views.email, name='dashboard_email'),
    re_path(r'^/find/?$', views.find, name='dashboard_find'),
    re_path(r'^/delete_template/(?P<name>[^/]+)$', views.delete_template,
        name='dashboard_delete_template'),
    re_path(r'^/find_template/?$', views.find_template, name='dashboard_find_template'),
    re_path(r'^/login/?$', views.user_login, name='dashboard_login'),
    re_path(r'^/logout/?$', views.user_logout, name='dashboard_logout'),
    re_path(r'^/help/?$', views.help, name='dashboard_help'),
    re_path(r'^/(?P<name>[^/]+)/(?P<val>[^/]+)$', views.template, name='dashboard_template'),
    re_path(r'^/(?P<name>[^/]+)$', views.dashboard, name='dashboard'),
    re_path(r'^/?$', views.dashboard, name='dashboard'),
]
