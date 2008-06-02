#!/usr/bin/env python
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

import os, posix, time
from cPickle import dumps
from twisted.web.resource import Resource


class CacheQueryService(Resource):
  isLeaf = True
  def __init__(self,cluster):
    Resource.__init__(self)
    self.cluster = cluster
    for cache in self.cluster.caches.values():
      cache.cacheQueries = 0

  def render_GET(self,req):
    metric = req.path[1:]
    cache = self.cluster.selectCache(metric)
    points = cache.get(metric,[])
    print 'CacheQuery for %s returning %d points' % (metric,len(points))
    cache.cacheQueries += 1
    return dumps( points )


class WebConsole(Resource):
  isLeaf = True
  def __init__(self,pypes,cluster,agents):
    Resource.__init__(self)
    self.pypes = pypes
    self.cluster = cluster
    self.agents = agents
    self.cpuUsage = -1.0
    self.memUsage = 0
    self.lastCalcTime = time.time()
    self.lastCpuVal = 0.0
    self.templates = {}
    for tmpl in os.listdir('templates'):
      if not tmpl.endswith('.tmpl'): continue
      self.templates[ tmpl[:-5] ] = open('templates/%s' % tmpl).read()
  
  def render_GET(self,req):
    if req.path == '/':
      return self.mainPage()
    if req.path == '/web.css':
      return open('web.css').read()

  def mainPage(self):
    if self.cpuUsage > 100 or self.cpuUsage < 0:
      cpuUsage = "..."
    else:
      cpuUsage = "%%%.2f" % self.cpuUsage
    memUsage = self.memUsage
    page = self.templates['main'] % locals()
    return page

  def updateUsage(self):
    now = time.time()
    t = posix.times()
    curCpuVal = t[0] + t[1]
    dt = now - self.lastCalcTime
    dv = curCpuVal - self.lastCpuVal
    self.cpuUsage = (dv / dt) * 100.0
    self.lastCalcTime = now
    self.lastCpuVal = curCpuVal
    #self.memUsage = int(open('/proc/self/status').readlines()[12].split()[1])
