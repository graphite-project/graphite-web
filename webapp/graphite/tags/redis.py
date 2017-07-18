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
    tags:<tag>:values         # Set of values for tag
    tags:<tag>:values:<value> # Set of paths matching tag/value

  """
  def __init__(self):
    from redis import Redis

    self.r = Redis(host=settings.TAGDB_REDIS_HOST,port=settings.TAGDB_REDIS_PORT,db=settings.TAGDB_REDIS_DB)

  def find_series(self, tags):
    with self.r.pipeline() as pipe:
      for tagspec in tags:
        m = re.match('^([^;!=]+)(!?=~?)([^;]*)$', tagspec)
        if m is None:
          raise ValueError("Invalid tagspec %s" % tagspec)

        tag = m.group(1)
        operator = m.group(2)
        spec = m.group(3)

        values = None

        if operator == '=':
          values = [spec]
        elif operator == '=~':
          pattern = re.compile(spec)
          values = [value for value in self.r.sscan_iter('tags:' + tag + ':values') if pattern.search(value) is not None]
        elif operator == '!=':
          values = [value for value in self.r.sscan_iter('tags:' + tag + ':values') if value != spec]
        elif operator == '!=~':
          pattern = re.compile(spec)
          values = [value for value in self.r.sscan_iter('tags:' + tag + ':values') if pattern.search(value) is None]

        if not values:
          return []

        pipe.sunionstore('temp:' + tagspec, len(values), *['tags:' + tag + ':values:' + value for value in values])

      pipe.sinter(*['temp:' + tagspec for tagspec in tags])

      results = pipe.execute()

    return list(results[-1])

  def get_series(self, path):
    tags = {}

    tagvalues = self.r.hgetall('series:' + path + ':tags')

    for i, t in enumerate(tagvalues):
      if i % 2 == 0:
        tags[t] = tagvalues[i + 1]

    if not tags:
      return None

    return TaggedSeries(tags['name'], tags)

  def list_tags(self):
    return [
      {'tag': tag}
      for tag in self.r.sscan_iter('tags')
    ]

  def get_tag(self, tag):
    if not self.r.sismember('tags', tag):
      return None

    return {
      'tag': tag,
      'values': self.list_values(tag),
    }

  def list_values(self, tag):
    return [
      {'value': value, 'count': self.r.scard('tags:' + tag + ':values:' + value)}
      for value in self.r.sscan_iter('tags:' + tag + ':values')
    ]

  def tag_series(self, series):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.format()

    with self.r.pipeline() as pipe:
      pipe.sadd('series', path)

      for tag, value in parsed.tags.items():
        pipe.hset('series:' + path + ':tags', tag, value)

        pipe.sadd('tags', tag)
        pipe.sadd('tags:' + tag + ':values', value)
        pipe.sadd('tags:' + tag + ':values:' + value, path)

      pipe.execute()

    return path

  def del_series(self, series):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.format()

    with self.r.pipeline() as pipe:
      pipe.srem('series', path)

      pipe.delete('series:' + path + ':tags')

      for tag, value in parsed.tags.items():
        pipe.srem('tags:' + tag + ':values:' + value, path)

      pipe.execute()

    return True
