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
from web.logger import log


def header(request):
  "View for the header frame of the browser UI"
  context = {}
  context['user'] = request.user
  context['profile'] = getProfile(request)
  return render_to_response("browserHeader.html", context)

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

def treeLookup(request):
  "View for Graphite tree navigation"
  profile = getProfile(request)
  nodes = []
  branchNode = {
    'allowChildren': 1,
    'expandable': 1,
    'leaf': 0,
  }
  leafNode = {
    'allowChildren': 0,
    'expandable': 0,
    'leaf': 1,
  }
  try:
    path = request.GET['path']
    if path:
      pattern = path + '.*' #we're interested in child nodes
      path_prefix = path + '.'
    else:
      pattern = '*'
      path_prefix = ''

    log.info('path=%s pattern=%s' % (path,pattern))

    finder = settings.FINDER
    matches = list( finder.find(pattern) )
    matches.sort(key=lambda node: node.name)

    #Add a wildcard node if appropriate
    if len(matches) > 2 and profile.advancedUI:
      wildcardNode = {'text' : '*', 'id' : path_prefix + '*'}
      if any(not m.isLeaf() for m in matches):
        wildcardNode.update(branchNode)
      else:
        wildcardNode.update(leafNode)
      nodes.append(wildcardNode)

    inserted = set()
    for child in matches: #Now let's add the matching children
      if child.name in inserted: continue
      inserted.add(child.name)
      node = {'text' : child.name, 'id' : path_prefix + child.name }
      if child.isLeaf():
        node.update(leafNode)
      else:
        node.update(branchNode)
      nodes.append(node)
  except:
    log.exception("browser.views.treeLookup(): could not complete request %s" % str(request.GET))

  return json_response(nodes)


def myGraphLookup(request):
  "View for My Graphs navigation"
  profile = getProfile(request,allowDefault=False)
  assert profile

  nodes = []
  leafNode = {
    'allowChildren' : 0,
    'expandable' : 0,
    'leaf' : 1,
  }
  try:
    for graph in profile.mygraph_set.all().order_by('name'):
      node = {'text' : graph.name, 'id' : graph.name, 'graphUrl' : graph.url}
      node.update(leafNode)
      nodes.append(node)
  except:
    log.exception("browser.views.myGraphLookup(): could not complete request.")

  if not nodes:
    no_graphs = { 'text' : "No saved graphs" }
    no_graphs.update(leafNode)
    nodes.append(no_graphs)

  return json_response(nodes)

def userGraphLookup(request):
  "View for User Graphs navigation"
  username = request.GET['path']
  nodes = []
  branchNode = {
    'allowChildren' : 1,
    'expandable' : 1,
    'leaf' : 0,
  }
  leafNode = {
    'allowChildren' : 0,
    'expandable' : 0,
    'leaf' : 1,
  }
  try:
    if not username:
      profiles = Profile.objects.exclude(username='default')
      for profile in profiles:
        if profile.mygraph_set.count():
          node = {'text' : profile.username, 'id' : profile.username}
          node.update(branchNode)
          nodes.append(node)
    else:
      profile = getProfileByUsername(username)
      assert profile, "No profile for username '%s'" % username

      for graph in profile.mygraph_set.all().order_by('name'):
        node = { 'text' : graph.name, 'id' : graph.name, 'graphUrl' : graph.url }
        node.update(leafNode)
        nodes.append(node)
  except:
    log.exception("browser.views.userLookup(): could not complete request for %s" % username)

  if not nodes:
    no_graphs = { 'text' : "No saved graphs" }
    no_graphs.update(leafNode)
    nodes.append(no_graphs)

  return json_response(nodes)

def json_response(obj):
  json = str(obj) #poor man's json encoder for simple types
  response = HttpResponse(json,mimetype="application/json")
  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response
