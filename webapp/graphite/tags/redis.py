from __future__ import absolute_import

import re

from graphite.tags.utils import BaseTagDB, TaggedSeries

class RedisTagDB(BaseTagDB):
  def __init__(self):
    from redis import Redis

    self.r = Redis(host='localhost',port=6379,db=0)

  def find_series(self, tags):
    import pprint
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
          values = [value[0] for value in self.r.zscan_iter('tags:' + tag + ':values') if pattern.search(value[0]) is not None]
        elif operator == '!=':
          values = [value[0] for value in self.r.zscan_iter('tags:' + tag + ':values') if value[0] != spec]
        elif operator == '!=~':
          pattern = re.compile(spec)
          values = [value[0] for value in self.r.zscan_iter('tags:' + tag + ':values') if pattern.search(value[0]) is None]

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
      {'tag': tag[0]}
      for tag in self.r.zscan_iter('tags')
    ]

  def get_tag(self, tag):
    rank = self.r.zrank('tags', tag)
    if rank is None:
      return None

    return {
      'tag': tag,
      'values': self.list_values(tag),
    }

  def list_values(self, tag):
    return [
      {'value': value[0], 'count': self.r.scard('tags:' + tag + ':values:' + value[0])}
      for value in self.r.zscan_iter('tags:' + tag + ':values')
    ]

  def tag_series(self, series):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.format()

    with self.r.pipeline() as pipe:
      pipe.zadd('series', path, 1)

      for tag, value in parsed.tags.items():
        pipe.hset('series:' + path + ':tags', tag, value)

        pipe.zadd('tags', tag, 1)
        pipe.zadd('tags:' + tag + ':values', value, 1)

        pipe.sadd('tags:' + tag + ':values:' + value, path)

      pipe.execute()

    return path

  def del_series(self, series):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.format()

    with self.r.pipeline() as pipe:
      pipe.zrem('series', path)

      pipe.delete('series:' + path + ':tags')

      for tag, value in parsed.tags.items():
        pipe.srem('tags:' + tag + ':values:' + value, path)

      pipe.execute()

    return True
