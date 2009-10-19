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


def find(request):
  "View for finding metrics matching a given pattern"
  profile = getProfile(request)
  format = request.REQUEST.get('format', 'treejson')
  local_only = int( request.REQUEST('local', 0) )
  contexts = int( request.REQUEST('contexts', 0) )

  try:
    query = str( request.GET['query'] )
  except:
    return HttpResponseBadRequest(content="Missing required parameter 'query'", mimetype="text/plain")

  if local_only:
    matches = list( settings.LOCAL_STORE.find(query) )
  else:
    matches = list( settings.STORE.find(query) )

  log.info('find() query=%s local_only=%s matches=%d' % (query, local_only, len(matches)))
  matches.sort(key=lambda node: node.name)

  if format == 'treejson':
    content = tree_json(matches, wildcards=profile.advancedUI, contexts=contexts)
    response = HttpResponse(content, mimetype='text/json')

  elif format == 'pickle':
    content = pickle_nodes(matches, contexts=contexts)
    response = HttpResponse(content, mimetype='application/pickle')

  else:
    return HttpResponseBadRequest(content="Invalid value for 'format' parameter", mimetype="text/plain")

  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response


def tree_json(nodes, wildcards=False, contexts=False):
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
  if len(nodes) > 2 and wildcards:
    wildcardNode = {'text' : '*', 'id' : path_prefix + '*'}

    if any(not n.isLeaf() for n in nodes):
      wildcardNode.update(branchNode)

    else:
      wildcardNode.update(leafNode)

    results.append(wildcardNode)

  found = set()

  for node in nodes: #Now let's add the matching children
    if node.name in found:
      continue

    found.add(node.name)
    resultNode = {
      'text' : str(node.name),
      'id' : path_prefix + str(node.name),
      'context' : node.context if contexts else {},
    }

    if node.isLeaf():
      resultNode.update(leafNode)
    else:
      resultNode.update(branchNode)

    results.append(resultNode)

  return json.dumps(results)


def pickle_nodes(nodes, contexts=False):
  if contexts:
    return pickle.dumps([ { 'metric_path' : n.metric_path, 'context' : n.context } for n in nodes ])

  else:
    return pickle.dumps([ { 'metric_path' : n.metric_path } for n in nodes ])


def any(iterable): #python2.4 compatibility
  for i in iterable:
    if i:
      return True
  return False
