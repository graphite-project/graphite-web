"""Copyright 2009 Chris Davis

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

from django.http import HttpResponse, HttpResponseBadRequest
from django.conf import settings
from graphite.account.models import Profile
from graphite.util import getProfile, getProfileByUsername, defaultUser
from graphite.logger import log
try:
  import cPickle as pickle
except ImportError:
  import pickle


def find(request, local_only=False):
  "View for finding metrics matching a given pattern"
  profile = getProfile(request)
  format = request.REQUEST.get('format', 'treejson')

  try:
    query = str( request.GET['query'] )
  except:
    return HttpResponseBadRequest(content="Missing required parameter 'query'", mimetype="text/plain")

  if local_only:
    matches = list( settings.LOCAL_STORE.find(query) )
  else:
    matches = list( settings.STORE.find(query) )

  log.info('find() query=%s local_only=%s matches=%d' % (query, bool(local_only), len(matches)))
  matches.sort(key=lambda node: node.name)

  if format == 'treejson':
    response = HttpResponse(content=tree_json(matches, profile.advancedUI), mimetype='text/json')

  elif format == 'pickle':
    response = HttpResponse(content=pickle_nodes(matches), mimetype='application/pickle')

  else:
    return HttpResponseBadRequest(content="Invalid value for 'format' parameter", mimetype="text/plain")

  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response


def tree_json(nodes, include_wildcards=False):
  results = []

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

  if nodes:
    path_prefix = nodes[0].metric_path.rsplit('.', 1)[0] + '.'

  else:
    path_prefix = ''

  #Add a wildcard node if appropriate
  if len(nodes) > 2 and include_wildcards:
    wildcardNode = {'text' : '*', 'id' : path_prefix + '*'}

    if any(not n.isLeaf() for n in nodes):
      wildcardNode.update(branchNode)

    else:
      wildcardNode.update(leafNode)

    results.append(wildcardNode)

  try:
    inserted = set()

    for child in matches: #Now let's add the matching children
      if child.name in inserted:
        continue

      inserted.add(child.name)
      node = {'text' : str(child.name), 'id' : path_prefix + str(child.name) }

      if child.isLeaf():
        node.update(leafNode)

      else:
        node.update(branchNode)

      nodes.append(node)

  except:
    log.exception("browser.views.treeLookup(): could not complete request %s" % str(request.GET))

  #Fetch contexts
  for node in nodes:
    node['context'] = getMetricContext[ node['id'] ]

  return 'json encoded nodes object' #XXX


def any(iterable): #python2.4 compatibility
  for i in iterable:
    if i:
      return True
  return False
