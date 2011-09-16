from django.shortcuts import render_to_response
from graphite import settings


def index(request):
  context = {
    'version' : settings.WEBAPP_VERSION,
  }
  return render_to_response('version.html', context)
