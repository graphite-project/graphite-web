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

import sys, os, cPickle, socket
import whisper
from time import mktime
from select import select
from glob import glob
from fnmatch import fnmatchcase
from itertools import izip
from django.conf import settings
from django.core.cache import cache

import computation
from datatypes import TimeSeries
from web.logger import log
from hashing import pathHash
from grammar import buildGrammar

try:
  import rrdtool
except:
  rrdtool = None

grammar = buildGrammar()

class CarbonLink:
  def __init__(self,hosts,timeout):
    self.hosts = []
    self.timeout = float(timeout)
    for host in hosts:
      server,port = host.split(':',1)
      self.hosts.append( (server,int(port)) )
    self.connections = {}

  def selectHost(self,key):
    return self.hosts[ hash(key) % len(self.hosts) ]

  def request(self,name):
    host = self.selectHost(name)
    try:
      conn = self.connections.get(host)
      if not conn:
        log.cache("CarbonLink creating new socket for %s:%d" % host)
        conn = self.connections[host] = socket.socket()
        conn.connect(host)
        conn.setsockopt( socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1 )
      conn.sendall(name+'\x00')
      def getResponse():
        try:
          buf = ''
          while True:
            assert select([conn],[],[],self.timeout)[0], "Connection to %s:%d timed out" % host
            pkt = conn.recv(65536)
            assert pkt, "CarbonLink lost connection to %s:%d" % host
            buf += pkt
            if buf.endswith('\x00'): break
          pointStrings = cPickle.loads(buf[:-1])
          log.cache("CarbonLink to %s, retrieved %d points for %s" % (host,len(pointStrings),name))
          return [ (lambda t,v: (int(t),float(v)))(*point.split(':',1)) for point in pointStrings ]
        except:
          self.connections[host] = None
          log.exception("CarbonLink to %s, exception while getting response" % str(host))
          return []
      return getResponse
    except:
      log.exception("CarbonLink to %s, exception while sending request" % str(host))
      self.connections[host] = None
      return lambda *a,**k: []

carbonLink = CarbonLink( settings.CARBONLINK_HOSTS, settings.CARBONLINK_TIMEOUT )


#Series Retrieval API functions below

def retrieve(target,interval):
  def evaluate(tokens): #closure to capture interval
    if tokens.expression:
      return evaluate(tokens.expression)
    elif tokens.pathExpression:
      seriesList = []
      for (graphitePath,dbURL) in resolvePaths(tokens.pathExpression):
        results = databaseFetch(graphitePath,dbURL,interval)
        if not results: continue
        (timeInfo,values) = results
        (start,end,step) = timeInfo
        series = TimeSeries(graphitePath,start,end,step,values)
        series.pathExpression = tokens.pathExpression #hack to pass expressions through to comp functions
        seriesList.append(series)
      return seriesList
    elif tokens.call:
      return computation.dispatch(tokens.call.func,[evaluate(arg) for arg in tokens.call.args])
    elif tokens.number:
      if tokens.number.integer:
        return int(tokens.number.integer)
      elif tokens.number.float:
        return float(tokens.number.float)
    elif tokens.string:
      return str(tokens.string)[1:-1]
  tokens = grammar.parseString(target)
  result = evaluate(tokens)
  if type(result) is TimeSeries:
    return [result] #retrieve guarantees a list
  return result

def resolvePaths(pathExpression):
  "Resolves a graphite path expression to a list of corresponding (graphitePath,dbURL) pairs"
  matches = []
  fsPathExpression = pathExpression.replace('.','/')

  whisperExpr = os.path.join(settings.DATA_DIR, fsPathExpression) + '.wsp'
  for fsPath in glob(whisperExpr):
    graphitePath = fsPath.replace(settings.DATA_DIR,'').replace('/','.')[:-4]
    dbURL = 'whisper://' + fsPath
    matches.append( (graphitePath,dbURL) )

  if rrdtool:
    components = fsPathExpression.split('.')
    datasourceExpression = components.pop()
    rrdFileExpression = '.'.join(components)
    rrdExpr = os.path.join(settings.RRD_DIR, rrdFileExpression) + '.rrd'
    for fsPath in glob(rrdExpr):
      try:
        info = rrdtool.info(fsPath)
      except:
        log.exception("Failed to retrieve RRD info from %s" % fsPath)
      for datasource in info['ds']:
        if not fnmatchcase(datasource,datasourceExpression): continue
        graphitePath = fsPath.replace(settings.RRD_DIR,'').replace('/','.')[:-4]
        dbURL = 'rrdtool://' + fsPath + ':' + datasource
        matches.append( (graphitePath,dbURL) )

  return matches

def databaseFetch(graphitePath,dbURL,interval):
  (dbHandler,dbPath) = dbURL.split('://',1)
  (startDateTime,endDateTime) = interval

  if dbHandler == 'whisper':
    myHash = pathHash(graphitePath)
    cachedValues = cache.get(myHash)
    if cachedValues is None: #cache miss
      log.cache("databaseFetch cache miss for %s! Querying CarbonLink" % graphitePath)
      getResponse = carbonLink.request(graphitePath)
    else:
      log.cache("databaseFetch cache hit for %s!" % graphitePath)
    fromTimestamp  = mktime( startDateTime.timetuple() )
    untilTimestamp = mktime( endDateTime.timetuple()   )
    (timeInfo,values) = whisper.fetch(dbPath,fromTimestamp,untilTimestamp)
    (start,end,step) = timeInfo
    if cachedValues is None:
      cachedValues = getResponse() #retrieve cached values from CarbonLink
      try: cache.set(myHash,cachedValues)
      except: pass
    #Graft the cached values into the values retrieved from the disk
    for (timestamp,value) in cachedValues:
      interval = timestamp - (timestamp % step)
      try:
        i = int(interval - start) / int(step)
        values[i] = value
      except:
        pass
    return (timeInfo,values)

  elif dbHandler == 'rrdtool':
    assert rrdtool, "rrdtool module was not successfully loaded"
    (dbPath,datasource) = dbPath.rsplit(':',1)
    startString = startDateTime.strftime("%H:%M_%Y%m%d")
    endString   =   endDateTime.strftime("%H:%M_%Y%m%d")
    try:
      (timeInfo,columns,rows) = rrdtool.fetch(dbPath,'AVERAGE','-s' + startString,'-e' + endString)
    except:
      log.exception("databaseFetch: unable to read from RRD %s" % dbPath)
      return
    if datasource not in columns:
      log.exception("databaseFetch: no such datasource '%s' in RRD %s" % (datasource,dbPath))
      return
    colIndex = list(columns).index(datasource)
    rows.pop() #chop off the last row because RRD sucks
    (start,end,step) = timeInfo
    values = (row[colIndex] for row in rows)
    return (timeInfo,values)
