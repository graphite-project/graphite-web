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
from time import time
from datetime import datetime, timedelta
from random import shuffle
from httplib import HTTPConnection, CannotSendRequest
from urlparse import urlsplit
from cStringIO import StringIO
from cPickle import dumps, loads

from web.util import getProfileByUsername
from web.logger import log
from web.render.evaluator import evaluateTarget
from web.render.attime import parseATTime
from web.render.glyph import GraphTypes
from web.render.hashing import hashRequest, hashData

from django.http import HttpResponse, HttpResponseServerError
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings


def renderView(request):
  start = time()
  (graphOptions, requestOptions) = parseOptions(request)
  useCache = 'noCache' not in requestOptions

  # First we check the request cache
  if useCache:
    requestKey = hashRequest(request)
    cachedResponse = cache.get(requestKey)
    if cachedResponse:
      log.cache('Request-Cache hit')
      log.rendering('Returned cached response in %.6f' % (time() - start))
      return cachedResponse
    else:
      log.cache('Request-Cache miss')

  # Now we prepare the requested data
  if requestOptions['graphType'] == 'pie':
    data = []
    for target in requestOptions['targets']:
      try:
        name,value = target.split(':',1)
        value = float(value)
      except:
        raise ValueError, "Invalid target '%s'" % target
      data.append( (name,value) )
    return data

  elif requestOptions['graphType'] == 'line':
    # Let's see if at least our data is cached
    if useCache:
      targets = requestOptions['targets']
      startTime = requestOptions['startTime']
      endTime = requestOptions['endTime']
      dataKey = hashData(targets, startTime, endTime)
      cachedData = cache.get(dataKey)
      if cachedData:
        log.cache("Data-Cache hit")
      else:
        log.cache("Data-Cache miss")
    else:
      cachedData = None

    if cachedData is not None:
      data = cachedData
    else: # Have to actually retrieve the data now
      data = []
      timeInterval = (requestOptions['startTime'], requestOptions['endTime'])
      for target in requestOptions['targets']:
        t = time()
        seriesList = evaluateTarget(target, timeInterval)
        data.extend(seriesList)
        log.rendering('Retrieval of %s took %.6f' % (target,time() - t))

    # If data is all we needed, we're done
    if 'rawData' in requestOptions:
      response = HttpResponse(mimetype='text/plain')
      for series in data:
        response.write( "%s,%d,%d,%d|" % (series.name, series.start, series.end, series.step) )
        response.write( ','.join(map(str,series)) )
        response.write('\n')

      if useCache:
        cache.set(dataKey, data)

      log.rendering('Total rawData rendering time %.6f' % (time() - start))
      return response

  # We've got the data, now to render it
  if settings.REMOTE_RENDERING: # Rendering on other machines is faster in some situations
    image = delegateRendering(requestOptions, graphOptions)
  else:
    image = doImageRender(requestOptions['graphClass'], data, graphOptions)

  response = buildResponse(image)

  if useCache:
    cache.set(requestKey, response)

  log.rendering('Total rendering time %.6f seconds' % (time() - start))
  return response


def parseOptions(request):
  queryParams = request.GET

  # Start with some defaults
  graphOptions = {'width' : 330, 'height' : 250}
  requestOptions = {}

  graphType = queryParams.get('graphType','line')
  assert graphType in GraphTypes, "Invalid graphType '%s', must be one of %s" % (graphType,GraphTypes.keys())
  graphClass = GraphTypes[graphType]

  # Fill in the requestOptions
  requestOptions['graphType'] = graphType
  requestOptions['graphClass'] = graphClass
  requestOptions['targets'] = []
  for target in queryParams.getlist('target'):
    if target.lower().startswith('graphite.'): #Strip leading "Graphite." as a convenience
      target = target[9:]
    requestOptions['targets'].append(target)

  if 'rawData' in queryParams:
    requestOptions['rawData'] = True
  if 'noCache' in queryParams:
    requestOptions['noCache'] = True

  # Fill in the graphOptions
  for opt in graphClass.customizable:
    if opt in queryParams:
      val = queryParams[opt]
      if val.isdigit() and opt not in ('fgcolor','bgcolor','fontColor'):
        val = int(val)
      elif '.' in val and val.replace('.','',1).isdigit():
        val = float(val)
      elif val.lower() in ('true','false'):
        val = eval( val.lower().capitalize() )
      elif val.lower() == 'default':
        continue
      graphOptions[opt] = val

  # Get the time interval for time-oriented graph types
  if graphType == 'line':
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

def delegateRendering(requestOptions, graphOptions):
  start = time()
  postData = requestOptions['graphType'] + '\n' + dumps(graphOptions)
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
        connection = HTTPQuickConnection(server)
      # Send the request
      try:
        connection.request('POST','/render/local/', postData)
      except CannotSendRequest:
        connection = HTTPQuickConnection(server) #retry once
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
    options = loads(optionsPickle)
    image = doImageRender(graphClass, options)
    log.rendering("Delegated rendering request took %.6f seconds" % (time() -  start))
    return buildResponse(image)
  except:
    log.exception("Exception in web.render.views.rawrender")
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
  conn = HTTPConnection( host )
  conn.request('GET', path)
  resp = conn.getresponse()
  assert resp.status == 200, "Failed to retrieve image from URL %s" % graph.url
  imageData = resp.read()
  return buildResponse(imageData)


def doImageRender(graphClass, graphData, graphOptions):
  pngData = StringIO()
  t = time()
  img = graphClass(graphData, **graphOptions)
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


# Below is a hack to put a timeout in the connect() of an HTTP request
import socket

class HTTPQuickConnection(HTTPConnection):
  def connect():
    msg = "getaddrinfo returns an empty list"
    for res in socket.getaddrinfo(self.host, self.port, 0, socket.SOCK_STREAM):
      af, socktype, proto, canonname, sa = res
      try:
        self.sock = socket.socket(af, socktype, proto)
        self.sock.settimeout( settings.REMOTE_RENDER_CONNECT_TIMEOUT )
        if self.debuglevel > 0:
          print "connect: (%s, %s)" % (self.host, self.port)
        self.sock.connect(sa)
        self.sock.settimeout(None)
      except socket.error, msg:
        if self.debuglevel > 0:
          print 'connect fail:', (self.host, self.port)
        if self.sock:
          self.sock.close()
          self.sock = None
          continue
      break
    if not self.sock:
      raise socket.error, msg
