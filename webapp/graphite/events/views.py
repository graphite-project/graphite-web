import datetime

import pytz

from django.utils.timezone import now, make_aware
from django.core.urlresolvers import get_script_prefix
from django.http import HttpResponse
from django.shortcuts import render_to_response, get_object_or_404

from graphite.util import json, epoch
from graphite.events.models import Event
from graphite.render.attime import parseATTime


class EventEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return epoch(obj)
        return json.JSONEncoder.default(self, obj)

def view_events(request):
    if request.method == "GET":
        context = { 'events' : fetch(request),
            'slash' : get_script_prefix()
        }
        return render_to_response("events.html", context)
    else:
        return post_event(request)

def detail(request, event_id):
    e = get_object_or_404(Event, pk=event_id)
    context = { 'event' : e,
       'slash' : get_script_prefix()
    }
    return render_to_response("event.html", context)


def post_event(request):
    if request.method == 'POST':
        event = json.loads(request.body)
        assert isinstance(event, dict)

        if 'when' in event:
            when = make_aware(
                datetime.datetime.utcfromtimestamp(event['when']),
                pytz.utc)
        else:
            when = now()
        Event.objects.create(
            what=event['what'],
            tags=event.get("tags"),
            when=when,
            data=event.get("data", ""),
        )
        return HttpResponse(status=200)
    else:
        return HttpResponse(status=405)


def get_data(request):
    if 'jsonp' in request.REQUEST:
        response = HttpResponse(
          "%s(%s)" % (request.REQUEST.get('jsonp'), 
              json.dumps(fetch(request), cls=EventEncoder)),
          content_type='text/javascript')
    else:
        response = HttpResponse(
            json.dumps(fetch(request), cls=EventEncoder),
            content_type="application/json")
    return response

def fetch(request):
    if request.GET.get("from") is not None:
        time_from = parseATTime(request.GET["from"])
    else:
        time_from = datetime.datetime.fromtimestamp(0)

    if request.GET.get("until") is not None:
        time_until = parseATTime(request.GET["until"])
    else:
        time_until = datetime.datetime.now()

    tags = request.GET.get("tags")
    if tags is not None:
        tags = request.GET.get("tags").split(" ")

    return [x.as_dict() for x in
            Event.find_events(time_from, time_until, tags=tags)]
