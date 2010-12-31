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

import sys, os, urllib, time, traceback, cgi, re, socket
from cPickle import load,dump
from itertools import chain
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from graphite.util import getProfile, getProfileByUsername
from graphite.logger import log
from graphite.account.models import Profile, MyGraph, Variable, View, Window

#Utility functions
def printException():
  out = "<pre style='color: red'>"
  out += traceback.format_exc()
  out += "</pre>"
  return stdout(out)

def stdout(text,lineBreak=True):
  text = text.replace('"',"'")
  text = text.replace('\n','<br/>')
  br = ''
  if lineBreak: br = "<br/>"
  return """$('output').innerHTML += "%s%s"; """ % (text,br)

def stderr(text):
  return """$('output').innerHTML += "<font color='red'><b>%s</b></font><br/>"; """ % text.replace('"',"'")

#Commands
def _set(request,name,value):
  profile = getProfile(request)
  try:
    variable = profile.variable_set.get(name=name)
    variable.value = value
  except ObjectDoesNotExist:
    variable = Variable(profile=profile,name=name,value=value)
  variable.save()
  return ''

def _unset(request,name):
  profile = getProfile(request)
  try:
    variable = profile.variable_set.get(name=name)
    variable.delete()
  except ObjectDoesNotExist:
    return stderr("Unknown variable %s" % name)
  return ''

def _echo(request,args):
  return stdout(args)

def _vars(request):
  profile = getProfile(request)
  out = '<font color="#77ddcc">'
  for variable in profile.variable_set.all():
    out += '%s = %s<br/>' % (variable.name,variable.value)
  out += '</font>'
  return stdout(out)

def _clear(request):
  return "$('output').innerHTML = '';\n"

def _create(request,window):
  out = ''
  w = window.replace('.', '_')
  #Basic window creation
  out += "%s_win = new Window('%s_win', {title: '%s',width: 350, height: 225, maximizable: false});\n" % (w,w,w)
  out += "center = Builder.node( 'center', [Builder.node('img', {id: '%s_img',src: '/content/img/graphite.png'} )] );\n" % w
  out += "%s_win.getContent().appendChild( center );\n" % w
  out += "%s_win.setDestroyOnClose();\n" % w
  out += "%s_win.showCenter();\n" % w
  #Useful redraw function
  out += "function %s_redraw() {\n" % w
  out += "  if (window.%s_timer) { clearTimeout(window.%s_timer); }\n" % (w,w)
  out += "  img = $('%s_img');\n" % w
  out += "  if (!img) { return false; }\n"
  out += "  url = img.src;\n"
  out += "  i = url.indexOf('&uniq=');\n"
  out += "  if (i == -1) {\n"
  out += "    url += '&uniq=' + Math.random();\n"
  out += "  } else {\n"
  out += "    url = url.replace(/&uniq=[^&]+/,'&uniq=' + Math.random());\n"
  out += "  }\n"
  out += "  img.src = url;\n"
  out += "  window.%s_timer = setTimeout('window.%s_redraw()', window.%s_interval);\n" % (w,w,w)
  out += "}\n"
  out += "window.%s_redraw = %s_redraw;\n" % (w,w)
  return out

def _draw(request,targets,_from=None,until=None,template=None,window=None,interval=None):
    out = ''
    params = [ ('target',t) for t in targets ]
    if _from: params.append( ('from',_from) )
    if until: params.append( ('until',until) )
    if template: params.append( ('template',template) )
    url = '/render?' + urllib.urlencode(params)
    if window:
      w = window
      out += "win = %s_win;\n" % w
      out += "img_id = '%s_img';\n" % w
      out += "img = $(img_id);\n"
      out += "if (!win) {\n"
      out += "  alert('No such window %s');\n" % w
      out += "} else {\n"
      out += "  url = '%s';\n" % url
      out += "  size = win.getSize();\n"
      out += "  if (size['height'] < 100 || size['width'] < 100) {\n"
      out += "     alert('Window is too small!');\n"
      out += "  } else {\n"
      out += "    url += '&height=' + (size['height']) + '&' + 'width=' + (size['width']);\n"
      out += "    window.changeImage(win,url);\n"
      out += "  }\n"
      out += "}\n"
      if interval:
        i = int(interval)
	out += "window.%s_interval = %d * 60000;\n" % (w,i)
        out += "window.%s_timer = setTimeout('window.%s_redraw()', window.%s_interval);\n" % (w,w,w)
    else:
      return stdout("<img src='%s' onload='scrollBy(0,this.height + 1000);'>" % url)
    return out

def _redraw(request,window,interval):
  out = ''
  w = window
  i = int(interval)
  out += "img = $('%s_img');\n" % w
  out += "if (!img) {\n"
  out += "  alert('No such window %s');\n" % w
  out += "} else {\n"
  out += "  if (window.%s_timer) { clearTimeout(window.%s_timer); }\n" % (w,w)
  out += "  window.%s_interval = %d * 60000;\n" % (w,i)
  out += "  window.%s_timer = setTimeout('window.%s_redraw()', window.%s_interval);\n" % (w,w,w)
  out += "}\n"
  return out

def _email(request,window,addressList):
  out = ''
  w = window
  addrList = ','.join(addressList)
  params = { 'commandInput' : 'doemail', 'recipients' : addrList, 'title' : w}
  paramStr = urllib.urlencode(params)
  out += "img = $('%s_img');\n" % w
  out += "if (!img) {\n"
  out += "  alert('No such window %s');\n" % w
  out += "} else {\n"
  out += "  url = img.src;\n"
  out += "  params = '%s' + '&url=' + escape(url);\n" % paramStr
  out += "  emailreq = new Ajax.Request('/cli/eval', {method: 'get', parameters: params, onException: handleException, onComplete: handleResponse});\n"
  out += "}\n"
  return out

def _doemail(request):
  cgiParams = request.GET
  assert 'recipients' in cgiParams and 'url' in cgiParams and 'title' in cgiParams, "Incomplete doemail, requires recipients, url, and title"
  import smtplib, httplib, urlparse
  from email.MIMEMultipart import MIMEMultipart
  from email.MIMEText import MIMEText
  from email.MIMEImage import MIMEImage
  url = cgiParams['url']
  title = cgiParams['title']
  recipients = cgiParams['recipients'].split(',')
  proto, server, path, query, frag = urlparse.urlsplit(url)
  if query: path += '?' + query
  conn = httplib.HTTPConnection(server)
  conn.request('GET',path)
  resp = conn.getresponse()
  assert resp.status == 200, "Failed HTTP response %s %s" % (resp.status, resp.reason)
  rawData = resp.read()
  conn.close()
  message = MIMEMultipart()
  message['Subject'] = "Graphite Image"
  message['To'] = ', '.join(recipients)
  message['From'] = 'frontend@%s' % socket.gethostname()
  text = MIMEText( "Image generated by the following graphite URL at %s\r\n\r\n%s" % (time.ctime(),url) )
  image = MIMEImage( rawData )
  image.add_header('Content-Disposition', 'attachment', filename=title + time.strftime("_%b%d_%I%M%p.png"))
  message.attach(text)
  message.attach(image)
  server = smtplib.SMTP(settings.SMTP_SERVER)
  server.sendmail('frontend@%s' % socket.gethostname(),recipients,message.as_string())
  server.quit()
  return stdout("Successfully sent %s to %s" % (url,cgiParams['recipients']))

def _code(request,code):
  return code

def _url(request,window):
  out = ''
  w = window
  out += "img = $('%s_img');\n" % w
  out += "if (!img) {\n"
  out += "  alert('No such window %s');\n" % w
  out += "} else {\n"
  out += "  url = img.src;\n"
  out += "  $('output').innerHTML += '%s URL is ' + url + '<br/>';\n" % w
  out += "}\n"
  return out

def _help(request):
  return "window.open('%s','doc');" % settings.DOCUMENTATION_URL

def _change(request,window,var,value):
  out = ''
  out += "function changeWindow(win) {\n"
  out += "  var img = $(win + '_img');\n"
  out += "  if (!img) {\n"
  out += "    alert('No such window ' + win);\n"
  out += "  } else {\n"
  out += "    var url = new String(img.src);\n"
  out += "    var i = url.indexOf('?');\n"
  out += "    if (i == -1) {\n"
  out += "      alert('Invalid url in image! url=' + url);\n"
  out += "    } else {\n"
  out += "      var base = url.substring(0,i);\n"
  out += "      var qs = url.substring(i+1,url.length+1);\n"
  out += "      var found = false;\n"
  out += "      var pairs = qs.split('&').collect( function(pair) {\n"
  out += "        var p = pair.split('=');\n"
  out += "        if (p[0] == '%s') {\n" % var
  out += "          found = true;\n"
  out += "          return p[0] + '=' + escape('%s');\n" % value
  out += "        }\n"
  out += "        return pair;\n"
  out += "      });\n"
  out += "      var newqs = pairs.join('&');\n"
  out += "      if (!found) { newqs += '&%s=' + escape('%s'); }\n" % (var,value)
  out += "      img.src = base + '?' + newqs;\n"
  out += "    }\n"
  out += "  }\n"
  out += "}\n"
  if window == '*':
    out += "Windows.windows.each( function(winObject) {\n"
    out += "  var name = winObject.getId().replace('_win','');\n"
    out += "  changeWindow(name);\n"
    out += "});\n"
  else:
    out += "changeWindow('%s');" % window
  return out

def _add(request,target,window):
  out = ''
  out += "img = $('%s_img');\n" % window
  out += "if (!img) {\n"
  out += "  alert('No such window %s');\n" % window
  out += "} else {\n"
  out += "  if (img.src.indexOf('/render') == -1) {\n"
  out += "    img.src = '/render?';\n"
  out += "  }\n"
  out += "  img.src = img.src + '&target=' + encodeURIComponent('%s');\n" % target
  out += "}\n"
  return out

def _remove(request,target,window):
  out = ''
  out += "img = $('%s_img');\n" % window
  out += "if (!img) {\n"
  out += "  alert('No such window %s');\n" % window
  out += "} else {\n"
  out += "  var url = new String(img.src);\n"
  out += "  var beginningTarget = '?target=' + encodeURIComponent('%s');\n" % target
  out += "  var newurl = url.replace(beginningTarget,'?');\n"
  out += "  var laterTarget = '&target=' + escape('%s');\n" % target
  out += "  newurl = newurl.replace(laterTarget,'');\n"
  out += "  img.src = newurl;\n"
  out += "}\n"
  return out

def _find(request,pattern):
  pattern = pattern.strip()
  r = re.compile(pattern,re.I)
  out = ''
  found = 0
  displayMax = 100
  rrdIndex = open(settings.STORAGE_DIR + '/rrd_index')
  wspIndex = open(settings.STORAGE_DIR + '/wsp_index')
  for line in chain(wspIndex,rrdIndex):
    if r.search(line):
      found += 1
      if found <= displayMax:
        out += line.replace('/','.')
  if found >= displayMax:
    out += '<font color="red">Displaying %d out of %d matches, try refining your search</font>' % (displayMax,found)
  else:
    out += 'Found %d matches' % found
  return stdout(out)

def _save(request,view):
  if not settings.ALLOW_ANONYMOUS_CLI and not request.user.is_authenticated():
    return stderr("You must be logged in to use this functionality.")
  out = ''
  out += "allParams = {};\n"
  out += "Windows.windows.each( function(winObject) {\n"
  out += "  name = winObject.getId().replace('_win','');\n"
  out += "  winElement = $(name + '_win');\n"
  out += "  img_id = name + '_img';\n"
  out += "  img = $(img_id);\n"
  out += "  url = img.src;\n"
  out += "  _top = winElement.style.top\n"
  out += "  left = winElement.style.left\n"
  out += "  size = winObject.getSize();\n"
  out += "  width = size.width;\n"
  out += "  height = size.height;\n"
  out += "  myParams = 'top=' + _top + '&left=' + left + '&width=' + width + '&height=' + height + '&url=' + escape(url);\n"
  out += "  if (window[name+'_interval']) { myParams += '&interval=' + window[name+'_interval']; }\n"
  out += "  allParams[name] = escape(myParams);\n"
  out += "});\n"
  out += "if (allParams) {\n"
  out += "  queryString = 'commandInput=dosave%%20%s&' + $H(allParams).toQueryString();\n" % view
  out += "  savereq = new Ajax.Request('/cli/eval', {method: 'get', parameters: queryString, onException: handleException, onComplete: handleResponse});\n"
  out += "}\n"
  return out

def _dosave(request,viewName):
  profile = getProfile(request)
  #First find our View
  log.info("Saving view '%s' under profile '%s'" % (viewName,profile.user.username))
  try:
    view = profile.view_set.get(name=viewName)
  except ObjectDoesNotExist:
    view = View(profile=profile,name=viewName)
    view.save()
  #Now re-associate the view with the correct Windows
  view.window_set.all().delete()
  for windowName,encodedString in request.GET.items():
    try:
      if windowName in ('_','commandInput'): continue
      paramString = urllib.unquote_plus(encodedString)
      queryParams = cgi.parse_qs(paramString)
      modelParams = {}
      for key,value in queryParams.items(): #Clean up the window params
        key = str(key)
        value = str(value[0])
        if key in ('top','left'):
          value = int(float( value.replace('px','') ))
        if key in ('width','height','interval'):
          value = int(float(value))
        modelParams[key] = value
      if 'interval' not in modelParams:
        modelParams['interval'] = None
      win = Window(view=view,name=windowName,**modelParams)
      win.save()
    except:
      log.exception("Failed to process parameters for window '%s'" % windowName)
  return stdout('Saved view %s' % viewName)

def _load(request,viewName,above=None):
  if above:
    out = stdout("Loading view %s above the current view" % viewName)
  else:
    out = stdout("Loading view %s" % viewName)
  profile = getProfile(request)
  try:
    view = profile.view_set.get(name=viewName)
  except ObjectDoesNotExist:
    return stderr("Unknown view %s" % viewName)
  if not above:
    out += "Windows.windows.each( function(w) {w.destroy();} );"
  for window in view.window_set.all():
    out += _create(request,window.name)
    out += "win = %s_win;" % window.name
    out += "$('%s_img').src = '%s';" % (window.name,window.url)
    out += "win.show();"
    out += "win.setLocation(%d,%d);" % (window.top,window.left)
    out += "win.setSize(%d,%d);" % (window.width,window.height)
    if window.interval:
      out += "window.%s_interval = %d;" % (window.name,window.interval)
      out += "window.%s_timer = setTimeout('window.%s_redraw()', window.%s_interval);" % ((window.name,) * 3)
  return out

def _gsave(request,graphName):
  profile = getProfile(request,allowDefault=False)
  if not profile: return stderr("You must be logged in to save graphs")
  out =  "img = $('%s_img');\n" % graphName
  out += "if (!img) {\n"
  out += "  alert('No such window');\n"
  out += "} else {\n"
  out += "  queryString = 'commandInput=dogsave%%20%s&url=' + escape(img.src);\n" % graphName
  out += "  savereq = new Ajax.Request('/cli/eval', {method: 'get', parameters: queryString, onException: handleException, onComplete: handleResponse});\n"
  out += "}\n"
  return out

def _dogsave(request,graphName):
  profile = getProfile(request,allowDefault=False)
  if not profile: return stderr("You must be logged in to save graphs")
  url = request.GET.get('url')
  if not url: return stderr("No url specified!")
  try:
    existingGraph = profile.mygraph_set.get(name=graphName)
    existingGraph.url = url
    existingGraph.save()
  except ObjectDoesNotExist:
    try:
      newGraph = MyGraph(profile=profile,name=graphName,url=url)
      newGraph.save()
    except:
      log.exception("Failed to create new MyGraph in _dogsave(), graphName=%s" % graphName)
      return stderr("Failed to save graph %s" % graphName)
  return stdout("Saved graph %s" % graphName)

def _gload(request,user=None,graphName=None):
  if not user:
    profile = getProfile(request,allowDefault=False)
    if not profile: return stderr("You are not logged in so you must specify a username")
  else:
    try:
      profile = getProfileByUsername(user)
    except ObjectDoesNotExist:
      return stderr("User does not exist")
  try:
    myGraph = profile.mygraph_set.get(name=graphName)
  except ObjectDoesNotExist:
    return stderr("Graph does not exist")
  out = _create(request,myGraph.name)
  out += "changeImage(%s_win,'%s');\n" % (myGraph.name.replace('.', '_'), myGraph.url)
  return out

def _graphs(request,user=None):
  if not user:
    profile = getProfile(request,allowDefault=False)
    if not profile: return stderr("You are not logged in so you must specify a username")
  else:
    try:
      profile = getProfileByUsername(user)
    except ObjectDoesNotExist:
      return stderr("User does not exist")
  out = ""
  if user:
    prefix = "~%s/" % user
  else:
    prefix = ""
  for graph in profile.mygraph_set.all():
    out += stdout(prefix + graph.name)
  return out

def _views(request):
  out = ''
  profile = getProfile(request)
  for view in profile.view_set.all():
    windowList = ','.join([window.name for window in view.window_set.all()])
    out += stdout("%s: %s" % (view.name,windowList))
  return out

def _rmview(request,viewName):
  profile = getProfile(request)
  try:
    view = profile.view_set.get(name=viewName)
  except ObjectDoesNotExist:
    return stderr("No such view '%s'" % viewName)
  view.delete()
  return stdout("Deleted view %s" % viewName)

def _rmgraph(request,graphName):
  profile = getProfile(request,allowDefault=False)
  try:
    graph = profile.mygraph_set.get(name=graphName)
  except ObjectDoesNotExist:
    return stderr("No such graph %s" % graphName)
  graph.delete()
  return stdout("Deleted graph %s" % graphName)

def _compose(request,window):
  out  = "var url = $('%s_img').src;\n" % window
  out += "var re = /target=([^&]+)/;\n"
  out += "if ( url.match(re) == null ) {\n"
  out += "  alert('Image has no targets!');\n"
  out += "} else {\n"
  out += "  composerURL = '/?' + url.substr(url.indexOf('?') + 1);\n";
  out += "  composerWin = window.open(composerURL, 'GraphiteComposer');\n"
  out += stdout('A new composer window has been opened.')
  #out += "  var i = 0;"
  #out += "  var m = true;\n"
  #out += "  while ( m = url.substr(i).match(re) ) {\n"
  #out += "    setTimeout(\"composerWin.Composer.toggleTarget('\" + m[1] + \"')\",2500);\n"
  #out += "    i += m.index + m[1].length;\n"
  #out += "  }\n"
  out += "}\n"
  return out

def _login(request):
  if request.user.is_authenticated():
    return stderr("You are already logged in as %s" % request.user.username)
  else:
    return "window.location = '/account/login/?nextPage=' + encodeURIComponent('/cli/');"

def _logout(request):
  if not request.user.is_authenticated():
    return stderr("You are not logged in!")
  else:
    return "window.location = '/account/logout/?nextPage=' + encodeURIComponent('/cli/');"

def _id(request):
  if request.user.is_authenticated():
    return stdout("You are logged in as %s" % request.user.username)
  else:
    return stdout("You are not logged in.")
_whoami = _id
