from __future__ import absolute_import

import re

from django.conf import settings

from graphite.tags.utils import BaseTagDB, TaggedSeries

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

  def find_series(self, tags):
    with self.r.pipeline() as pipe:
      all_match_empty = True

      for tagspec in tags:
        (tag, operator, spec) = self.parse_tagspec(tagspec)

        # find list of values that match the tagspec
        values = None

        if operator == '=':
          matches_empty = spec == ''

          values = [spec]

        elif operator == '=~':
          pattern = re.compile(spec)
          matches_empty = bool(pattern.match(''))

          values = [value for value in self.r.sscan_iter('tags:' + tag + ':values') if pattern.match(value) is not None]

        elif operator == '!=':
          matches_empty = spec != ''

          values = [value for value in self.r.sscan_iter('tags:' + tag + ':values') if value != spec]

        elif operator == '!=~':
          pattern = re.compile(spec)
          matches_empty = not pattern.match('')

          values = [value for value in self.r.sscan_iter('tags:' + tag + ':values') if pattern.match(value) is None]

        else:
          raise ValueError("Invalid operator %s" % operator)

        # if we're matching the empty value, union with the set of series that don't have the tag
        if matches_empty:
          # store series that don't have this tag in a temp key
          pipe.sdiffstore('temp:' + tag + ':empty', 'series', 'tags:' + tag + ':series')

          # store union of series without this tag and all series that match the spec in a temp key
          pipe.sunionstore('temp:' + tagspec, 1 + len(values), 'temp:' + tag + ':empty', *['tags:' + tag + ':values:' + value for value in values])
        # otherwise only return series for matching values
        else:
          # if this query matched no values, just short-circuit since the result of the final intersect will be empty
          if not values:
            return []

          # store union of all series that match the spec in a temp key
          pipe.sunionstore('temp:' + tagspec, len(values), *['tags:' + tag + ':values:' + value for value in values])

        all_match_empty = all_match_empty and matches_empty

      if all_match_empty:
        raise ValueError("At least one tagspec must not match the empty string")

      # get the final result from the intersection of the temp lists we created above
      pipe.sinter(*['temp:' + tagspec for tagspec in tags])

      results = pipe.execute()

    return sorted(list(results[-1]))

  def get_series(self, path):
    tags = {}

    tags = self.r.hgetall('series:' + path + ':tags')
    if not tags:
      return None

    return TaggedSeries(tags['name'], tags)

  def list_tags(self, tagFilter=None):
    return sorted([
      {'tag': tag}
      for tag in self.r.sscan_iter('tags')
      if not tagFilter or re.match(tagFilter, tag) is not None
    ], key=lambda x: x['tag'])

  def get_tag(self, tag, valueFilter=None):
    if not self.r.sismember('tags', tag):
      return None

    return {
      'tag': tag,
      'values': self.list_values(tag, valueFilter=valueFilter),
    }

  def list_values(self, tag, valueFilter=None):
    return sorted([
      {'value': value, 'count': self.r.scard('tags:' + tag + ':values:' + value)}
      for value in self.r.sscan_iter('tags:' + tag + ':values')
      if not valueFilter or re.match(valueFilter, value) is not None
    ], key=lambda x: x['value'])

  def tag_series(self, series):
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

  def del_series(self, series):
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
