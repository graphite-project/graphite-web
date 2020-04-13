import datetime
import six

try:
    from django.contrib.sites.requests import RequestSite
except ImportError:  # Django < 1.9
    from django.contrib.sites.models import RequestSite

from django.core.exceptions import ObjectDoesNotExist
from django.core.serializers.json import DjangoJSONEncoder
from django.forms.models import model_to_dict
from django.shortcuts import render, get_object_or_404
from django.utils.timezone import now

from graphite.util import json, epoch, epoch_to_dt, jsonResponse, HttpError, HttpResponse
from graphite.events.models import Event
from graphite.render.attime import parseATTime


class EventEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return epoch(obj)
        return json.JSONEncoder.default(self, obj)


def view_events(request):
    if request.method == 'GET':
        context = {'events': fetch(request),
                   'site': RequestSite(request),
                   'protocol': 'https' if request.is_secure() else 'http'}
        return render(request, 'events.html', context)
    else:
        return post_event(request)


@jsonResponse(encoder=DjangoJSONEncoder)
def jsonDetail(request, queryParams, event_id):
    try:
        e = Event.objects.get(id=event_id)
        e.tags = e.tags.split()
        return model_to_dict(e)
    except ObjectDoesNotExist:
        raise HttpError('Event matching query does not exist', status=404)


def detail(request, event_id):
    if request.META.get('HTTP_ACCEPT') == 'application/json':
        return jsonDetail(request, event_id)

    e = get_object_or_404(Event, pk=event_id)
    context = {'event': e}
    return render(request, 'event.html', context)


def post_event(request):
    if request.method == 'POST':
        event = json.loads(request.body)
        assert isinstance(event, dict)

        tags = event.get('tags')
        if tags is not None:
            if isinstance(tags, list):
                tags = ' '.join(tags)
            elif not isinstance(tags, six.string_types):
                return HttpResponse(
                    json.dumps({'error': '"tags" must be an array or space-separated string'}),
                    status=400)
        else:
            tags = None
        if 'when' in event:
            when = epoch_to_dt(event['when'])
        else:
            when = now()

        Event.objects.create(
            what=event.get('what'),
            tags=tags,
            when=when,
            data=event.get('data', ''),
        )

        return HttpResponse(status=200)
    else:
        return HttpResponse(status=405)


def get_data(request):
    query_params = request.GET.copy()
    query_params.update(request.POST)

    if 'jsonp' in query_params:
        response = HttpResponse(
          "%s(%s)" % (query_params.get('jsonp'),
              json.dumps(fetch(request), cls=EventEncoder)),
          content_type='text/javascript')
    else:
        response = HttpResponse(
            json.dumps(fetch(request), cls=EventEncoder),
            content_type='application/json')
    return response


def fetch(request):
    if request.GET.get('from') is not None:
        time_from = parseATTime(request.GET['from'])
    else:
        time_from = epoch_to_dt(0)

    if request.GET.get('until') is not None:
        time_until = parseATTime(request.GET['until'])
    else:
        time_until = now()

    set_operation = request.GET.get('set')

    tags = request.GET.get('tags')
    if tags is not None:
        tags = request.GET.get('tags').split(' ')

    result = []
    for x in Event.find_events(time_from, time_until, tags=tags, set_operation=set_operation):

        # django-tagging's with_intersection() returns matches with unknown tags
        # this is a workaround to ensure we only return positive matches
        if set_operation == 'intersection':
            if len(set(tags) & set(x.as_dict()['tags'])) == len(tags):
                result.append(x.as_dict())
        else:
            result.append(x.as_dict())
    return result
