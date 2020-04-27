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

from django.contrib.auth import authenticate, login, logout
try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.shortcuts import render
from graphite.user_util import getProfile, isAuthenticated


def loginView(request):
    username = request.POST.get('username')
    password = request.POST.get('password')
    if request.method == 'GET':
        nextPage = request.GET.get('nextPage', reverse('browser'))
    else:
        nextPage = request.POST.get('nextPage', reverse('browser'))
    if username and password:
        user = authenticate(username=username,password=password)
        if user is None:
            return render(request, "login.html",{'authenticationFailed' : True, 'nextPage' : nextPage})
        elif not user.is_active:
            return render(request, "login.html",{'accountDisabled' : True, 'nextPage' : nextPage})
        else:
            login(request,user)
            return HttpResponseRedirect(nextPage)
    else:
        return render(request, "login.html",{'nextPage' : nextPage})


def logoutView(request):
    nextPage = request.GET.get('nextPage', reverse('browser'))
    logout(request)
    return HttpResponseRedirect(nextPage)


def editProfile(request):
    if not isAuthenticated(request.user):
        return HttpResponseRedirect(reverse('browser'))
    context = { 'profile' : getProfile(request) }
    return render(request, "editProfile.html",context)


def updateProfile(request):
    profile = getProfile(request,allowDefault=False)
    if profile:
        profile.advancedUI = request.POST.get('advancedUI','off') == 'on'
        profile.save()
    nextPage = request.POST.get('nextPage', reverse('browser'))
    return HttpResponseRedirect(nextPage)
