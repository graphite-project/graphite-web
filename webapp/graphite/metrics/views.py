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
import fnmatch
import os
import pytz
import urllib

from datetime import datetime
from django.conf import settings
from graphite.compat import HttpResponse, HttpResponseBadRequest
from graphite.user_util import getProfile
from graphite.util import json
from graphite.logger import log
from graphite.readers import RRDReader
from graphite.storage import STORE
from graphite.carbonlink import CarbonLink
from graphite.remote_storage import extractForwardHeaders
from graphite.render.attime import parseATTime
from graphite.util import epoch

try:
  import cPickle as pickle
except ImportError:
  import pickle


def index_json(request):
  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  jsonp = queryParams.get('jsonp', False)
  cluster = queryParams.get('cluster', False)

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

    # unlike 0.9.x, we're going to use os.walk with followlinks
    # since we require Python 2.7 and newer that supports it
    if RRDReader.supported:
      for root, dirs, files in os.walk(settings.RRD_DIR, followlinks=True):
        root = root.replace(settings.RRD_DIR, '')
        for basename in files:
          if fnmatch.fnmatch(basename, '*.rrd'):
            absolute_path = os.path.join(settings.RRD_DIR, root, basename)
            (basename,extension) = os.path.splitext(basename)
            metric_path = os.path.join(root, basename)
            rrd = RRDReader(absolute_path, metric_path)
            for datasource_name in rrd.get_datasources(absolute_path):
              matches.append(os.path.join(metric_path, datasource_name))

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
  if cluster and len(settings.CLUSTER_SERVERS) >= 1:
    try:
      matches = reduce( lambda x, y: list(set(x + y)), \
        [json.loads(urllib.urlopen('http://' + cluster_server + '/metrics/index.json').read()) \
        for cluster_server in settings.CLUSTER_SERVERS])
    except urllib.URLError:
      log.exception()
      return json_response_for(request, matches, jsonp=jsonp, status=500)
  else:
    matches = find_matches()
  return json_response_for(request, matches, jsonp=jsonp)


def find_view(request):
  "View for finding metrics matching a given pattern"

  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  format = queryParams.get('format', 'treejson')
  local_only = int( queryParams.get('local', 0) )
  wildcards = int( queryParams.get('wildcards', 0) )

  tzinfo = pytz.timezone(settings.TIME_ZONE)
  if 'tz' in queryParams:
    try:
      tzinfo = pytz.timezone(queryParams['tz'])
    except pytz.UnknownTimeZoneError:
      pass

  if 'now' in queryParams:
    now = parseATTime(queryParams['now'], tzinfo)
  else:
    now = datetime.now(tzinfo)

  if 'from' in queryParams and str(queryParams['from']) != '-1':
    fromTime = int(epoch(parseATTime(queryParams['from'], tzinfo, now)))
  else:
    fromTime = -1

  if 'until' in queryParams and str(queryParams['from']) != '-1':
    untilTime = int(epoch(parseATTime(queryParams['until'], tzinfo, now)))
  else:
    untilTime = -1

  nodePosition = int( queryParams.get('position', -1) )
  jsonp = queryParams.get('jsonp', False)
  forward_headers = extractForwardHeaders(request)

  if fromTime == -1:
    fromTime = None
  if untilTime == -1:
    untilTime = None

  automatic_variants = int( queryParams.get('automatic_variants', 0) )

  try:
    query = str( queryParams['query'] )
  except:
    return HttpResponseBadRequest(content="Missing required parameter 'query'",
                                  content_type='text/plain')

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
    matches = list( STORE.find(query, fromTime, untilTime, local=local_only, headers=forward_headers) )
  except:
    log.exception()
    raise

  log.info('find_view query=%s local_only=%s matches=%d' % (query, local_only, len(matches)))
  matches.sort(key=lambda node: node.name)
  log.info("received remote find request: pattern=%s from=%s until=%s local_only=%s format=%s matches=%d" % (query, fromTime, untilTime, local_only, format, len(matches)))

  if format == 'treejson':
    profile = getProfile(request)
    content = tree_json(matches, base_path, wildcards=profile.advancedUI or wildcards)
    response = json_response_for(request, content, jsonp=jsonp)

  elif format == 'nodelist':
    content = nodes_by_position(matches, nodePosition)
    response = json_response_for(request, content, jsonp=jsonp)

  elif format == 'pickle':
    content = pickle_nodes(matches)
    response = HttpResponse(content, content_type='application/pickle')

  elif format == 'json':
    content = json_nodes(matches)
    response = json_response_for(request, content, jsonp=jsonp)

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
        content_type='text/plain')

  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response


def expand_view(request):
  "View for expanding a pattern into matching metric paths"
  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  local_only = int( queryParams.get('local', 0) )
  group_by_expr = int( queryParams.get('groupByExpr', 0) )
  leaves_only = int( queryParams.get('leavesOnly', 0) )
  jsonp = queryParams.get('jsonp', False)
  forward_headers = extractForwardHeaders(request)

  results = {}
  for query in queryParams.getlist('query'):
    results[query] = set()
    for node in STORE.find(query, local=local_only, headers=forward_headers):
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

  response = json_response_for(request, result, jsonp=jsonp)
  response['Pragma'] = 'no-cache'
  response['Cache-Control'] = 'no-cache'
  return response


def get_metadata_view(request):
  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  key = queryParams.get('key')
  metrics = queryParams.getlist('metric')
  jsonp = queryParams.get('jsonp', False)
  results = {}
  for metric in metrics:
    try:
      results[metric] = CarbonLink.get_metadata(metric, key)
    except:
      log.exception()
      results[metric] = dict(error="Unexpected error occurred in CarbonLink.get_metadata(%s, %s)" % (metric, key))

  return json_response_for(request, results, jsonp=jsonp)


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
    results = dict(error='Invalid request method')

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
      'text' : urllib.unquote_plus(str(node.name)),
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


def nodes_by_position(matches, position):
  found = set()

  for metric in matches:
    nodes = metric.path.split('.')
    found.add(nodes[position])
  results = { 'nodes' : sorted(found) }
  return results


def pickle_nodes(nodes):
  nodes_info = []

  for node in nodes:
    info = dict(path=node.path, is_leaf=node.is_leaf)
    if node.is_leaf:
      info['intervals'] = node.intervals

    nodes_info.append(info)

  return pickle.dumps(nodes_info, protocol=-1)


def json_nodes(nodes):
  nodes_info = []

  for node in nodes:
    info = dict(path=node.path, is_leaf=node.is_leaf)
    if node.is_leaf:
      info['intervals'] = [{'start': i.start, 'end': i.end} for i in node.intervals]

    nodes_info.append(info)

  return sorted(nodes_info, key=lambda item: item['path'])


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
