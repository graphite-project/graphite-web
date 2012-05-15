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
from graphite.util import getProfile
from graphite.logger import log
from graphite.storage import STORE


def completeHistory(path, profile):
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

def completePath(path, shortnames=False):
  # Have to extract the path expression from the command
  for prefix in ('draw ','add ','remove '):
    if path.startswith(prefix):
      path = path[len(prefix):]
      break

  pattern = re.sub('\w+\(','',path).replace(')','') + '*'

  results = []
  
  for node in STORE.find(pattern):
    if shortnames:
      results.append(node.name)
    else:
      results.append(node.path)

  list_items = ["<li>%s</li>" % r for r in results]
  list_element = "<ul>" + '\n'.join(list_items) + "</ul>"
  return list_element
