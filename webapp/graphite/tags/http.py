from __future__ import absolute_import

from binascii import b2a_base64
import sys

from graphite.http_pool import http
from graphite.util import json

from graphite.tags.base import BaseTagDB


class HttpTagDB(BaseTagDB):
  """
  Stores tag information using an external http service that implements the graphite tags API.
  """
  def __init__(self, settings, *args, **kwargs):
    super(HttpTagDB, self).__init__(settings, *args, **kwargs)

    self.base_url = settings.TAGDB_HTTP_URL
    self.username = settings.TAGDB_HTTP_USER
    self.password = settings.TAGDB_HTTP_PASSWORD

  def request(self, method, url, fields, requestContext=None):
    headers = requestContext.get('forwardHeaders') if requestContext else {}
    if 'Authorization' not in headers and self.username and self.password:
      user_pw = '%s:%s' % (self.username, self.password)
      if sys.version_info[0] >= 3:
        user_pw_b64 = b2a_base64(user_pw.encode('utf-8')).decode('ascii')
      else:
        user_pw_b64 = user_pw.encode('base64')
      headers['Authorization'] = 'Basic ' + user_pw_b64

    req_fields = []
    for (field, value) in fields.items():
      if value is None:
        continue

      if isinstance(value, list) or isinstance(value, tuple):
        req_fields.extend([(field, v) for v in value if v is not None])
      else:
        req_fields.append((field, value))

    result = http.request(
      method,
      self.base_url + url,
      fields=req_fields,
      headers=headers,
      timeout=self.settings.FIND_TIMEOUT,
    )

    if result.status == 400:
      raise ValueError(json.loads(result.data.decode('utf-8')).get('error'))

    if result.status != 200:
      raise Exception('HTTP Error from remote tagdb: %s %s' % (result.status, result.data))

    return json.loads(result.data.decode('utf-8'))

  def find_series_cachekey(self, tags, requestContext=None):
    headers = [
      header + '=' + value
      for (header, value)
      in (requestContext.get('forwardHeaders', {}) if requestContext else {}).items()
    ]

    return 'TagDB.find_series:' + ':'.join(sorted(tags)) + ':' + ':'.join(sorted(headers))

  def _find_series(self, tags, requestContext=None):
    return self.request(
      'POST',
      '/tags/findSeries',
      {'expr': tags},
      requestContext=requestContext,
    )

  def get_series(self, path, requestContext=None):
    parsed = self.parse(path)

    seriesList = self.find_series(
      [('%s=%s' % (tag, parsed.tags[tag])) for tag in parsed.tags],
      requestContext=requestContext,
    )

    if parsed.path in seriesList:
      return parsed

  def list_tags(self, tagFilter=None, limit=None, requestContext=None):
    return self.request('GET', '/tags', {'filter': tagFilter, 'limit': limit}, requestContext)

  def get_tag(self, tag, valueFilter=None, limit=None, requestContext=None):
    return self.request('GET', '/tags/' + tag, {'filter': valueFilter, 'limit': limit}, requestContext)

  def list_values(self, tag, valueFilter=None, limit=None, requestContext=None):
    tagInfo = self.get_tag(tag, valueFilter=valueFilter, limit=limit, requestContext=requestContext)
    if not tagInfo:
      return []

    return tagInfo['values']

  def tag_series(self, series, requestContext=None):
    return self.request('POST', '/tags/tagSeries', {'path': series}, requestContext)

  def tag_multi_series(self, seriesList, requestContext=None):
    return self.request('POST', '/tags/tagMultiSeries', {'path': seriesList}, requestContext)

  def del_series(self, series, requestContext=None):
    return self.request('POST', '/tags/delSeries', {'path': series}, requestContext)

  def del_multi_series(self, seriesList, requestContext=None):
    return self.request('POST', '/tags/delSeries', {'path': seriesList}, requestContext)

  def auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None):
    """
    Return auto-complete suggestions for tags based on the matches for the specified expressions, optionally filtered by tag prefix
    """
    if not self.settings.TAGDB_HTTP_AUTOCOMPLETE:
      return super(HttpTagDB, self).auto_complete_tags(
        exprs, tagPrefix=tagPrefix, limit=limit, requestContext=requestContext)

    if limit is None:
      limit = self.settings.TAGDB_AUTOCOMPLETE_LIMIT

    fields = {
      'tagPrefix': tagPrefix or '',
      'limit': str(limit),
      'expr': exprs,
    }

    return self.request('POST', '/tags/autoComplete/tags', fields, requestContext)

  def auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None):
    """
    Return auto-complete suggestions for tags and values based on the matches for the specified expressions, optionally filtered by tag and/or value prefix
    """
    if not self.settings.TAGDB_HTTP_AUTOCOMPLETE:
      return super(HttpTagDB, self).auto_complete_values(
        exprs, tag, valuePrefix=valuePrefix, limit=limit, requestContext=requestContext)

    if limit is None:
      limit = self.settings.TAGDB_AUTOCOMPLETE_LIMIT

    fields = {
      'tag': tag or '',
      'valuePrefix': valuePrefix or '',
      'limit': str(limit),
      'expr': exprs,
    }

    return self.request('POST', '/tags/autoComplete/values', fields, requestContext)
