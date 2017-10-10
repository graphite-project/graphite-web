from __future__ import absolute_import

from urllib import quote
import json

from django.conf import settings
from graphite.util import logtime
from graphite.http_pool import http

from graphite.tags.utils import BaseTagDB

class HttpTagDB(BaseTagDB):
  """
  Stores tag information using an external http service that implements the graphite tags API.
  """
  def request(self, method, url, fields={}, headers={}):
    if 'Authorization' not in headers and settings.TAGDB_HTTP_USER and settings.TAGDB_HTTP_PASSWORD:
      headers['Authorization'] = 'Basic ' + ('%s:%s' % (settings.TAGDB_HTTP_USER, settings.TAGDB_HTTP_PASSWORD)).encode('base64')

    result = http.request(
      method,
      settings.TAGDB_HTTP_URL + url,
      fields={field: value for (field, value) in fields.items() if value is not None},
      headers=headers,
      timeout=settings.REMOTE_FIND_TIMEOUT,
    )

    if result.status != 200:
      raise Exception('HTTP Error from remote tagdb: %s' % result.status)

    return json.loads(result.data.decode('utf-8'))

  @logtime()
  def find_series(self, tags):
    return self.request('POST', '/tags/findSeries?' + '&'.join([('expr=%s' % quote(tag)) for tag in tags]))

  def get_series(self, path):
    parsed = self.parse(path)

    seriesList = self.find_series([('%s=%s' % (tag, parsed.tags[tag])) for tag in parsed.tags])

    if parsed.path in seriesList:
      return parsed

  def list_tags(self, tagFilter=None):
    return self.request('GET', '/tags', {'filter': tagFilter})

  def get_tag(self, tag, valueFilter=None):
    return self.request('GET', '/tags/' + tag, {'filter': valueFilter})

  def list_values(self, tag, valueFilter=None):
    tagInfo = self.get_tag(tag, valueFilter)
    if not tagInfo:
      return []

    return tagInfo['values']

  def tag_series(self, series):
    return self.request('POST', '/tags/tagSeries', {'path': series})

  def del_series(self, series):
    return self.request('POST', '/tags/delSeries', {'path': series})
