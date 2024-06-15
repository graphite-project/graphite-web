from django.urls import re_path
from graphite.functions.views import functionList, functionDetails

urlpatterns = [
  re_path(r'^/(.+)$', functionDetails, name='functionDetails'),
  re_path(r'^/?$', functionList, name='functionList'),
]
