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

from django.shortcuts import render_to_response
from django.http import HttpResponse
from django.conf import settings
from web.account.models import Profile
from web.util import getProfile, getProfileByUsername
from web.logging import log


def header(request):
  "View for the header frame of the browser UI"
  context = {}
  context['user'] = request.user
  context['profile'] = getProfile(request)
  return render_to_response("browserHeader.html", context)

def sidebar(request):
  "View for the sidebar frame of the browser UI"
  context = dict( request.GET.items() )
  context['user'] = request.user
  context['profile'] = getProfile(request)
  return render_to_response("browserSidebar.html", context)

def browser(request):
  "View for the top-level frame of the browser UI"
  context = {
    'queryString' : '',
    'target' : request.GET.get('target')
  }
  for key in request.GET.keys():
    itemList = request.GET.getlist(key)
    for item in itemList:
      context['queryString'] += key+'='+item+'&'
  return render_to_response("browser.html", context) 

def lookup(request):
  "View that delegates to specialized lookup handlers"
  type = request.GET['lookupType']
  if type == 'tree':
    return treeLookup(request)
  elif type == 'mygraph':
    return myGraphLookup(request)
  elif type == 'usergraph':
    return userGraphLookup(request)
  else:
    raise ValueError("Invalid lookupType '%s'" % type)

def treeLookup(request):
  "Specialized lookup handler for metric tree navigation"
  profile = getProfile(request)
  nodes = []
  branchNode = {
    'allowDrag': 0,
    'allowChildren': 1,
    'expandable': 1,
    'leaf': 0,
    'lookupType': 'tree'
  }
  leafNode = {
    'allowDrag': 0,
    'allowChildren': 0,
    'expandable': 0,
    'leaf': 1,
    'lookupType': 'tree'
  }
  try:
    path = request.GET['nodeName']
    path = path[ path.find('.') + 1 :] #strip the initial "Graphite" node
    pattern = path + '.*' #we're interested in child nodes

    finder = settings.FINDER
    matches = list( finder.find(pattern) )
    matches.sort(key=lambda node: node.name)

    #Add a wildcard node if appropriate
    if len(matches) > 2 and profile.advancedUI:
      wildcardNode = {'text' : '*', 'id' : '*'}
      if any(not m.isLeaf() for m in matches):
        wildcardNode.update(branchNode)
      else:
        wildcardNode.update(leafNode)
      nodes.append(wildcardNode)

    inserted = set()
    for child in matches: #Now let's add the matching children
      if child.name in inserted: continue
      inserted.add(child.name)
      node = {'text' : child.name, 'id' : child.name}
      if node.isLeaf():
        node.update(leafNode)
      else node.isLeaf():
        node.update(branchNode)
      nodes.append(node)
  except:
    log.exception("browser.views.treeLookup(): could not complete request for %s" % fullPath)

  return json_response(nodes)


def myGraphLookup(request):
  "Specialized lookup handler for My Graphs"
  profile = getProfile(request,allowDefault=False)
  assert profile

  nodes = []
  leafNode = {
    'allowDrag' : 0,
    'allowChildren' : 0,
    'expandable' : 0,
    'leaf' : 1,
    'lookupType' : 'mygraph'
  }
  try:
    for graph in profile.mygraph_set.all().order_by('name'):
      node = {'text' : graph.name, 'id' : graph.name, 'graphUrl' : graph.url}
      node.update(leafNode)
      nodes.append(node)
  except:
    log.exception("browser.views.myGraphLookup(): could not complete request.")

  return json_response(nodes)

def userGraphLookup(request): #XXX
  "Specialized lookup handler for User Graphs"
  username = '/'.join( request.GET['nodeName'].split('.')[1:] ) #strip initial UserLookup/
  jsonData = []
  defaultDirNode = {'allowDrag':0,'allowChildren':1,'expandable':1,'leaf':0,'lookupRoute':'userLookup'}
  defaultFileNode = {'allowDrag':0,'allowChildren':0,'expandable':0,'leaf':1,'lookupRoute':'userLookup'}
  try:
    if not username:
      try:
        profiles = Profile.objects.exclude(username='default')
      except ObjectDoesNotExist:
        profiles = []
      for profile in profiles:
        if profile.mygraph_set.count():
	  jsonNode = {'text':profile.username,'id':profile.username}
	  jsonNode.update(defaultDirNode)
	  jsonData.append(jsonNode)
    else:
      profile = getProfileByUsername(username)
      try:
        assert profile
      except:
        log.exception("No profile for username '%s'" % username)
        raise
      for graph in profile.mygraph_set.all().order_by('name'):
        jsonNode = {'text':graph.name,'id':graph.name,'graphUrl':graph.url}
	jsonNode.update(defaultFileNode)
	jsonData.append(jsonNode)
    #nodes !
  except:
    log.exception("browser.views.userLookup(): could not complete request for %s" % username)
 
  return json_response(nodes)

def json_response(obj):
  json = str(obj) #poor man's json encoder for simple types
  response = HttpResponse(json,mimetype="application/json")
  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response
