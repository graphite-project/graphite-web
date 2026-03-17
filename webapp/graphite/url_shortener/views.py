try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.urls import reverse
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, HttpResponsePermanentRedirect
from django.utils.http import url_has_allowed_host_and_scheme

from graphite.url_shortener.baseconv import base62
from graphite.url_shortener.models import Link
import re


def follow(request, link_id):
    """Follow existing links"""
    key = base62.to_decimal(link_id)
    link = get_object_or_404(Link, pk=key)
    browser_url = reverse('browser')
    # Strip leading slashes from the stored URL to prevent open redirect via
    # protocol-relative URLs (e.g. //evil.com) being used as redirect targets.
    url = browser_url + link.url.lstrip('/')
    # Validate the resulting URL is safe and does not redirect to an external
    # domain (e.g. via backslash bypass: /\evil.com interpreted as //evil.com
    # by some browsers).
    if not url_has_allowed_host_and_scheme(url=url, allowed_hosts={request.get_host()}):
        url = browser_url
    return HttpResponsePermanentRedirect(url)


def shorten(request, path):
    if request.META.get('QUERY_STRING', None):
        path += '?' + request.META['QUERY_STRING']
    # Remove _salt, _dc and _uniq to avoid creating many copies of the same URL
    path = re.sub('&_(uniq|salt|dc)=[0-9.]+', "", path)

    link, created = Link.objects.get_or_create(url=path)
    link_id = base62.from_decimal(link.id)
    url = reverse('follow', kwargs={'link_id': link_id})
    return HttpResponse(url, content_type='text/plain')
