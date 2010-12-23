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

def hashRequest(request):
  # Normalize the request parameters so ensure we're deterministic
  queryParams = ["%s=%s" % (key, '&'.join(values))
                 for (key,values) in request.GET.lists()
                 if not key.startswith('_')]

  normalizedParams = ','.join( sorted(queryParams) ) or 'noParam'
  myHash = stripControlChars(normalizedParams) #memcached doesn't like unprintable characters in its keys

  if len(myHash) > 249: #memcached key size limitation
    return compactHash(myHash)
  else:
    return myHash


def hashData(targets, startTime, endTime):
  targetsString = ','.join(targets)
  startTimeString = startTime.strftime("%Y%m%d_%H%M")
  endTimeString = endTime.strftime("%Y%m%d_%H%M")
  myHash = targetsString + '@' + startTimeString + ':' + endTimeString
  myHash = stripControlChars(myHash)
  if len(myHash) > 249:
    return compactHash(myHash)
  else:
    return myHash


def stripControlChars(string):
  return filter(lambda char: ord(char) >= 33, string)


def compactHash(string):
  hash = md5.md5()
  hash.update(string)
  return hash.hexdigest()
