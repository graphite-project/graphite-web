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
import csv
from time import time, strftime, localtime
from random import shuffle
from httplib import CannotSendRequest
from urllib import urlencode
from urlparse import urlsplit, urlunsplit
from cgi import parse_qs
from cStringIO import StringIO
try:
  import cPickle as pickle
except ImportError:
  import pickle

from graphite.util import getProfileByUsername, json
from graphite.remote_storage import HTTPConnectionWithTimeout
from graphite.logger import log
from graphite.render.evaluator import evaluateTarget
from graphite.render.attime import parseATTime
from graphite.render.functions import PieFunctions
from graphite.render.hashing import hashRequest, hashData
from graphite.render.glyph import GraphTypes

from django.http import HttpResponse, HttpResponseServerError, HttpResponseRedirect
from django.template import Context, loader
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings


def renderView(request):
  start = time()
  (graphOptions, requestOptions) = parseOptions(request)
  useCache = 'noCache' not in requestOptions
  cacheTimeout = requestOptions['cacheTimeout']
  requestContext = {
    'startTime' : requestOptions['startTime'],
    'endTime' : requestOptions['endTime'],
    'localOnly' : requestOptions['localOnly'],
    'data' : []
  }
  data = requestContext['data']

  # First we check the request cache
  if useCache:
    requestKey = hashRequest(request)
    cachedResponse = cache.get(requestKey)
    if cachedResponse:
      log.cache('Request-Cache hit [%s]' % requestKey)
      log.rendering('Returned cached response in %.6f' % (time() - start))
      return cachedResponse
    else:
      log.cache('Request-Cache miss [%s]' % requestKey)

  # Now we prepare the requested data
  if requestOptions['graphType'] == 'pie':
    for target in requestOptions['targets']:
      if target.find(':') >= 0:
        try:
          name,value = target.split(':',1)
          value = float(value)
        except:
          raise ValueError, "Invalid target '%s'" % target
        data.append( (name,value) )
      else:
        seriesList = evaluateTarget(requestContext, target)

        for series in seriesList:
          func = PieFunctions[requestOptions['pieMode']]
          data.append( (series.name, func(requestContext, series) or 0 ))

  elif requestOptions['graphType'] == 'line':
    # Let's see if at least our data is cached
    if useCache:
      targets = requestOptions['targets']
      startTime = requestOptions['startTime']
      endTime = requestOptions['endTime']
      dataKey = hashData(targets, startTime, endTime)
      cachedData = cache.get(dataKey)
      if cachedData:
        log.cache("Data-Cache hit [%s]" % dataKey)
      else:
        log.cache("Data-Cache miss [%s]" % dataKey)
    else:
      cachedData = None

    if cachedData is not None:
      requestContext['data'] = data = cachedData
    else: # Have to actually retrieve the data now
      for target in requestOptions['targets']:
        if not target.strip():
          continue
        t = time()
        seriesList = evaluateTarget(requestContext, target)
        log.rendering("Retrieval of %s took %.6f" % (target, time() - t))
        data.extend(seriesList)

    if useCache:
      cache.set(dataKey, data, cacheTimeout)

    # If data is all we needed, we're done
    format = requestOptions.get('format')
    if format == 'csv':
      response = HttpResponse(mimetype='text/csv')
      writer = csv.writer(response, dialect='excel')

      for series in data:
        for i, value in enumerate(series):
          timestamp = localtime( series.start + (i * series.step) )
          writer.writerow( (series.name, strftime("%Y-%m-%d %H:%M:%S", timestamp), value) )

      return response

    if format == 'json':
      series_data = []
      for series in data:
        timestamps = range(series.start, series.end, series.step)
        datapoints = zip(series, timestamps)
        series_data.append( dict(target=series.name, datapoints=datapoints) )

      if 'jsonp' in requestOptions:
        response = HttpResponse(
          content="%s(%s)" % (requestOptions['jsonp'], json.dumps(series_data)),
          mimetype='text/javascript')
      else:
        response = HttpResponse(content=json.dumps(series_data), mimetype='application/json')

      response['Pragma'] = 'no-cache'
      response['Cache-Control'] = 'no-cache'
      return response

    if format == 'raw':
      response = HttpResponse(mimetype='text/plain')
      for series in data:
        response.write( "%s,%d,%d,%d|" % (series.name, series.start, series.end, series.step) )
        response.write( ','.join(map(str,series)) )
        response.write('\n')

      log.rendering('Total rawData rendering time %.6f' % (time() - start))
      return response

    if format == 'svg':
      graphOptions['outputFormat'] = 'svg'

    if format == 'pickle':
      response = HttpResponse(mimetype='application/pickle')
      seriesInfo = [series.getInfo() for series in data]
      pickle.dump(seriesInfo, response, protocol=-1)

      log.rendering('Total pickle rendering time %.6f' % (time() - start))
      return response


  # We've got the data, now to render it
  graphOptions['data'] = data
  if settings.REMOTE_RENDERING: # Rendering on other machines is faster in some situations
    image = delegateRendering(requestOptions['graphType'], graphOptions)
  else:
    image = doImageRender(requestOptions['graphClass'], graphOptions)

  useSVG = graphOptions.get('outputFormat') == 'svg'
  if useSVG and 'jsonp' in requestOptions:
    response = HttpResponse(
      content="%s(%s)" % (requestOptions['jsonp'], json.dumps(image)),
      mimetype='text/javascript')
  else:
    response = buildResponse(image, useSVG and 'image/svg+xml' or 'image/png')

  if useCache:
    cache.set(requestKey, response, cacheTimeout)

  log.rendering('Total rendering time %.6f seconds' % (time() - start))
  return response


def parseOptions(request):
  queryParams = request.REQUEST

  # Start with some defaults
  graphOptions = {'width' : 330, 'height' : 250}
  requestOptions = {}

  graphType = queryParams.get('graphType','line')
  assert graphType in GraphTypes, "Invalid graphType '%s', must be one of %s" % (graphType,GraphTypes.keys())
  graphClass = GraphTypes[graphType]

  # Fill in the requestOptions
  requestOptions['graphType'] = graphType
  requestOptions['graphClass'] = graphClass
  requestOptions['pieMode'] = queryParams.get('pieMode', 'average')
  requestOptions['cacheTimeout'] = int( queryParams.get('cacheTimeout', settings.DEFAULT_CACHE_DURATION) )
  requestOptions['targets'] = []
  for target in queryParams.getlist('target'):
    requestOptions['targets'].append(target)

  if 'pickle' in queryParams:
    requestOptions['format'] = 'pickle'
  if 'rawData' in queryParams:
    requestOptions['format'] = 'raw'
  if 'format' in queryParams:
    requestOptions['format'] = queryParams['format']
    if 'jsonp' in queryParams:
      requestOptions['jsonp'] = queryParams['jsonp']
  if 'noCache' in queryParams:
    requestOptions['noCache'] = True

  requestOptions['localOnly'] = queryParams.get('local') == '1'

  # Fill in the graphOptions
  for opt in graphClass.customizable:
    if opt in queryParams:
      val = queryParams[opt]
      if (val.isdigit() or (val.startswith('-') and val[1:].isdigit())) and opt not in ('fgcolor','bgcolor','fontColor'):
        val = int(val)
      elif '.' in val and (val.replace('.','',1).isdigit() or (val.startswith('-') and val[1:].replace('.','',1).isdigit())):
        val = float(val)
      elif val.lower() in ('true','false'):
        val = val.lower() == 'true'
      elif val.lower() == 'default' or val == '':
        continue
      graphOptions[opt] = val

  # Get the time interval for time-oriented graph types
  if graphType == 'line' or graphType == 'pie':
    if 'until' in queryParams:
      untilTime = parseATTime( queryParams['until'] )
    else:
      untilTime = parseATTime('now')
    if 'from' in queryParams:
      fromTime = parseATTime( queryParams['from'] )
    else:
      fromTime = parseATTime('-1d')

    startTime = min(fromTime, untilTime)
    endTime = max(fromTime, untilTime)
    assert startTime != endTime, "Invalid empty time range"
    
    requestOptions['startTime'] = startTime
    requestOptions['endTime'] = endTime

  return (graphOptions, requestOptions)


connectionPools = {}

def delegateRendering(graphType, graphOptions):
  start = time()
  postData = graphType + '\n' + pickle.dumps(graphOptions)
  servers = settings.RENDERING_HOSTS[:] #make a copy so we can shuffle it safely
  shuffle(servers)
  for server in servers:
    start2 = time()
    try:
      # Get a connection
      try:
        pool = connectionPools[server]
      except KeyError: #happens the first time
        pool = connectionPools[server] = set()
      try:
        connection = pool.pop()
      except KeyError: #No available connections, have to make a new one
        connection = HTTPConnectionWithTimeout(server)
        connection.timeout = settings.REMOTE_RENDER_CONNECT_TIMEOUT
      # Send the request
      try:
        connection.request('POST','/render/local/', postData)
      except CannotSendRequest:
        connection = HTTPConnectionWithTimeout(server) #retry once
        connection.timeout = settings.REMOTE_RENDER_CONNECT_TIMEOUT
        connection.request('POST', '/render/local/', postData)
      # Read the response
      response = connection.getresponse()
      assert response.status == 200, "Bad response code %d from %s" % (response.status,server)
      contentType = response.getheader('Content-Type')
      imageData = response.read()
      assert contentType == 'image/png', "Bad content type: \"%s\" from %s" % (contentType,server)
      assert imageData, "Received empty response from %s" % server
      # Wrap things up
      log.rendering('Remotely rendered image on %s in %.6f seconds' % (server,time() - start2))
      log.rendering('Spent a total of %.6f seconds doing remote rendering work' % (time() - start))
      pool.add(connection)
      return imageData
    except:
      log.exception("Exception while attempting remote rendering request on %s" % server)
      log.rendering('Exception while remotely rendering on %s wasted %.6f' % (server,time() - start2))
      continue


def renderLocalView(request):
  try:
    start = time()
    reqParams = StringIO(request.raw_post_data)
    graphType = reqParams.readline().strip()
    optionsPickle = reqParams.read()
    reqParams.close()
    graphClass = GraphTypes[graphType]
    options = pickle.loads(optionsPickle)
    image = doImageRender(graphClass, options)
    log.rendering("Delegated rendering request took %.6f seconds" % (time() -  start))
    return buildResponse(image)
  except:
    log.exception("Exception in graphite.render.views.rawrender")
    return HttpResponseServerError()


def renderMyGraphView(request,username,graphName):
  profile = getProfileByUsername(username)
  if not profile:
    return errorPage("No such user '%s'" % username)
  try:
    graph = profile.mygraph_set.get(name=graphName)
  except ObjectDoesNotExist:
    return errorPage("User %s doesn't have a MyGraph named '%s'" % (username,graphName))

  request_params = dict(request.REQUEST.items())
  if request_params:
    url_parts = urlsplit(graph.url)
    query_string = url_parts[3]
    if query_string:
      url_params = parse_qs(query_string)
      # Remove lists so that we can do an update() on the dict
      for param, value in url_params.items():
        if isinstance(value, list) and param != 'target':
          url_params[param] = value[-1]
      url_params.update(request_params)
      # Handle 'target' being a list - we want duplicate &target params out of it
      url_param_pairs = []
      for key,val in url_params.items():
        if isinstance(val, list):
          for v in val:
            url_param_pairs.append( (key,v) )
        else:
          url_param_pairs.append( (key,val) )

      query_string = urlencode(url_param_pairs)
    url = urlunsplit(url_parts[:3] + (query_string,) + url_parts[4:])
  else:
    url = graph.url
  return HttpResponseRedirect(url)


def doImageRender(graphClass, graphOptions):
  pngData = StringIO()
  t = time()
  img = graphClass(**graphOptions)
  img.output(pngData)
  log.rendering('Rendered PNG in %.6f seconds' % (time() - t))
  imageData = pngData.getvalue()
  pngData.close()
  return imageData


def buildResponse(imageData, mimetype="image/png"):
  response = HttpResponse(imageData, mimetype=mimetype)
  response['Cache-Control'] = 'no-cache'
  response['Pragma'] = 'no-cache'
  return response


def errorPage(message):
  template = loader.get_template('500.html')
  context = Context(dict(message=message))
  return HttpResponseServerError( template.render(context) )
