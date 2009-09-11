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

from string import letters
from django.http import HttpResponse
from django.shortcuts import render_to_response
from graphite.util import getProfile
from graphite.cli import completer, commands, parser

def cli(request):
  context = dict( request.GET.items() )
  context['user'] = request.user
  context['profile'] = getProfile(request)
  return render_to_response("cli.html", context)

def autocomplete(request):
  assert 'path' in request.GET, "Invalid request, no 'path' parameter!"
  path = request.GET['path']
  shortnames = bool( request.GET.get('short') )

  if request.GET['path'][:1] == '!':
    profile = getProfile(request)
    html = completer.completeHistory(path, profile)
  else:
    html = completer.completePath(path, shortnames=shortnames)

  return HttpResponse( html )

def evaluate(request):
  if 'commandInput' not in request.GET:
    output = commands.stderr("No commandInput parameter!")
    return HttpResponse(output, mimetype='text/plain')

  #Variable substitution
  profile = getProfile(request)
  my_vars = {}
  for variable in profile.variable_set.all():
    my_vars[variable.name] = variable.value
  cmd = request.GET['commandInput']
  while '$' in cmd and not cmd.startswith('code'):
    i = cmd.find('$')
    j = i+1
    for char in cmd[i+1:]:
      if char not in letters: break
      j += 1
    var = cmd[i+1:j]
    if var in my_vars:
      cmd = cmd[:i] + my_vars[var] + cmd[j:]
    else:
      output = commands.stderr("Unknown variable %s" % var)
      return HttpResponse(output, mimetype='text/plain')

  if cmd == '?': cmd = 'help'

  try:
    tokens = parser.parseInput(cmd)

    if not tokens.command:
      output = commands.stderr("Invalid syntax")
      return HttpResponse(output, mimetype='text/plain')

    handler_name = '_' + tokens.command
    handler = vars(commands).get(handler_name)
    if handler is None:
      output = commands.stderr("Unknown command")
      return HttpResponse(output, mimetype='text/plain')

    args = dict( tokens.items() )
    del args['command']
    output = handler(request, **args)
  except:
    output = commands.printException()

  #Save command to history
  history = profile.history.split('\n')
  history.insert(0,cmd)
  while len(history) > 30: history.pop()
  profile.history = '\n'.join(history)
  profile.save()

  return HttpResponse(output, mimetype='text/plain')
