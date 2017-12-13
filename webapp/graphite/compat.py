
from django import VERSION
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
