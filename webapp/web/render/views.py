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

from time import time, strptime
from datetime import datetime, timedelta
from random import shuffle
from httplib import HTTPConnection, CannotSendRequest
from urlparse import urlsplit
from cStringIO import StringIO
from cPickle import dumps, loads

from web.util import log, getProfileByUsername
from attime import parseATTime
from glyph import GraphTypes
from access import retrieve
from hashing import imageHash, rawDataHash

from django.http import *
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings

import socket

defaultOptions = {
  'width' : 330,
  'height' : 250,
}

connectionPool = {}

def render(request):
  start = time()

  graphType = request.GET.get('graphType','line')
  assert graphType in GraphTypes, "Invalid graphType '%s', must be one of %s" % (graphType,GraphTypes.keys())
  graphClass = GraphTypes[graphType]

  options = defaultOptions.copy()
  for opt in graphClass.customizable:
    if opt in request.GET:
      val = request.GET[opt]
      if val.isdigit() and opt not in ('fgcolor','bgcolor','fontColor'):
        val = int(val)
      elif val.replace('.','',1).isdigit():
        val = float(val)
      elif val.lower() in ('true','false'):
        val = eval( val.lower().capitalize() )
      elif val.lower() == 'default':
        continue
      options[opt] = val
  if 'rawData' in request.GET:
    options['rawData'] = request.GET['rawData']

  if graphType == 'line':
    if 'until' in request.GET:
      endTime = parseATTime( request.GET['until'] )
    else:
      endTime = datetime.now()
    if 'from' in request.GET:
      startTime = parseATTime( request.GET['from'] )
    else:
      startTime = endTime - timedelta(days=1)
    assert startTime < endTime, "Invalid time range!"
    assert endTime <= datetime.now(), "Can't request data from the future!"
    interval = (startTime,endTime)

    options['from'] = startTime.strftime("%Y%m%d_%H:%M") #For hashing purposes
    options['until'] = endTime.strftime("%Y%m%d_%H:%M")

  #Locate requested data
  targetList = request.GET.getlist('target')
  if 'noCache' in request.GET:
    imageData = None
  else:
    img_hash = imageHash(targetList,options)
    imageData = cache.get(img_hash)
    if imageData:
      log.cache('Image hash %s cache hit!' % img_hash)
    else:
      log.cache('Image hash %s cache miss!' % img_hash)

  if not imageData:
    options['data'] = []

    if graphType == 'line':
      for target in targetList:
        t = time()
        seriesList = retrieve(target,interval)
        options['data'].extend(seriesList)
        log.rendering('Retrieval of %s took %.6f' % (target,time() - t))

      if request.GET.get('rawData',False):
        response = HttpResponse()
        if 'noCache' in request.GET:
          rawData = None
        else:
          raw_hash = rawDataHash( options['data'] )
          rawData = cache.get(raw_hash)
        if rawData:
          log.cache('Raw hash %s cache hit!' % raw_hash)
          response.write(rawData)
        else:
          for series in options['data']:
            response.write( "%s,%d,%d,%d|" % (series.name, series.start, series.end, series.step) )
            response.write( ','.join(map(str,series)) )
            response.write('\n')
          if ('noCache' not in request.GET) and options['data']: cache.set(raw_hash,response.content)
        log.rendering('Total rawData rendering time %.6f' % (time() - start))
        return response

    if graphType == 'pie':
      for target in targetList:
        try:
          name,value = target.split(':',1)
          value = float(value)
        except:
          raise ValueError, "Invalid target '%s'" % target
        options['data'].append( (name,value) )

    if settings.CRAPPY_HARDWARE: #Render remotely
      remoteTime = time()
      requestString = graphType + '\n' + dumps(options)
      serverList = settings.RENDERING_HOSTS[:] #use a copy so we can shuffle it safely
      shuffle(serverList)
      for server in serverList:
        t = time()
        try:
          conn = connectionPool.get(server)
          if not conn:
            connectionPool[server] = conn = HTTPConnection(server)
            conn.connect = safeHTTPConnect(conn) #forceful decoration hack
          try:
            conn.request('POST','/render/raw/',requestString)
          except CannotSendRequest:
            connectionPool[server] = conn = HTTPConnection(server)
            conn.request('POST','/render/raw/',requestString)
          resp = conn.getresponse()
          assert resp.status == 200, "Bad response code %d from %s" % (resp.status,server)
          #contentLength = resp.getheader('Content-Length')
          contentType = resp.getheader('Content-Type')
          imageData = resp.read()
          assert contentType == 'image/png', "Bad content type: \"%s\" from %s" % (contentType,server)
          assert imageData, "Received empty response from %s" % server
          #assert len(imageData) == contentLength, "Partial response from %s, read %d of %s" % (server,len(imageData),contentLength)
        except:
          log.exception("Exception while attempting remote rendering request")
          log.rendering('Exception while remotely rendering on %s wasted %.6f' % (server,time() - t))
          imageData = None #in case we had a partial response we'll need to render locally
          continue
        log.rendering('Remotely rendered image on %s in %.6f seconds' % (server,time() - t))
        break
      log.rendering('Spent a total of %.6f seconds doing remote rendering work' % (time() - remoteTime))

    if not imageData: #Render locally
      imageData = __local_render(graphClass,options)
    if 'noCache' not in options and options['data']: cache.set(img_hash,imageData)

  response = __build_response(imageData)
  log.rendering('Total rendering time %.6f' % (time() - start))
  return response


def rawrender(request):
  try:
    reqParams = StringIO(request.raw_post_data)
    graphType = reqParams.readline().strip()
    optionsPickle = reqParams.read()
    reqParams.close()
    graphClass = GraphTypes[graphType]
    options = loads(optionsPickle)
    imageData = __local_render(graphClass,options)
    return __build_response(imageData)
  except:
    log.exception("Exception in web.render.views.rawrender")
    return HttpResponseServerError()

def renderMyGraph(request,username,graphName):
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
  return __build_response(imageData)

def __local_render(graphClass,options):
  pngData = StringIO()
  t = time()
  img = graphClass(**options)
  img.output(pngData)
  log.rendering('local_render PNG generated in %.6f' % (time() - t))
  imageData = pngData.getvalue()
  pngData.close()
  return imageData

def __build_response(imageData):
  response = HttpResponse(imageData,mimetype="image/png")
  response['Cache-Control'] = 'no-cache'
  response['Pragma'] = 'no-cache'
  return response

def safeHTTPConnect(self):
  "Forceful decoration of httplib.HTTPConnection.connect()"
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
  return connect
