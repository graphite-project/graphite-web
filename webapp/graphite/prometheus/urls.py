from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^/read/?$', views.renderPrometheus, name='render_prometheus'),
]
