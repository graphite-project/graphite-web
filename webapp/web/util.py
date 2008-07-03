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

from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User
from web.account.models import Profile
from web.logger import log


def getProfile(request,allowDefault=True):
  if request.user.is_authenticated():
    try:
      return request.user.profile
    except ObjectDoesNotExist:
      profile = Profile(user=request.user)
      profile.save()
      return profile
  elif allowDefault:
    return defaultProfile

def getProfileByUsername(username):
  try:
    user = User.objects.get(username=username)
    return Profile.objects.get(user=user)
  except ObjectDoesNotExist:
    return None

def getQueryString(request):
  try:
    return request._req.args #django needs to provide a better way of doing this...
  except:
    return ""

try:
  defaultProfile = Profile.objects.get(user=None)
except Profile.DoesNotExist:
  log.info("Default profile does not exist, creating it...")
  defaultProfile = Profile(user=None)
  defaultProfile.save()
