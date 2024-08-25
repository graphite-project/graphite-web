from django.urls import path
from django.urls import re_path
from . import views

urlpatterns = [
    path('/save/<str:name>', views.save, name='dashboard_save'),
    path('/save_template/<str:name>/<str:key>', views.save_template, name='dashboard_save_template'),
    path('/load/<str:name>', views.load, name='dashboard_load'),
    path('/load/<str:name>/<str:val>', views.load_template, name='dashboard_load_template'),
    path('/load_template/<str:name>/<str:val>', views.load_template, name='dashboard_load_template'),
    path('/delete/<str:name>', views.delete, name='dashboard_delete'),
    re_path(r'^/create-temporary/?$', views.create_temporary, name='dashboard_create_temporary'),
    path('/email', views.email, name='dashboard_email'),
    re_path(r'^/find/?$', views.find, name='dashboard_find'),
    path('/delete_template/<str:name>', views.delete_template, name='dashboard_delete_template'),
    re_path(r'^/find_template/?$', views.find_template, name='dashboard_find_template'),
    re_path(r'^/login/?$', views.user_login, name='dashboard_login'),
    re_path(r'^/logout/?$', views.user_logout, name='dashboard_logout'),
    re_path(r'^/help/?$', views.help, name='dashboard_help'),
    path('/<str:name>/<str:val>', views.template, name='dashboard_template'),
    path('/<str:name>', views.dashboard, name='dashboard'),
    re_path(r'^/?$', views.dashboard, name='dashboard'),
]
