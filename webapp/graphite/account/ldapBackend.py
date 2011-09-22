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

import ldap, traceback
from django.conf import settings
from django.contrib.auth.models import User


class LDAPBackend:
  def authenticate(self, username=None, password=None):
    try:
      conn = ldap.initialize(settings.LDAP_URI)
      conn.protocol_version = ldap.VERSION3
      conn.simple_bind_s( settings.LDAP_BASE_USER, settings.LDAP_BASE_PASS )
    except ldap.LDAPError:
      traceback.print_exc()
      return None

    scope = ldap.SCOPE_SUBTREE
    filter = settings.LDAP_USER_QUERY % username
    returnFields = ['dn','mail']
    try:
      resultID = conn.search( settings.LDAP_SEARCH_BASE, scope, filter, returnFields )
      resultType, resultData = conn.result( resultID, 0 )
      if len(resultData) != 1: #User does not exist
        return None

      userDN = resultData[0][0]
      try:
        userMail = resultData[0][1]['mail'][0]
      except:
        userMail = "Unknown"

      conn.simple_bind_s(userDN,password)
      try:
        user = User.objects.get(username=username)
      except: #First time login, not in django's database
        randomPasswd = User.objects.make_random_password(length=16) #To prevent login from django db user
        user = User.objects.create_user(username, userMail, randomPasswd)
        user.save()

      return user

    except ldap.INVALID_CREDENTIALS:
      traceback.print_exc()
      return None

  def get_user(self,user_id):
    try:
      return User.objects.get(pk=user_id)
    except User.DoesNotExist:
      return None
