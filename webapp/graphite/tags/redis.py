from __future__ import absolute_import

import re

from django.conf import settings

from graphite.tags.base import BaseTagDB, TaggedSeries


class RedisTagDB(BaseTagDB):
  """
  Stores tag information in a Redis database.

  Keys used are:

  .. code-block:: none

    series                    # Set of all paths
    series:<path>:tags        # Hash of all tag:value pairs for path
    tags                      # Set of all tags
    tags:<tag>:series         # Set of paths with entry for tag
    tags:<tag>:values         # Set of values for tag
    tags:<tag>:values:<value> # Set of paths matching tag/value

  """
  def __init__(self):
    from redis import Redis

    self.r = Redis(host=settings.TAGDB_REDIS_HOST,port=settings.TAGDB_REDIS_PORT,db=settings.TAGDB_REDIS_DB)

  def _find_series(self, tags, requestContext=None):
    selector = None
    selector_cnt = None
    filters = []

    # loop through tagspecs, look for best spec to use as selector
    for tagspec in tags:
      (tag, operator, spec) = self.parse_tagspec(tagspec)

      if operator == '=':
        matches_empty = spec == ''
        if not matches_empty:
          cnt = self.r.scard('tags:' + tag + ':values:' + spec)
          if not selector or selector[1] != '=' or selector_cnt > cnt:
            if selector:
              filters.append(selector)
            selector = (tag, operator, spec)
            selector_cnt = cnt
            continue
        filters.append((tag, operator, spec))

      elif operator == '=~':
        pattern = re.compile(spec)
        matches_empty = bool(pattern.match(''))
        if not matches_empty and (not selector or selector[1] != '='):
          cnt = self.r.scard('tags:' + tag + ':values')
          if not selector or selector_cnt > cnt:
            if selector:
              filters.append(selector)
            selector = (tag, operator, pattern)
            selector_cnt = cnt
            continue
        filters.append((tag, operator, pattern))

      elif operator == '!=':
        matches_empty = spec != ''
        if not matches_empty and (not selector or selector[1] != '='):
          cnt = self.r.scard('tags:' + tag + ':values')
          if not selector or selector_cnt > cnt:
            if selector:
              filters.append(selector)
            selector = (tag, operator, spec)
            selector_cnt = cnt
            continue
        filters.append((tag, operator, spec))

      elif operator == '!=~':
        pattern = re.compile(spec)
        matches_empty = not pattern.match('')
        if not matches_empty and (not selector or selector[1] != '='):
          cnt = self.r.scard('tags:' + tag + ':values')
          if not selector or selector_cnt > cnt:
            if selector:
              filters.append(selector)
            selector = (tag, operator, pattern)
            selector_cnt = cnt
            continue
        filters.append((tag, operator, pattern))

      else:
        raise ValueError("Invalid operator %s" % operator)

    if not selector:
      raise ValueError("At least one tagspec must not match the empty string")

    # get initial list of series
    (tag, operator, spec) = selector

    # find list of values that match the tagspec
    values = None
    if operator == '=':
      values = [spec]
    elif operator == '=~':
      # see if we can identify a literal prefix to filter by in redis
      match = None
      m = re.match('([a-z0-9]+)([^*?|][^|]*)?$', spec.pattern)
      if m:
        match = m.group(1) + '*'
      values = [value for value in self.r.sscan_iter('tags:' + tag + ':values', match=match) if spec.match(value) is not None]
    elif operator == '!=':
      values = [value for value in self.r.sscan_iter('tags:' + tag + ':values') if value != spec]
    elif operator == '!=~':
      values = [value for value in self.r.sscan_iter('tags:' + tag + ':values') if spec.match(value) is None]

    # if this query matched no values, just short-circuit since the result of the final intersect will be empty
    if not values:
      return []

    results = []

    # apply filters
    operators = ['=','!=','=~','!=~']
    filters.sort(lambda a, b: operators.index(a[1]) - operators.index(b[1]))

    for series in self.r.sunion(*['tags:' + tag + ':values:' + value for value in values]):
      parsed = self.parse(series)
      matched = True

      for (tag, operator, spec) in filters:
        value = parsed.tags.get(tag, '')
        if (
          (operator == '=' and value != spec) or
          (operator == '=~' and spec.match(value) is None) or
          (operator == '!=' and value == spec) or
          (operator == '!=~' and spec.match(value) is not None)
        ):
          matched = False
          break

      if matched:
        results.append(series)

    return sorted(results)

  def get_series(self, path, requestContext=None):
    tags = {}

    tags = self.r.hgetall('series:' + path + ':tags')
    if not tags:
      return None

    return TaggedSeries(tags['name'], tags)

  def list_tags(self, tagFilter=None, requestContext=None):
    return sorted([
      {'tag': tag}
      for tag in self.r.sscan_iter('tags')
      if not tagFilter or re.match(tagFilter, tag) is not None
    ], key=lambda x: x['tag'])

  def get_tag(self, tag, valueFilter=None, requestContext=None):
    if not self.r.sismember('tags', tag):
      return None

    return {
      'tag': tag,
      'values': self.list_values(tag, valueFilter=valueFilter),
    }

  def list_values(self, tag, valueFilter=None, requestContext=None):
    return sorted([
      {'value': value, 'count': self.r.scard('tags:' + tag + ':values:' + value)}
      for value in self.r.sscan_iter('tags:' + tag + ':values')
      if not valueFilter or re.match(valueFilter, value) is not None
    ], key=lambda x: x['value'])

  def tag_series(self, series, requestContext=None):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.path

    with self.r.pipeline() as pipe:
      pipe.sadd('series', path)

      for tag, value in parsed.tags.items():
        pipe.hset('series:' + path + ':tags', tag, value)

        pipe.sadd('tags', tag)
        pipe.sadd('tags:' + tag + ':series', path)
        pipe.sadd('tags:' + tag + ':values', value)
        pipe.sadd('tags:' + tag + ':values:' + value, path)

      pipe.execute()

    return path

  def del_series(self, series, requestContext=None):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.path

    with self.r.pipeline() as pipe:
      pipe.srem('series', path)

      pipe.delete('series:' + path + ':tags')

      for tag, value in parsed.tags.items():
        pipe.srem('tags:' + tag + ':series', path)
        pipe.srem('tags:' + tag + ':values:' + value, path)

      pipe.execute()

    return True
