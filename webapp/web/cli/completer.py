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

import sys, os, re
from django.conf import settings
from web.util import getProfile
from web.logger import log


def historyComplete(request,path):
  profile = getProfile(request)
  html = ''
  if path[:1] == '!': path = path[1:]
  html += "<ul>"
  history = profile.history.split('\n')
  for line in history:
    line = line.strip()
    if not line: continue
    if line.startswith(path):
      html += "<li>" + line + "</li>"
  html += "</ul>"
  return html

def drawComplete(request,path,short=False):
  html = ''
  path = re.sub('\w+\(','',path).replace(')','').replace('.','/') + '*'
  strippablePrefixes = ('draw ','add ','remove ')
  for prefix in strippablePrefixes:
    if path.startswith(prefix):
      path = path[len(prefix):]
      break
  matchList = []

  #Match whisper files
  expr = os.path.join(settings.WHISPER_DIR,path)
  log.info("wsp globbing expression: %s" % expr)
  for match in glob(expr):
    log.info("matched: %s" % match)
    if os.path.isfile(match):
      (match,ext) = os.path.splitext(match) #strip file extension
    graphitePath = match.replace(settings.WHISPER_DIR,'').replace('/','.')
    if short:
      graphitePath = graphitePath.split('.')[-1]
    if os.path.isdir(match):
      graphitePath += '.'
    matchList.append( graphitePath )

  #Finally, generate our html response
  html += "<ul>\n"
  for match in matchList:
    html += ' <li>' + match + '</li>\n'
  html += "</ul>\n"
  return html

def searchComplete(request,path):
  return drawComplete(request,path,short=True)

def match(path,file):
  pathParts = path.split('.')
  fileParts = file.split('.')

  if fileParts[0] == 'opeff': #some opeff rrd's have dots in their names, need to rejoin those components
    file += '.'
    filename = '.'.join(fileParts[2:])
    fileParts = fileParts[:2] + [filename]

  #Iterate through each part
  longest = max(len(pathParts),len(fileParts))
  for i in range(longest):
    if len(pathParts) == i: #end of pathParts
      return [ '.'.join(fileParts[:i]) + '.' ]
    if len(fileParts) == i: #end of fileParts
      if fileParts[0] != 'opeff': return [] #only read into opeff rrd's
      rrd = '/'.join(fileParts) + '.rrd'
      try:
        info = rrdtool.info(rrd)
      except:
        print >> sys.stderr, "Failed to read RRD info from %s" % rrd
        return []
      finalPathPart = '.'.join( pathParts[i:] ) #collapse excess pathParts into a single string
      return [file+ds for ds in info['ds'] if fnmatch(ds,finalPathPart)]
    if not fnmatch(fileParts[i],pathParts[i]): return [] #non-matching components
  return [file]
