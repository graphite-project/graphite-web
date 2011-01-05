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

import traceback
from django.http import HttpResponse, HttpResponseBadRequest
from django.conf import settings
from graphite.account.models import Profile
from graphite.util import getProfile, getProfileByUsername, defaultUser, json
from graphite.logger import log
from graphite.storage import STORE, LOCAL_STORE

try:
  import cPickle as pickle
except ImportError:
  import pickle


def context_view(request):
  if request.method == 'GET':
    contexts = []

    if not 'metric' not in request.GET:
      return HttpResponse('{ "error" : "missing required parameter \"metric\"" }', mimetype='text/json')

    for metric in request.GET.getlist('metric'):
      try:
        context = STORE.get(metric).context
      except:
        contexts.append({ 'metric' : metric, 'error' : 'failed to retrieve context', 'traceback' : traceback.format_exc() })
      else:
        contexts.append({ 'metric' : metric, 'context' : context })

    content = json.dumps( { 'contexts' : contexts } )
    return HttpResponse(content, mimetype='text/json')

  elif request.method == 'POST':

    if 'metric' not in request.POST:
      return HttpResponse('{ "error" : "missing required parameter \"metric\"" }', mimetype='text/json')

    newContext = dict( item for item in request.POST.items() if item[0] != 'metric' )

    for metric in request.POST.getlist('metric'):
      STORE.get(metric).updateContext(newContext)

    return HttpResponse('{ "success" : true }', mimetype='text/json')

  else:
    return HttpResponseBadRequest("invalid method, must be GET or POST")


def find_view(request):
  "View for finding metrics matching a given pattern"
  profile = getProfile(request)
  format = request.REQUEST.get('format', 'treejson')
  local_only = int( request.REQUEST.get('local', 0) )
  contexts = int( request.REQUEST.get('contexts', 0) )
  wildcards = int( request.REQUEST.get('wildcards', 0) )

  try:
    query = str( request.REQUEST['query'] )
  except:
    return HttpResponseBadRequest(content="Missing required parameter 'query'", mimetype="text/plain")

  if '.' in query:
    base_path = query.rsplit('.', 1)[0] + '.'
  else:
    base_path = ''

  if local_only:
    store = LOCAL_STORE
  else:
    store = STORE

  matches = list( store.find(query) )

  log.info('find_view query=%s local_only=%s matches=%d' % (query, local_only, len(matches)))
  matches.sort(key=lambda node: node.name)

  if format == 'treejson':
    content = tree_json(matches, base_path, wildcards=profile.advancedUI or wildcards, contexts=contexts)
    response = HttpResponse(content, mimetype='text/json')

  elif format == 'pickle':
    content = pickle_nodes(matches, contexts=contexts)
    response = HttpResponse(content, mimetype='application/pickle')

  elif format == 'completer':
    if len(matches) == 1 and (not matches[0].isLeaf()) and query == matches[0].metric_path + '*': # auto-complete children
      matches = list( store.find(query + '.*') )

    content = json.dumps({ 'metrics' : [ dict(path=node.metric_path, name=node.name) for node in matches ] })
    response = HttpResponse(content, mimetype='text/json')

  else:
    return HttpResponseBadRequest(content="Invalid value for 'format' parameter", mimetype="text/plain")

  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response


def tree_json(nodes, base_path, wildcards=False, contexts=False):
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

  #Add a wildcard node if appropriate
  if len(nodes) > 1 and wildcards:
    wildcardNode = {'text' : '*', 'id' : base_path + '*'}

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
      'id' : base_path + str(node.name),
    }

    if contexts:
      resultNode['context'] = node.context
    else:
      resultNode['context'] = {}

    if node.isLeaf():
      resultNode.update(leafNode)
    else:
      resultNode.update(branchNode)

    results.append(resultNode)

  return json.dumps(results)


def pickle_nodes(nodes, contexts=False):
  if contexts:
    return pickle.dumps([ { 'metric_path' : n.metric_path, 'isLeaf' : n.isLeaf(), 'context' : n.context } for n in nodes ])

  else:
    return pickle.dumps([ { 'metric_path' : n.metric_path, 'isLeaf' : n.isLeaf() } for n in nodes ])


def any(iterable): #python2.4 compatibility
  for i in iterable:
    if i:
      return True
  return False
