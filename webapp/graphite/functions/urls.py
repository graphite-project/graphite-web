from django.conf.urls import url
from graphite.functions.views import functionList, functionDetails

urlpatterns = [
  url('^(.+)$', functionDetails, name='functionDetails'),
  url('', functionList, name='functionList'),
]
