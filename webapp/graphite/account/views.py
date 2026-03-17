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
    from django.urls import reverse
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.utils.http import url_has_allowed_host_and_scheme
from graphite.user_util import getProfile, isAuthenticated


def _get_safe_next_page(request, param_value):
    """Return param_value if it is a safe local redirect target, otherwise the browser URL."""
    if url_has_allowed_host_and_scheme(
        url=param_value,
        allowed_hosts={request.get_host()},
        require_https=request.is_secure(),
    ):
        return param_value
    return reverse('browser')


def loginView(request):
    username = request.POST.get('username')
    password = request.POST.get('password')
    if request.method == 'GET':
        nextPage = _get_safe_next_page(request, request.GET.get('nextPage', reverse('browser')))
    else:
        nextPage = _get_safe_next_page(request, request.POST.get('nextPage', reverse('browser')))
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
    nextPage = _get_safe_next_page(request, request.GET.get('nextPage', reverse('browser')))
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
    nextPage = _get_safe_next_page(request, request.POST.get('nextPage', reverse('browser')))
    return HttpResponseRedirect(nextPage)
