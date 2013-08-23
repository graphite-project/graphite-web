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
from graphite.storage import STORE
from graphite.metrics.search import searcher
from graphite.carbonlink import CarbonLink
from graphite.jobs import get_jobs, get_nodes
import fnmatch, os

try:
  import cPickle as pickle
except ImportError:
  import pickle


def index_json(request):
  jsonp = request.REQUEST.get('jsonp', False)
  matches = []

  for root, dirs, files in os.walk(settings.WHISPER_DIR):
    root = root.replace(settings.WHISPER_DIR, '')
    for basename in files:
      if fnmatch.fnmatch(basename, '*.wsp'):
        matches.append(os.path.join(root, basename))

  for root, dirs, files in os.walk(settings.CERES_DIR):
    root = root.replace(settings.CERES_DIR, '')
    for filename in files:
      if filename == '.ceres-node':
        matches.append(root)

  matches = [
    m
    .replace('.wsp', '')
    .replace('.rrd', '')
    .replace('/', '.')
    .lstrip('.')
    for m in sorted(matches)
  ]
  return json_response_for(request, matches, jsonp=jsonp)


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
  return json_response_for(request, dict(metrics=results))


def find_view(request):
  "View for finding metrics matching a given pattern"
  profile = getProfile(request)
  format = request.REQUEST.get('format', 'treejson')
  local_only = int( request.REQUEST.get('local', 0) )
  wildcards = int( request.REQUEST.get('wildcards', 0) )
  fromTime = int( request.REQUEST.get('from', -1) )
  untilTime = int( request.REQUEST.get('until', -1) )

  if fromTime == -1:
    fromTime = None
  if untilTime == -1:
    untilTime = None

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
    We're looking at a completer query that searches for jobs; format PartialJob*; eg Blast*
    Lets search if one or more of our nodes match and return them.
    """
    results = []

    for line in get_jobs(request.user, 100, query[:-1]):
      node_info = dict(path=line[0], name=line[1], fancyname=line[2], is_leaf='0')
      node_info['path'] += '.'
      results.append(node_info)

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
      matches = list( STORE.find(query, fromTime, untilTime, local=local_only, job_nodes=get_nodes(job) ))
    except:
      log.exception()
      raise


  log.info('find_view query=%s local_only=%s matches=%d' % (query, local_only, len(matches)))
  matches.sort(key=lambda node: node.name)
  log.info("received remote find request: pattern=%s from=%s until=%s local_only=%s format=%s matches=%d" % (query, fromTime, untilTime, local_only, format, len(matches)))

  if format == 'treejson':
    content = tree_json(matches, base_path, wildcards=profile.advancedUI or wildcards)
    response = json_response_for(request, content)

  elif format == 'pickle':
    content = pickle_nodes(matches)
    response = HttpResponse(content, mimetype='application/pickle')

  elif format == 'completer':
<<<<<<< HEAD
    try:
      results = []
      for node in matches:
        fancyname = get_jobs(request.user, 100, job.replace('-','.'))[0][2]
        node_info = dict(path=job + "." + node.path, name=node.name, fancyname=fancyname + "." + node.path, is_leaf=str(int(node.is_leaf)))
        if not node.is_leaf:
          node_info['path'] += '.'
        results.append(node_info)
=======
    #if len(matches) == 1 and (not matches[0].isLeaf()) and query == matches[0].metric_path + '*': # auto-complete children
    #  matches = list( store.find(query + '.*') )
    results = []
    for node in matches:
      fancyname = get_jobs(request.user, 100, job)[0][2]
      node_info = dict(path=job + "." + node.metric_path, name=node.metric_path, fancyname=fancyname + "." + node.metric_path, is_leaf=str(int(node.isLeaf())))
      if not node.isLeaf():
        node_info['path'] += '.'
      results.append(node_info)
>>>>>>> 203ce35... More decent path handling

      if len(results) > 1 and wildcards:
        wildcardNode = {'name' : '*'}
        results.append(wildcardNode)

      response = json_response_for(request, { 'metrics' : results})
    except Exception as e:
      print e


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

  results = {}
  for query in request.REQUEST.getlist('query'):
    results[query] = set()
    for node in STORE.find(query, local=local_only):
      if node.is_leaf or not leaves_only:
        results[query].add( node.path )

  # Convert our results to sorted lists because sets aren't json-friendly
  if group_by_expr:
    for query, matches in results.items():
      results[query] = sorted(matches)
  else:
    results = sorted( reduce(set.union, results.values(), set()) )

  result = {
    'results' : results
  }

  response = json_response_for(request, result)
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

  return json_response_for(request, results)


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

  return json_response_for(request, results)


def tree_jobs(jobs):
  results = []

  branchNode = {
    'allowChildren': 1,
    'expandable': 1,
    'leaf': 0,
  }

  for (name, jobname, fancyname) in jobs: #Now let's add the matching children
    resultNode = {
      'text' : fancyname,
      'id' : name,
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

    if any(not n.is_leaf for n in nodes):
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

    if node.is_leaf:
      resultNode.update(leafNode)
      results_leaf.append(resultNode)
    else:
      resultNode.update(branchNode)
      results_branch.append(resultNode)

  results.extend(results_branch)
  results.extend(results_leaf)
  return results


def pickle_nodes(nodes):
  nodes_info = []

  for node in nodes:
    info = dict(path=node.path, is_leaf=node.is_leaf)
    if node.is_leaf:
      info['intervals'] = node.intervals

    nodes_info.append(info)

  return pickle.dumps(nodes_info, protocol=-1)


def any(iterable): #python2.4 compatibility
  for i in iterable:
    if i:
      return True
  return False

def json_response_for(request, data, mimetype='application/json', jsonp=False, **kwargs):
  accept = request.META.get('HTTP_ACCEPT', 'application/json')
  ensure_ascii = accept == 'application/json'

  content = json.dumps(data, ensure_ascii=ensure_ascii)
  if jsonp:
    content = "%s(%)" % (jsonp, content)
    mimetype = 'text/javascript'
  if not ensure_ascii:
    mimetype += ';charset=utf-8'

  return HttpResponse(content, mimetype=mimetype, **kwargs)
