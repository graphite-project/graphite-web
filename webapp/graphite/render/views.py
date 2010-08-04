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
from datetime import datetime, timedelta
from random import shuffle
from httplib import CannotSendRequest
from urlparse import urlsplit
from cStringIO import StringIO
try:
  import cPickle as pickle
except ImportError:
  import pickle

from graphite.util import getProfileByUsername
from graphite.remote_storage import HTTPConnectionWithTimeout
from graphite.logger import log
from graphite.render.evaluator import evaluateTarget
from graphite.render.attime import parseATTime
from graphite.render.functions import PieFunctions
from graphite.render.glyph import GraphTypes
from graphite.render.hashing import hashRequest, hashData

from django.http import HttpResponse, HttpResponseServerError
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings


def renderView(request):
  start = time()
  (graphOptions, requestOptions) = parseOptions(request)
  useCache = 'noCache' not in requestOptions
  requestContext = {
    'startTime' : requestOptions['startTime'],
    'endTime' : requestOptions['endTime'],
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
        t = time()
        seriesList = evaluateTarget(requestContext, target)
        log.rendering("Retrieval of %s took %.6f" % (target, time() - t))
        data.extend(seriesList)

    if useCache:
      cache.set(dataKey, data)

    # If data is all we needed, we're done
    if 'pickle' in requestOptions:
      response = HttpResponse(mimetype='application/pickle')
      seriesInfo = [series.getInfo() for series in data]
      pickle.dump(seriesInfo, response, protocol=-1)

      log.rendering('Total pickle rendering time %.6f' % (time() - start))
      return response

    if requestOptions.get('format') == 'csv':
      response = HttpResponse(mimetype='text/csv')
      writer = csv.writer(response, dialect='excel')

      for series in data:
        for i, value in enumerate(series):
          timestamp = localtime( series.start + (i * series.step) )
          writer.writerow( (series.name, strftime("%Y-%m-%d %H:%M:%S", timestamp), value) )

      return response

    if 'rawData' in requestOptions:
      response = HttpResponse(mimetype='text/plain')
      for series in data:
        response.write( "%s,%d,%d,%d|" % (series.name, series.start, series.end, series.step) )
        response.write( ','.join(map(str,series)) )
        response.write('\n')

      log.rendering('Total rawData rendering time %.6f' % (time() - start))
      return response

  # We've got the data, now to render it
  graphOptions['data'] = data
  if settings.REMOTE_RENDERING: # Rendering on other machines is faster in some situations
    image = delegateRendering(requestOptions['graphType'], graphOptions)
  else:
    image = doImageRender(requestOptions['graphClass'], graphOptions)

  response = buildResponse(image)

  if useCache:
    cache.set(requestKey, response)

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
  requestOptions['targets'] = []
  for target in queryParams.getlist('target'):
    if target.lower().startswith('graphite.'): #Strip leading "Graphite." as a convenience
      target = target[9:]
    requestOptions['targets'].append(target)

  if 'pickle' in queryParams:
    requestOptions['pickle'] = True
  if 'rawData' in queryParams:
    requestOptions['rawData'] = True
  if 'format' in queryParams:
    requestOptions['format'] = queryParams['format']
  if 'noCache' in queryParams:
    requestOptions['noCache'] = True

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
      endTime = parseATTime( queryParams['until'] )
    else:
      endTime = datetime.now()
    if 'from' in queryParams:
      startTime = parseATTime( queryParams['from'] )
    else:
      startTime = endTime - timedelta(days=1)
    if endTime > datetime.now():
      endTime = datetime.now()
    assert startTime < endTime, "Invalid time range!"
    
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
        conn.request('POST', '/render/local/', postData)
      # Read the response
      response = conn.getresponse()
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
  assert profile, "No such user '%s'" % username
  try:
    graph = profile.mygraph_set.get(name=graphName)
  except ObjectDoesNotExist:
    assert False, "User %s doesn't have a MyGraph named '%s'" % (username,graphName)
  (proto,host,path,query,frag) = urlsplit( graph.url )
  if query: path += '?' + query
  conn = HTTPConnectionWithTimeout( host )
  conn.request('GET', path)
  resp = conn.getresponse()
  assert resp.status == 200, "Failed to retrieve image from URL %s" % graph.url
  imageData = resp.read()
  return buildResponse(imageData)


def doImageRender(graphClass, graphOptions):
  pngData = StringIO()
  t = time()
  img = graphClass(**graphOptions)
  img.output(pngData)
  log.rendering('Rendered PNG in %.6f seconds' % (time() - t))
  imageData = pngData.getvalue()
  pngData.close()
  return imageData


def buildResponse(imageData):
  response = HttpResponse(imageData, mimetype="image/png")
  response['Cache-Control'] = 'no-cache'
  response['Pragma'] = 'no-cache'
  return response
