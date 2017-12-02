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

import re

from django.conf import settings
from django.shortcuts import render_to_response
from django.utils.safestring import mark_safe
from django.utils.html import escape
from graphite.account.models import Profile
from graphite.compat import HttpResponse
from graphite.user_util import getProfile, getProfileByUsername
from graphite.util import json
from graphite.logger import log
from hashlib import md5
from six.moves.urllib.parse import urlencode, urlparse, parse_qsl


def header(request):
  "View for the header frame of the browser UI"
  context = {}
  context['user'] = request.user
  context['profile'] = getProfile(request)
  context['documentation_url'] = settings.DOCUMENTATION_URL
  context['login_url'] = settings.LOGIN_URL
  return render_to_response("browserHeader.html", context)


def browser(request):
  "View for the top-level frame of the browser UI"
  context = {
    'queryString': mark_safe(request.GET.urlencode()),
    'target': request.GET.get('target')
  }
  if context['queryString']:
    context['queryString'] = context['queryString'].replace('#','%23')
  if context['target']:
    context['target'] = context['target'].replace('#','%23') #js libs terminate a querystring on #
  return render_to_response("browser.html", context)


def search(request):
  query = request.POST.get('query')
  if not query:
    return HttpResponse("")

  patterns = query.split()
  regexes = [re.compile(p,re.I) for p in patterns]

  def matches(s):
    for regex in regexes:
      if regex.search(s):
        return True
    return False

  results = []

  index_file = open(settings.INDEX_FILE)
  for line in index_file:
    if matches(line):
      results.append( line.strip() )
    if len(results) >= 100:
      break

  index_file.close()
  result_string = ','.join(results)
  return HttpResponse(result_string, content_type='text/plain')


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
  branchNode = {
    'allowChildren' : 1,
    'expandable' : 1,
    'leaf' : 0,
  }

  try:
    path = request.GET.get('path', u'')

    if path:
      if path.endswith('.'):
        userpath_prefix = path

      else:
        userpath_prefix = path + '.'

    else:
      userpath_prefix = u""

    matches = [ graph for graph in profile.mygraph_set.all().order_by('name') if graph.name.startswith(userpath_prefix) ]

    log.info( "myGraphLookup: username=%s, path=%s, userpath_prefix=%s, %ld graph to process" % (profile.user.username, path, userpath_prefix, len(matches)) )
    branch_inserted = set()
    leaf_inserted = set()

    for graph in matches: #Now let's add the matching graph
      isBranch = False
      dotPos = graph.name.find( '.', len(userpath_prefix) )

      if dotPos >= 0:
        isBranch = True
        name = graph.name[ len(userpath_prefix) : dotPos ]
        if name in branch_inserted: continue
        branch_inserted.add(name)

      else:
         name = graph.name[ len(userpath_prefix): ]
         if name in leaf_inserted: continue
         leaf_inserted.add(name)

      node = {'text': escape(name)}

      if isBranch:
        node.update({'id': userpath_prefix + name + '.'})
        node.update(branchNode)

      else:
        m = md5()
        m.update(name.encode('utf-8'))

        # Sanitize target
        urlEscaped = str(graph.url)
        graphUrl = urlparse(urlEscaped)
        graphUrlParams = {}
        graphUrlParams['target'] = []
        for param in parse_qsl(graphUrl.query):
          if param[0] != 'target':
            graphUrlParams[param[0]] = param[1]
          else:
            graphUrlParams[param[0]].append(escape(param[1]))
        urlEscaped = graphUrl._replace(query=urlencode(graphUrlParams, True)).geturl()
        node.update( { 'id' : str(userpath_prefix + m.hexdigest()), 'graphUrl' : urlEscaped } )
        node.update(leafNode)

      nodes.append(node)

  except:
    log.exception("browser.views.myGraphLookup(): could not complete request.")

  if not nodes:
    no_graphs = { 'text' : "No saved graphs", 'id' : 'no-click' }
    no_graphs.update(leafNode)
    nodes.append(no_graphs)

  return json_response(nodes, request)

def userGraphLookup(request):
  "View for User Graphs navigation"
  user = request.GET.get('user')
  path = request.GET['path']

  if user:
    username = user
    graphPath = path[len(username)+1:]
  elif '.' in path:
    username, graphPath = path.split('.', 1)
  else:
    username, graphPath = path, None

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
      profiles = Profile.objects.exclude(user__username='default').order_by('user__username')

      for profile in profiles:
        if profile.mygraph_set.count():
          node = {
            'text' : profile.user.username,
            'id' : profile.user.username,
          }

          node.update(branchNode)
          nodes.append(node)

    else:
      profile = getProfileByUsername(username)
      assert profile, "No profile for username '%s'" % username

      if graphPath:
        prefix = graphPath.rstrip('.') + '.'
      else:
        prefix = ''

      matches = [ graph for graph in profile.mygraph_set.order_by('name') if graph.name.startswith(prefix) ]
      inserted = set()

      for graph in matches:
        relativePath = graph.name[ len(prefix): ]
        nodeName = relativePath.split('.')[0]

        if nodeName in inserted:
          continue
        inserted.add(nodeName)

        if '.' in relativePath: # branch
          node = {
            'text' : escape(nodeName),
            'id' : username + '.' + prefix + nodeName + '.',
          }
          node.update(branchNode)
        else: # leaf
          m = md5()
          m.update(nodeName.encode('utf-8'))

          # Sanitize target
          urlEscaped = str(graph.url)
          graphUrl = urlparse(urlEscaped)
          graphUrlParams = {}
          graphUrlParams['target'] = []
          for param in parse_qsl(graphUrl.query):
            if param[0] != 'target':
              graphUrlParams[param[0]] = param[1]
            else:
              graphUrlParams[param[0]].append(escape(param[1]))
          urlEscaped = graphUrl._replace(query=urlencode(graphUrlParams, True)).geturl()

          node = {
            'text' : escape(nodeName),
            'id' : username + '.' + prefix + m.hexdigest(),
            'graphUrl' : urlEscaped,
          }
          node.update(leafNode)

        nodes.append(node)

  except:
    log.exception("browser.views.userLookup(): could not complete request for %s" % username)

  if not nodes:
    no_graphs = { 'text' : "No saved graphs", 'id' : 'no-click' }
    no_graphs.update(leafNode)
    nodes.append(no_graphs)

  nodes.sort(key=lambda node: node['allowChildren'], reverse = True)

  return json_response(nodes, request)


def json_response(nodes, request=None):
  if request:
    jsonp = request.GET.get('jsonp', False) or request.POST.get('jsonp', False)
  else:
    jsonp = False
  #json = str(nodes) #poor man's json encoder for simple types
  json_data = json.dumps(nodes)
  if jsonp:
    response = HttpResponse("%s(%s)" % (jsonp, json_data),
                            content_type="text/javascript")
  else:
    response = HttpResponse(json_data, content_type="application/json")
  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response
