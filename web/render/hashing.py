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

import md5, time

def imageHash(targetList,options):
  if not targetList: return ''
  optList = []
  for key in sorted( options.keys() ):
    key = ''.join([c for c in str(key) if ord(c) >= 33]) #strip control characters for memcached
    value = ''.join([c for c in str(options[key]) if ord(c) >= 33])
    optList.append( key + '=' + value )
  hash = '&'.join(targetList + optList)
  if len(hash) > 249: return shortHash(hash)
  return hash

def pathHash(name):
  now = time.time()
  minute = int(now - (now % 60))
  name = ''.join([c for c in name if ord(c) >= 33]) + '|' + str(minute)
  if len(name) > 249: return shortHash(name)
  return name

def rawDataHash(seriesList):
  seriesList.sort(key=lambda s: s.name)
  hash = ','.join(["%s:%d:%d:%d" % (s.name,s.start,s.end,s.step) for s in seriesList])
  if len(hash) > 249: return shortHash(hash)
  return hash

def shortHash(string):
  hash = md5.md5()
  hash.update(string)
  return hash.hexdigest()
