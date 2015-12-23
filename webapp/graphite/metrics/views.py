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
from urllib2 import urlopen

from django.conf import settings
from graphite.compat import HttpResponse, HttpResponseBadRequest
from graphite.util import getProfile, json
from graphite.logger import log
from graphite.storage import STORE
from graphite.carbonlink import CarbonLink
import fnmatch, os

try:
  import cPickle as pickle
except ImportError:
  import pickle


def index_json(request):
  jsonp = request.REQUEST.get('jsonp', False)
  cluster = request.REQUEST.get('cluster', False)

  def find_matches():
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
    return matches
  matches = []
  if cluster and len(settings.CLUSTER_SERVERS) > 1:
    matches = reduce( lambda x, y: list(set(x + y)), \
        [json.loads(urlopen("http://" + cluster_server + "/metrics/index.json").read()) \
        for cluster_server in settings.CLUSTER_SERVERS])
  else:
    matches = find_matches()
  return json_response_for(request, matches, jsonp=jsonp)


def find_view(request):
  "View for finding metrics matching a given pattern"
  profile = getProfile(request)
  format = request.REQUEST.get('format', 'treejson')
  local_only = int( request.REQUEST.get('local', 0) )
  wildcards = int( request.REQUEST.get('wildcards', 0) )
  fromTime = int( request.REQUEST.get('from', -1) )
  untilTime = int( request.REQUEST.get('until', -1) )
  jsonp = request.REQUEST.get('jsonp', False)

  if fromTime == -1:
    fromTime = None
  if untilTime == -1:
    untilTime = None

  automatic_variants = int( request.REQUEST.get('automatic_variants', 0) )

  try:
    query = str( request.REQUEST['query'] )
  except:
    return HttpResponseBadRequest(content="Missing required parameter 'query'",
                                  content_type="text/plain")

  if '.' in query:
    base_path = query.rsplit('.', 1)[0] + '.'
  else:
    base_path = ''

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
    matches = list( STORE.find(query, fromTime, untilTime, local=local_only) )
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
    response = HttpResponse(content, content_type='application/pickle')

  elif format == 'completer':
    results = []
    for node in matches:
      node_info = dict(path=node.path, name=node.name, is_leaf=str(int(node.is_leaf)))
      if not node.is_leaf:
        node_info['path'] += '.'
      results.append(node_info)

    if len(results) > 1 and wildcards:
      wildcardNode = {'name' : '*'}
      results.append(wildcardNode)

    response = json_response_for(request, { 'metrics' : results }, jsonp=jsonp)

  else:
    return HttpResponseBadRequest(
        content="Invalid value for 'format' parameter",
        content_type="text/plain")

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
      operations = json.loads( request.body )
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


def tree_json(nodes, base_path, wildcards=False):
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


def json_response_for(request, data, content_type='application/json',
                      jsonp=False, **kwargs):
  accept = request.META.get('HTTP_ACCEPT', 'application/json')
  ensure_ascii = accept == 'application/json'

  content = json.dumps(data, ensure_ascii=ensure_ascii)
  if jsonp:
    content = "%s(%s)" % (jsonp, content)
    content_type = 'text/javascript'
  if not ensure_ascii:
    content_type += ';charset=utf-8'

  return HttpResponse(content, content_type=content_type, **kwargs)
