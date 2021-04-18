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


from django import VERSION as DJANGO_VERSION
from django.contrib.auth.models import User
from graphite.account.models import Profile
from graphite.logger import log


def isAuthenticated(user):
    # is_authenticated() is changed to a boolean since 1.10, 2.0 removes the
    # backwards compatibilty
    if DJANGO_VERSION >= (1, 10):
        return user.is_authenticated
    else:
        return user.is_authenticated()


def getProfile(request, allowDefault=True):
    if isAuthenticated(request.user):
        return Profile.objects.get_or_create(user=request.user)[0]
    elif allowDefault:
        return default_profile()


def getProfileByUsername(username):
    try:
        return Profile.objects.get(user__username=username)
    except Profile.DoesNotExist:
        return None


def default_profile():
    # '!' is an unusable password. Since the default user never authenticates
    # this avoids creating a default (expensive!) password hash at every
    # default_profile() call.
    user, created = User.objects.get_or_create(
        username='default', defaults={'email': 'default@localhost.localdomain',
                                      'password': '!'})
    if created:
        log.info("Default user didn't exist, created it")
    profile, created = Profile.objects.get_or_create(user=user)
    if created:
        log.info("Default profile didn't exist, created it")
    return profile
