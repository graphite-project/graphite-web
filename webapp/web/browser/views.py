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

import os, re
from glob import glob
from urllib import urlencode
from itertools import chain
from django.shortcuts import render_to_response
from django.http import HttpResponse, HttpResponseServerError
from django.conf import settings
from xml.dom import getDOMImplementation
from web.account.models import Profile
from web.util import log, getProfile, getProfileByUsername

try:
  import rrdtool
except:
  rrdtool = False

domImpl = getDOMImplementation()
J = os.path.join

def routeLookup(request):
  lookup = {"hierarchyLookup":hierarchyLookup,"userLookup":userLookup,"myLookup":myLookup}
  return lookup[request.GET['lookupRoute']](request)

def header(request):
  context = {}
  context['user'] = request.user
  context['profile'] = getProfile(request)
  return render_to_response("browserHeader.html", context)

def browser(request):
  context = {'queryString':'','target':request.GET.get('target',None)} # you updated this dummy!
  for key in request.GET.keys():
    itemList = request.GET.getlist(key)
    for item in itemList:
      context['queryString'] += key+'='+item+'&'
  return render_to_response("browser.html", context) 

def sidebar(request):
  context = dict( request.GET.items() )
  context['user'] = request.user
  context['profile'] = getProfile(request)
  return render_to_response("browserSidebar.html", context)


def hierarchyLookup(request):
  profile = getProfile(request)
  path = request.GET['nodeName']
  fullPath = J(settings.DATA_DIR,*path.split('.')[1:]) #strip initial "Graphite"
  fullPathExpr = fullPath + '/*'
  jsonData = []
  defaultDirNode = {'allowDrag': 0,
                    'allowChildren': 1,
		    'expandable': 1,
		    'leaf': 0,
		    'lookupRoute':'hierarchyLookup'}
  defaultFileNode = {'allowDrag': 0,
                     'allowChildren': 0,
		     'expandable': 0,
		     'leaf': 1,
		     'lookupRoute':'hierarchyLookup'}
  try:
    matches = glob(fullPathExpr)
    matches.sort(key=os.path.basename)
    if len(matches) > 2 and profile.advancedUI: #Wildcard when at least 2 options available
      starNode = {'text':'*', 'id':'*'}
      if filter(os.path.isdir,matches): starNode.update(defaultDirNode) #had 1+ dirs
      else: starNode.update(defaultFileNode) #had only files
      jsonData.append(starNode)

    alreadyInserted = set()
    for match in matches: #Now let's add the real options
      if os.path.isfile(match) and match.endswith('.wsp'): match = match[:-4]
      metricName = os.path.basename(match)
      if metricName in alreadyInserted: continue
      alreadyInserted.add(metricName)
      metricPath = J( fullPath[len(settings.DATA_DIR):],metricName ).replace("/",".")
      jsonNode = {'text':metricName,'id':metricName}
      if os.path.isdir(match): jsonNode.update(defaultDirNode)
      else: jsonNode.update(defaultFileNode)
      jsonData.append(jsonNode)

    response = HttpResponse(str(jsonData),mimetype="text")
    response['Pragma'] = 'no-cache'
    response['Cache-Control'] = 'no-cache'
    return response
  except:
    log.exception("browser.views.heirarchLookup(): could not complete request for %s" % fullPath)
    return HttpResponse("[]",mimetype="text")

def myLookup(request):
  profile = getProfile(request,allowDefault=False)
  assert profile
  jsonData = []
  defaultFileNode = {'allowDrag':0,'allowChildren':0,'expandable':0,'leaf':1,'lookupRoute':'myLookup'}
  try:
    for graph in profile.mygraph_set.all().order_by('name'):
      jsonNode = {'text':graph.name,'id':graph.name,'graphUrl':graph.url}
      jsonNode.update(defaultFileNode)
      jsonData.append(jsonNode)
    response = HttpResponse(str(jsonData),mimetype="text")
    response['Pragma'] = 'no-cache'
    response['Cache-Control'] = 'no-cache'
    return response
  except:
    log.exception("browser.views.myLookup(): could not complete request.")
    return HttpResponse("[]",mimetype="text")

def userLookup(request):
  username = '/'.join( request.GET['nodeName'].split('.')[1:] ) #strip initial UserLookup/
  jsonData = []
  defaultDirNode = {'allowDrag':0,'allowChildren':1,'expandable':1,'leaf':0,'lookupRoute':'userLookup'}
  defaultFileNode = {'allowDrag':0,'allowChildren':0,'expandable':0,'leaf':1,'lookupRoute':'userLookup'}
  try:
    if not username:
      try:
        profiles = Profile.objects.exclude(username='default')
      except ObjectDoesNotExist:
        profiles = []
      for profile in profiles:
        if profile.mygraph_set.count():
	  jsonNode = {'text':profile.username,'id':profile.username}
	  jsonNode.update(defaultDirNode)
	  jsonData.append(jsonNode)
    else:
      profile = getProfileByUsername(username)
      try:
        assert profile
      except:
        log.exception("No profile for username '%s'" % username)
        raise
      for graph in profile.mygraph_set.all().order_by('name'):
        jsonNode = {'text':graph.name,'id':graph.name,'graphUrl':graph.url}
	jsonNode.update(defaultFileNode)
	jsonData.append(jsonNode)
    response = HttpResponse(str(jsonData),mimetype="text")
    response['Pragma'] = 'no-cache'
    response['Cache-Control'] = 'no-cache'
    return response
  except:
    log.exception("browser.views.userLookup(): could not complete request for %s" % username)
    return HttpResponse("[]",mimetype="text")
    

def search(request):
  queries = request.POST['query'].split()
  if not queries: return HttpResponseServerError("No query input given")
  regexList = [re.compile(query,re.I) for query in queries]
  def matches(s):
    for regex in regexList:
      if not regex.search(s): return False
    return True
  results = []
  wspIndex = open(settings.STORAGE_DIR + '/wsp_index')
  rrdIndex = open(settings.STORAGE_DIR + '/rrd_index')
  for line in chain(wspIndex,rrdIndex):
    line = line.strip()
    if not line: continue
    if not matches(line): continue
    results.append(line)
    if len(results) >= 100: break
  resultList = ','.join(results)
  return HttpResponse(resultList,mimetype="text/plain")
