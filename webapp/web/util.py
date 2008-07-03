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

from web.account.models import Profile
from web.logger import log


def getProfile(request,allowDefault=True):
  if request.user.is_authenticated():
    try:
      return Profile.objects.get(username=request.user.username)
    except Profile.DoesNotExist:
      profile = Profile(username=request.user.username) #history/vars/views autocreate empty?
      profile.save()
      return profile
  elif allowDefault:
    return defaultProfile

def getProfileByUsername(username):
  try:
    return Profile.objects.get(username=username)
  except Profile.DoesNotExist:
    return None

def getQueryString(request):
  try:
    return request._req.args
  except:
    return ""

try:
  defaultProfile = Profile.objects.get(username='default')
except Profile.DoesNotExist:
  log.info("Default profile does not exist, creating it...")
  defaultProfile = Profile(username='default')
  defaultProfile.save()
