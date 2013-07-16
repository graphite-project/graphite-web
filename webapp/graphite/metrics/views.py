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

import re
import traceback
from django.http import HttpResponse, HttpResponseBadRequest
from django.conf import settings
from graphite.account.models import Profile
from graphite.util import getProfile, getProfileByUsername, defaultUser, json
from graphite.logger import log
from graphite.storage import STORE, LOCAL_STORE, RRDFile
from graphite.metrics.search import searcher
from graphite.render.datalib import CarbonLink
from graphite.jobs import get_jobs, get_nodes
import fnmatch, os

try:
  import cPickle as pickle
except ImportError:
  import pickle


# link-compatible walk since we frequently symlink RRD_DIR
# and python < 2.6.0 doesn't suppport os.walk followlinks
def do_walk_rrd_dirs(start_path, matches=None):
  if matches == None:
    matches = []
  for root, dirs, files in os.walk(start_path):
    for dir in dirs:
      if os.path.islink(os.path.join(root,dir)):
        do_walk_rrd_dirs(os.path.join(root,dir), matches)
    root = root.replace(settings.RRD_DIR, '')
    for basename in files:
      if fnmatch.fnmatch(basename, '*.rrd'):
        absolute_path = os.path.join(settings.RRD_DIR, root, basename)
        (basename,extension) = os.path.splitext(basename)
        metric_path = os.path.join(root, basename)
        rrd = RRDFile(absolute_path, metric_path)
        for datasource_name in rrd.getDataSources():
          matches.append(os.path.join(metric_path, datasource_name.name))
  return matches

def index_json(request):
  jsonp = request.REQUEST.get('jsonp', False)
  matches = []

  for root, dirs, files in os.walk(settings.WHISPER_DIR):
    root = root.replace(settings.WHISPER_DIR, '')
    for basename in files:
      if fnmatch.fnmatch(basename, '*.wsp'):
        matches.append(os.path.join(root, basename))

  for match in do_walk_rrd_dirs(settings.RRD_DIR):
    matches.append(match)

  matches = [
    m
    .replace('.wsp', '')
    .replace('.rrd', '')
    .replace('/', '.')
    .lstrip('.')
    for m in sorted(matches)
  ]
  if jsonp:
    return HttpResponse("%s(%s)" % (jsonp, json.dumps(matches)), mimetype='text/javascript')
  else:
    return HttpResponse(json.dumps(matches), mimetype='application/json')


def search_view(request):
  try:
    query = str( request.REQUEST['query'] )
  except:
    return HttpResponseBadRequest(content="Missing required parameter 'query'", mimetype="text/plain")
  search_request = {
    'query' : query,
    'max_results' : int( request.REQUEST.get('max_results', 25) ),
    'keep_query_pattern' : int(request.REQUEST.get('keep_query_pattern', 0)),
  }
  #if not search_request['query'].endswith('*'):
  #  search_request['query'] += '*'

  results = sorted(searcher.search(**search_request))
  result_data = json.dumps( dict(metrics=results) )
  return HttpResponse(result_data, mimetype='application/json')


def context_view(request):
  if request.method == 'GET':
    contexts = []

    if not 'metric' not in request.GET:
      return HttpResponse('{ "error" : "missing required parameter \"metric\"" }', mimetype='application/json')

    for metric in request.GET.getlist('metric'):
      try:
        context = STORE.get(metric).context
      except:
        contexts.append({ 'metric' : metric, 'error' : 'failed to retrieve context', 'traceback' : traceback.format_exc() })
      else:
        contexts.append({ 'metric' : metric, 'context' : context })

    content = json.dumps( { 'contexts' : contexts } )
    return HttpResponse(content, mimetype='application/json')

  elif request.method == 'POST':

    if 'metric' not in request.POST:
      return HttpResponse('{ "error" : "missing required parameter \"metric\"" }', mimetype='application/json')

    newContext = dict( item for item in request.POST.items() if item[0] != 'metric' )

    for metric in request.POST.getlist('metric'):
      STORE.get(metric).updateContext(newContext)

    return HttpResponse('{ "success" : true }', mimetype='application/json')

  else:
    return HttpResponseBadRequest("invalid method, must be GET or POST")


def find_view(request):
  "View for finding metrics matching a given pattern"
  profile = getProfile(request)
  format = request.REQUEST.get('format', 'treejson')
  local_only = int( request.REQUEST.get('local', 0) )
  contexts = int( request.REQUEST.get('contexts', 0) )
  wildcards = int( request.REQUEST.get('wildcards', 0) )
  automatic_variants = int( request.REQUEST.get('automatic_variants', 0) )

  try:
    query = str( request.REQUEST['query'] )
  except:
    return HttpResponseBadRequest(content="Missing required parameter 'query'", mimetype="text/plain")

  job = ''

  if query == "*": # Base query, add the job names to the filetree
    matches = get_jobs(request.user, 25)

    content = tree_jobs(matches)
    response = HttpResponse(content, mimetype='application/json')
    return response;

  elif '.' not in query:
    """
    We're looking at a composer query that searches for jobs; format PartialJob*; eg Blast*
    Lets search if one or more of our nodes match and return them.
    """
    results = []

    regex = re.compile(query[:-1], re.I)

    for line in get_jobs(request.user):
      line = str(line)
      if regex.search(line):
        node_info = dict(path=line, name=line, is_leaf='0')
        node_info['path'] += '.'
        results.append(node_info)
      if len(results) >= 100:
        break

    content = json.dumps({ 'metrics' : results })

    response = HttpResponse(content, mimetype='application/json')
    return response;

  else: # We're looking at a job, split the job name temporary from the query

    job = query.split('.', 1)[0]
    query = query.split('.', 1)[1]

    if '.' in query:
      base_path = job + '.' + query.rsplit('.', 1)[0] + '.' # Add the job name back so it's fetchable in future requests
    else:
      base_path = job + '.'                                 # Add the job name back so it's fetchable in future requests

    if local_only:
      store = LOCAL_STORE
    else:
      store = STORE

    if format == 'completer':
      query = query.replace('..', '*.')
      if not query.endswith('*'):
        query += '*'

      if automatic_variants:
        query_parts = query.split('.')
        for i,part in enumerate(query_parts):
          if ',' in part and '{' not in part:
            query_parts[i] = '{%s}' % part
        query = '.'.join(query_parts)

    try:
      # Added an extra argument with the job name so we can filter the returning nodes later on
      matches = list( store.find(query, get_nodes(job)) )
    except:
      log.exception()
      raise


  log.info('find_view query=%s local_only=%s matches=%d' % (query, local_only, len(matches)))
  matches.sort(key=lambda node: node.name)

  if format == 'treejson':
    content = tree_json(matches, base_path, wildcards=profile.advancedUI or wildcards, contexts=contexts)
    response = HttpResponse(content, mimetype='application/json')

  elif format == 'pickle':
    content = pickle_nodes(matches, contexts=contexts)
    response = HttpResponse(content, mimetype='application/pickle')

  elif format == 'completer':
    #if len(matches) == 1 and (not matches[0].isLeaf()) and query == matches[0].metric_path + '*': # auto-complete children
    #  matches = list( store.find(query + '.*') )
    results = []
    for node in matches:
      node_info = dict(path=job + "." + node.metric_path, name=node.name, is_leaf=str(int(node.isLeaf())))
      if not node.isLeaf():
        node_info['path'] += '.'
      results.append(node_info)

    if len(results) > 1 and wildcards:
      wildcardNode = {'name' : '*'}
      results.append(wildcardNode)

    content = json.dumps({ 'metrics' : results })
    response = HttpResponse(content, mimetype='application/json')

  else:
    return HttpResponseBadRequest(content="Invalid value for 'format' parameter", mimetype="text/plain")

  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response


def expand_view(request):
  "View for expanding a pattern into matching metric paths"
  local_only    = int( request.REQUEST.get('local', 0) )
  group_by_expr = int( request.REQUEST.get('groupByExpr', 0) )
  leaves_only   = int( request.REQUEST.get('leavesOnly', 0) )

  if local_only:
    store = LOCAL_STORE
  else:
    store = STORE

  results = {}
  for query in request.REQUEST.getlist('query'):
    results[query] = set()
    for node in store.find(query):
      if node.isLeaf() or not leaves_only:
        results[query].add( node.metric_path )

  # Convert our results to sorted lists because sets aren't json-friendly
  if group_by_expr:
    for query, matches in results.items():
      results[query] = sorted(matches)
  else:
    results = sorted( reduce(set.union, results.values(), set()) )

  result = {
    'results' : results
  }

  response = HttpResponse(json.dumps(result), mimetype='application/json')
  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response


def get_metadata_view(request):
  key = request.REQUEST['key']
  metrics = request.REQUEST.getlist('metric')
  results = {}
  for metric in metrics:
    try:
      results[metric] = CarbonLink.get_metadata(metric, key)
    except:
      log.exception()
      results[metric] = dict(error="Unexpected error occurred in CarbonLink.get_metadata(%s, %s)" % (metric, key))

  return HttpResponse(json.dumps(results), mimetype='application/json')


def set_metadata_view(request):
  results = {}

  if request.method == 'GET':
    metric = request.GET['metric']
    key = request.GET['key']
    value = request.GET['value']
    try:
      results[metric] = CarbonLink.set_metadata(metric, key, value)
    except:
      log.exception()
      results[metric] = dict(error="Unexpected error occurred in CarbonLink.set_metadata(%s, %s)" % (metric, key))

  elif request.method == 'POST':
    if request.META.get('CONTENT_TYPE') == 'application/json':
      operations = json.loads( request.raw_post_data )
    else:
      operations = json.loads( request.POST['operations'] )

    for op in operations:
      metric = None
      try:
        metric, key, value = op['metric'], op['key'], op['value']
        results[metric] = CarbonLink.set_metadata(metric, key, value)
      except:
        log.exception()
        if metric:
          results[metric] = dict(error="Unexpected error occurred in bulk CarbonLink.set_metadata(%s)" % metric)

  else:
    results = dict(error="Invalid request method")

  return HttpResponse(json.dumps(results), mimetype='application/json')


def tree_jobs(jobs):
  results = []

  branchNode = {
    'allowChildren': 1,
    'expandable': 1,
    'leaf': 0,
  }

  for job in jobs: #Now let's add the matching children
    resultNode = {
      'text' : str(job),
      'id' : str(job),
    }

    resultNode['context'] = 1

    resultNode.update(branchNode)
    results.append(resultNode)

  return json.dumps(results)

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
  results_leaf = []
  results_branch = []
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
      results_leaf.append(resultNode)
    else:
      resultNode.update(branchNode)
      results_branch.append(resultNode)

  results.extend(results_branch)
  results.extend(results_leaf)

  return json.dumps(results)


def pickle_nodes(nodes, contexts=False):
  if contexts:
    return pickle.dumps([ { 'metric_path' : n.metric_path, 'isLeaf' : n.isLeaf(), 'intervals' : n.getIntervals(), 'context' : n.context } for n in nodes ])

  else:
    return pickle.dumps([ { 'metric_path' : n.metric_path, 'isLeaf' : n.isLeaf(), 'intervals' : n.getIntervals()} for n in nodes ])


def any(iterable): #python2.4 compatibility
  for i in iterable:
    if i:
      return True
  return False
