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

from django.shortcuts import render_to_response
from django.http import HttpResponseRedirect
from django.contrib.auth import authenticate, login, logout
from graphite.util import getProfile
from graphite.logger import log
from graphite.account.models import Profile


def loginView(request):
  username = request.POST.get('username')
  password = request.POST.get('password')
  if request.method == 'GET':
    nextPage = request.GET.get('nextPage','/')
  else:
    nextPage = request.POST.get('nextPage','/')
  if username and password:
    user = authenticate(username=username,password=password)
    if user is None:
      return render_to_response("login.html",{'authenticationFailed' : True, 'nextPage' : nextPage})
    elif not user.is_active:
      return render_to_response("login.html",{'accountDisabled' : True, 'nextPage' : nextPage})
    else:
      login(request,user)
      return HttpResponseRedirect(nextPage)
  else:
    return render_to_response("login.html",{'nextPage' : nextPage})

def logoutView(request):
  nextPage = request.GET.get('nextPage','/')
  logout(request)
  return HttpResponseRedirect(nextPage)

def editProfile(request):
  if not request.user.is_authenticated():
    return HttpResponseRedirect('../..')
  context = { 'profile' : getProfile(request) }
  return render_to_response("editProfile.html",context)

def updateProfile(request):
  profile = getProfile(request,allowDefault=False)
  if profile:
    profile.advancedUI = request.POST.get('advancedUI','off') == 'on'
    profile.save()
  nextPage = request.POST.get('nextPage','/')
  return HttpResponseRedirect(nextPage)
