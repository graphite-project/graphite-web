import datetime
import time

import simplejson

from django.http import HttpResponse
from django.shortcuts import render_to_response, get_object_or_404

from graphite.events import models
from graphite.render.attime import parseATTime


def to_timestamp(dt):
    return time.mktime(dt.timetuple())


class EventEncoder(simplejson.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return to_timestamp(obj)
        return simplejson.JSONEncoder.default(self, obj)


def view_events(request):
    if request.method == "GET":
        context = dict(events=fetch(request))
        return render_to_response("events.html", context)
    else:
        return post_event(request)

def detail(request, event_id):
    e = get_object_or_404(models.Event, pk=event_id)
    context = dict(event=e)
    return render_to_response("event.html", context)


def post_event(request):
    if request.method == 'POST':
        event = simplejson.loads(request.raw_post_data)
        assert isinstance(event, dict)

        values = {}
        values["what"] = event["what"]
        values["tags"] = event.get("tags", None)
        values["when"] = datetime.datetime.fromtimestamp(
            event.get("when", time.time()))
        if "data" in event:
            values["data"] = event["data"]

        e = models.Event(**values)
        e.save()

        return HttpResponse(status=200)
    else:
        return HttpResponse(status=405)

def get_data(request):
    return HttpResponse(simplejson.dumps(fetch(request), cls=EventEncoder),
                        mimetype="application/json")

def fetch(request):
    if request.GET.get("from", None) is not None:
        time_from = parseATTime(request.GET["from"])
    else:
        time_from = datetime.datetime.fromtimestamp(0)

    if request.GET.get("until", None) is not None:
        time_until = parseATTime(request.GET["until"])
    else:
        time_until = datetime.datetime.now()

    tags = request.GET.get("tags", None)
    if tags is not None:
        tags = request.GET.get("tags").split(" ")

    return [x.as_dict() for x in
            models.Event.find_events(time_from, time_until, tags=tags)]
