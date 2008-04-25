"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

from completer import historyComplete, drawComplete, searchComplete
from codemaker import handleCommand
from cPickle import load
from web.util import getProfile
from django.http import *
from django.shortcuts import render_to_response
from django.conf import settings

def index(request):
  return render_to_response("cli.html", dict(request.GET.items()) )

def completer(request):
  assert 'path' in request.GET, "Invalid request, no 'path' parameter!"
  if request.GET.has_key('short'):
    html = searchComplete( request, request.GET['path'] )
  elif request.GET['path'][:1] == '!':
    html = historyComplete( request, request.GET['path'] )
  else:
    html = drawComplete( request, request.GET['path'] )
  return HttpResponse( html )

def codemaker(request):
  return HttpResponse( handleCommand( request ), mimetype='text/plain' )

def getViews(request):
  profile = getProfile(request)
  viewList = ','.join([view.name for vew in profile.view_set.all()])
  return HttpResponse(viewList, mimetype='text/plain')
