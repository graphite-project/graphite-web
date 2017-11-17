import re

from django.db import connection
from hashlib import sha256

from graphite.tags.base import BaseTagDB, TaggedSeries


class LocalDatabaseTagDB(BaseTagDB):
  def find_series_query(self, tags):
    # sql will select series that match all tag expressions that don't match empty tags
    sql = 'SELECT s.path'
    sql += ' FROM tags_series AS s'
    params = []

    where = []
    whereparams = []

    all_match_empty = True

    # expressions that do match empty tags will be used to filter the result
    filters = []

    i = 0
    for tagspec in tags:
      (tag, operator, spec) = self.parse_tagspec(tagspec)

      i += 1
      s = str(i)

      if operator == '=':
        matches_empty = spec == ''

        if not matches_empty:
          where.append('v' + s + '.value=%s')
          whereparams.append(spec)

      elif operator == '=~':
        # make sure regex is anchored
        if not spec.startswith('^'):
          spec = '^(' + spec + ')'

        matches_empty = bool(re.match(spec, ''))

        if not matches_empty:
          where.append('v' + s + '.value ' + self._regexp_operator(connection) + ' %s')
          whereparams.append(spec)

      elif operator == '!=':
        matches_empty = spec != ''

        if not matches_empty:
          where.append('v' + s + '.value<>%s')
          whereparams.append(spec)

      elif operator == '!=~':
        # make sure regex is anchored
        if not spec.startswith('^'):
          spec = '^(' + spec + ')'

        matches_empty = not re.match(spec, '')

        if not matches_empty:
          where.append('v' + s + '.value ' + self._regexp_not_operator(connection) + ' %s')
          whereparams.append(spec)

      else:
        raise ValueError("Invalid operator %s" % operator)

      if matches_empty:
        filters.append((tag, operator, spec))
      else:
        sql += ' JOIN tags_tag AS t' + s + ' ON t' + s + '.tag=%s'
        params.append(tag)
        sql += ' JOIN tags_seriestag AS st' + s + ' ON st' + s + '.series_id=s.id AND st' + s + '.tag_id=t' + s + '.id'
        sql += ' JOIN tags_tagvalue AS v' + s + ' ON v' + s + '.id=st' + s + '.value_id'

      all_match_empty = all_match_empty and matches_empty

    if all_match_empty:
      raise ValueError("At least one tagspec must not match the empty string")

    if where:
      sql += ' WHERE ' + ' AND '.join(where)
      params.extend(whereparams)

    sql += ' ORDER BY s.path'

    return sql, params, filters

  def _find_series(self, tags, requestContext=None):
    sql, params, filters = self.find_series_query(tags)

    def matches_filters(path):
      if not filters:
        return True

      parsed = self.parse(path)

      for (tag, operator, spec) in filters:
        value = parsed.tags.get(tag, '')
        if (
          (operator == '=' and value != spec) or
          (operator == '=~' and re.match(spec, value) is None) or
          (operator == '!=' and value == spec) or
          (operator == '!=~' and re.match(spec, value) is not None)
        ):
          return False

      return True

    with connection.cursor() as cursor:
      cursor.execute(sql, params)

      return [row[0] for row in cursor if matches_filters(row[0])]

  def get_series(self, path, requestContext=None):
    with connection.cursor() as cursor:
      sql = 'SELECT s.id, t.tag, v.value'
      sql += ' FROM tags_series AS s'
      sql += ' JOIN tags_seriestag AS st ON st.series_id=s.id'
      sql += ' JOIN tags_tag AS t ON t.id=st.tag_id'
      sql += ' JOIN tags_tagvalue AS v ON v.id=st.value_id'
      sql += ' WHERE s.path=%s'
      params = [path]
      cursor.execute(sql, params)

      series_id = None

      tags = {tag: value for (series_id, tag, value) in cursor}

      if not tags:
        return None

      return TaggedSeries(tags['name'], tags, series_id=series_id)

  def list_tags(self, tagFilter=None, limit=None, requestContext=None):
    with connection.cursor() as cursor:
      sql = 'SELECT t.id, t.tag'
      sql += ' FROM tags_tag AS t'
      params = []

      if tagFilter:
        # make sure regex is anchored
        if not tagFilter.startswith('^'):
          tagFilter = '^(' + tagFilter + ')'
        sql += ' WHERE t.tag ' + self._regexp_operator(connection) + ' %s'
        params.append(tagFilter)

      sql += ' ORDER BY t.tag'

      if limit:
        sql += ' LIMIT %s'
        params.append(int(limit))

      cursor.execute(sql, params)

      return [{'id': tag_id, 'tag': tag} for (tag_id, tag) in cursor]

  def get_tag(self, tag, valueFilter=None, limit=None, requestContext=None):
    with connection.cursor() as cursor:
      sql = 'SELECT t.id, t.tag'
      sql += ' FROM tags_tag AS t'
      sql += ' WHERE t.tag=%s'
      params = [tag]
      cursor.execute(sql, params)

      row = cursor.fetchone()

    if not row:
      return None

    (tag_id, tag) = row

    return {
      'id': tag_id,
      'tag': tag,
      'values': self.list_values(
        tag,
        valueFilter=valueFilter,
        limit=limit,
        requestContext=requestContext
      ),
    }

  def list_values(self, tag, valueFilter=None, limit=None, requestContext=None):
    with connection.cursor() as cursor:
      sql = 'SELECT v.id, v.value, COUNT(st.id)'
      sql += ' FROM tags_tagvalue AS v'
      sql += ' JOIN tags_seriestag AS st ON st.value_id=v.id'
      sql += ' JOIN tags_tag AS t ON t.id=st.tag_id'
      sql += ' WHERE t.tag=%s'
      params = [tag]

      if valueFilter:
        # make sure regex is anchored
        if not valueFilter.startswith('^'):
          valueFilter = '^(' + valueFilter + ')'
        sql += ' AND v.value ' + self._regexp_operator(connection) + ' %s'
        params.append(valueFilter)

      sql += ' GROUP BY v.id, v.value'
      sql += ' ORDER BY v.value'

      if limit:
        sql += ' LIMIT %s'
        params.append(int(limit))

      cursor.execute(sql, params)

      return [{'id': value_id, 'value': value, 'count': count} for (value_id, value, count) in cursor]

  @staticmethod
  def _insert_ignore(table, cols, data):
    sql = table + ' (' + ','.join(cols) + ') VALUES ' + ', '.join(['(' + ', '.join(['%s'] * len(cols)) + ')'] * len(data))
    params = []
    for row in data:
      params.extend(row)

    if connection.vendor == 'mysql':
      sql = 'INSERT IGNORE INTO ' + sql
    elif connection.vendor == 'sqlite':
      sql = 'INSERT OR IGNORE INTO ' + sql
    elif connection.vendor == 'postgresql':
      sql = 'INSERT INTO ' + sql + ' ON CONFLICT DO NOTHING'  # nosec
    else:
      raise Exception('Unsupported database vendor ' + connection.vendor)

    with connection.cursor() as cursor:
      cursor.execute(sql, params)

  @staticmethod
  def _regexp_operator(connection):
    if connection.vendor == 'mysql':
      return 'REGEXP'
    if connection.vendor == 'sqlite':
      # django provides an implementation of REGEXP for sqlite
      return 'REGEXP'
    if connection.vendor == 'postgresql':
      return '~*'
    raise Exception('Database vendor ' + connection.vendor + ' does not support regular expressions')

  @staticmethod
  def _regexp_not_operator(connection):
    if connection.vendor == 'mysql':
      return 'NOT REGEXP'
    if connection.vendor == 'sqlite':
      # django provides an implementation of REGEXP for sqlite
      return 'NOT REGEXP'
    if connection.vendor == 'postgresql':
      return '!~*'
    raise Exception('Database vendor ' + connection.vendor + ' does not support regular expressions')

  def tag_series(self, series, requestContext=None):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.path

    # check if path is already tagged
    curr = self.get_series(path)
    if curr and parsed.tags == curr.tags:
      return path

    with connection.cursor() as cursor:
      # tags
      self._insert_ignore('tags_tag', ['tag'], [[tag] for tag in parsed.tags.keys()])

      sql = 'SELECT id, tag FROM tags_tag WHERE tag IN (' + ', '.join(['%s'] * len(parsed.tags)) + ')'  # nosec
      params = list(parsed.tags.keys())
      cursor.execute(sql, params)
      tag_ids = {tag: tag_id for (tag_id, tag) in cursor}

      # tag values
      self._insert_ignore('tags_tagvalue', ['value'], [[value] for value in parsed.tags.values()])

      sql = 'SELECT id, value FROM tags_tagvalue WHERE value IN (' + ', '.join(['%s'] * len(parsed.tags)) + ')'  # nosec
      params = list(parsed.tags.values())
      cursor.execute(sql, params)
      value_ids = {value: value_id for (value_id, value) in cursor}

      # series
      if curr:
        series_id = curr.id
      else:
        # hash column is used to support a unique index in mysql since path can be longer than 191 characters
        path_hash = sha256(path.encode('utf8')).hexdigest()
        self._insert_ignore('tags_series', ['hash', 'path'], [[path_hash, path]])

        sql = 'SELECT id FROM tags_series WHERE path=%s'
        params = [path]
        cursor.execute(sql, params)
        series_id = cursor.fetchone()[0]

      # series tags
      self._insert_ignore(
        'tags_seriestag',
        ['series_id', 'tag_id', 'value_id'],
        [[series_id, tag_ids[tag], value_ids[value]] for tag, value in parsed.tags.items()]
      )

    return path

  def del_series(self, series, requestContext=None):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.path

    with connection.cursor() as cursor:
      sql = 'SELECT id'
      sql += ' FROM tags_series'
      sql += ' WHERE path=%s'
      params = [path]
      cursor.execute(sql, params)

      row = cursor.fetchone()
      if not row:
        return True

      (series_id, ) = row

      sql = 'DELETE FROM tags_seriestag WHERE series_id=%s'
      params = [series_id]
      cursor.execute(sql, params)

      sql = 'DELETE FROM tags_series WHERE id=%s'
      params = [series_id]
      cursor.execute(sql, params)

    return True
