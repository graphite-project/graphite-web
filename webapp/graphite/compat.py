import json

from django import VERSION
from django.core.serializers.json import DjangoJSONEncoder
from django.http import (HttpResponse as BaseHttpResponse,
                         HttpResponseBadRequest as Base400)


class ContentTypeMixin(object):
    def __init__(self, *args, **kwargs):
        if VERSION < (1, 5) and 'content_type' in kwargs:
            kwargs['mimetype'] = kwargs.pop('content_type')
        super(ContentTypeMixin, self).__init__(*args, **kwargs)


class HttpResponse(ContentTypeMixin, BaseHttpResponse):
    pass


class HttpResponseBadRequest(ContentTypeMixin, Base400):
    pass


class JsonResponse(HttpResponse):
    # Django < 1.7 does not have JsonResponse
    # https://github.com/django/django/commit/024213
    # https://github.com/django/django/blob/master/LICENSE
    def __init__(self, data, encoder=DjangoJSONEncoder, safe=True,
                 json_dumps_params=None, **kwargs):
        if safe and not isinstance(data, dict):
            raise TypeError(
                'In order to allow non-dict objects to be serialized set the '
                'safe parameter to False.'
            )
        if json_dumps_params is None:
            json_dumps_params = {}
        kwargs.setdefault('content_type', 'application/json')
        data = json.dumps(data, cls=encoder, **json_dumps_params)
        super(JsonResponse, self).__init__(content=data, **kwargs)
