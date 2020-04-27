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

import os
from graphite.user_util import getProfile
from graphite.logger import log
from graphite.account.models import MyGraph

from django.shortcuts import render
from django.http import HttpResponse
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist


def composer(request):
    profile = getProfile(request)
    context = {
        'queryString' : request.GET.urlencode().replace('+','%20'),
        'showTarget' : request.GET.get('showTarget',''),
        'user' : request.user,
        'profile' : profile,
        'showMyGraphs' : int( profile.user.username != 'default' ),
        'searchEnabled' : int( os.access(settings.INDEX_FILE, os.R_OK) ),
        'refreshInterval': settings.AUTO_REFRESH_INTERVAL,
        'debug' : settings.DEBUG,
        'jsdebug' : settings.DEBUG,
    }
    return render(request, "composer.html", context)


def mygraph(request):
    profile = getProfile(request, allowDefault=False)

    if not profile:
        return HttpResponse("You are not logged in!")

    action = request.GET['action']
    graphName = request.GET['graphName']

    if not graphName:
        return HttpResponse("You must type in a graph name.")

    if action == 'save':
        url = request.GET['url']

        try:
            existingGraph = profile.mygraph_set.get(name=graphName)
            existingGraph.url = url
            existingGraph.save()

        except ObjectDoesNotExist:
            try:
                newGraph = MyGraph(profile=profile,name=graphName,url=url)
                newGraph.save()
            except Exception:
                log.exception("Failed to create new MyGraph in /composer/mygraph/, graphName=%s" % graphName)
                return HttpResponse("Failed to save graph %s" % graphName)

        return HttpResponse("SAVED")

    elif action == 'delete':
        try:
            existingGraph = profile.mygraph_set.get(name=graphName)
            existingGraph.delete()

        except ObjectDoesNotExist:
            return HttpResponse("No such graph '%s'" % graphName)

        return HttpResponse("DELETED")

    else:
        return HttpResponse("Invalid operation '%s'" % action)
