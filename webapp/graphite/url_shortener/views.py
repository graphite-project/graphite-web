try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, HttpResponsePermanentRedirect

from graphite.url_shortener.baseconv import base62
from graphite.url_shortener.models import Link
import re


def follow(request, link_id):
    """Follow existing links"""
    key = base62.to_decimal(link_id)
    link = get_object_or_404(Link, pk=key)
    return HttpResponsePermanentRedirect(reverse('browser') + link.url)


def shorten(request, path):
    if request.META.get('QUERY_STRING', None):
        path += '?' + request.META['QUERY_STRING']
    # Remove _salt, _dc and _uniq to avoid creating many copies of the same URL
    path = re.sub('&_(uniq|salt|dc)=[0-9.]+', "", path)

    link, created = Link.objects.get_or_create(url=path)
    link_id = base62.from_decimal(link.id)
    url = reverse('follow', kwargs={'link_id': link_id})
    return HttpResponse(url, content_type='text/plain')
