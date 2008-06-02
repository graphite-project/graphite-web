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

import sys, os
import commands
from parser import parseInput
from cPickle import load,dump
from string import letters
from web.util import getProfile
from django.conf import settings

def handleCommand(request):
  if 'commandInput' not in request.GET: return commands.stderr("No commandInput parameter!")

  #Variable substitution
  profile = getProfile(request)
  VARS = {}
  for variable in profile.variable_set.all():
    VARS[variable.name] = variable.value
  cmd = request.GET['commandInput']
  while '$' in cmd and not cmd.startswith('code'):
    i = cmd.find('$')
    j = i+1
    for char in cmd[i+1:]:
      if char not in letters: break
      j += 1
    var = cmd[i+1:j]
    if var in VARS:
      cmd = cmd[:i] + VARS[var] + cmd[j:]
    else:
      return commands.stderr("Unknown variable %s" % var)

  if cmd == '?': cmd = 'help'
  try:
    tokens = parseInput(cmd)
    if not tokens.command: return commands.stderr("Invalid syntax")
    func = '_' + tokens.command
    args = dict(tokens.items())
    del args['command']
    resp = vars(commands)[func](request,**args)
  except:
    return commands.printException()

  #Save command to history
  history = profile.history.split('\n')
  history.insert(0,cmd)
  while len(history) > 30: history.pop()
  profile.history = '\n'.join(history)
  profile.save()

  return resp
