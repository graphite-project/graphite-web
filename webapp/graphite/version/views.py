# Create your views here.

from django.shortcuts import get_object_or_404, render_to_response
from django.http import HttpResponseRedirect, HttpResponse
from django.core.urlresolvers import reverse
from django.template import RequestContext
from graphite import settings

def index(request):
  return render_to_response('version.html', { 'version' : settings.WEBAPP_VERSION })


