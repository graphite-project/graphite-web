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
import pickle
from random import randint
from django.conf import settings

from graphite.compat import HttpResponse
from graphite.util import unpickle


def add(request):
    metrics = set( request.POST['metrics'].split() )
    whitelist = load_whitelist()
    new_whitelist = whitelist | metrics
    save_whitelist(new_whitelist)
    return HttpResponse(content_type="text/plain", content="OK")


def remove(request):
    metrics = set( request.POST['metrics'].split() )
    whitelist = load_whitelist()
    new_whitelist = whitelist - metrics
    save_whitelist(new_whitelist)
    return HttpResponse(content_type="text/plain", content="OK")


def show(request):
    whitelist = load_whitelist()
    members = '\n'.join( sorted(whitelist) )
    return HttpResponse(content_type="text/plain", content=members)


def load_whitelist():
    buffer = open(settings.WHITELIST_FILE, 'rb').read()
    whitelist = unpickle.loads(buffer)
    return whitelist


def save_whitelist(whitelist):
    # do this instead of dump() to raise potential exceptions before open()
    serialized = pickle.dumps(whitelist, protocol=-1)
    tmpfile = '%s-%d' % (settings.WHITELIST_FILE, randint(0, 100000))
    try:
        fh = open(tmpfile, 'wb')
        fh.write(serialized)
        fh.close()
        if os.path.exists(settings.WHITELIST_FILE):
            os.unlink(settings.WHITELIST_FILE)
        os.rename(tmpfile, settings.WHITELIST_FILE)
    finally:
        if os.path.exists(tmpfile):
            os.unlink(tmpfile)
