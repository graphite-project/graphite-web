import re

from graphite.tags.utils import BaseTagDB, TaggedSeries
from django.db import connection

class LocalDatabaseTagDB(BaseTagDB):
  def find_series_query(self, tags):
    sql = 'SELECT s.path'
    sql += ' FROM tags_series AS s'
    params = []

    where = []
    whereparams = []

    all_match_empty = True

    i = 0
    for tagspec in tags:
      m = re.match('^([^;!=]+)(!?=~?)([^;]*)$', tagspec)
      if m is None:
        raise ValueError("Invalid tagspec %s" % tagspec)

      tag = m.group(1)
      operator = m.group(2)
      spec = m.group(3)

      i += 1
      s = str(i)

      sql += ' JOIN tags_tag AS t' + s + ' ON t' + s + '.tag=%s'
      params.append(tag)

      if operator == '=':
        matches_empty = spec == ''

        where.append('v' + s + '.value=%s')
        whereparams.append(spec)

      elif operator == '=~':
        # make sure regex is anchored
        if not spec.startswith('^'):
          spec = '^' + spec

        matches_empty = bool(re.match(spec, ''))

        where.append('v' + s + '.value REGEXP %s')
        whereparams.append(spec)

      elif operator == '!=':
        matches_empty = spec != ''

        where.append('v' + s + '.value<>%s')
        whereparams.append(spec)

      elif operator == '!=~':
        # make sure regex is anchored
        if not spec.startswith('^'):
          spec = '^' + spec

        matches_empty = not re.match(spec, '')

        where.append('v' + s + '.value NOT REGEXP %s')
        whereparams.append(spec)

      else:
        raise ValueError("Invalid operator %s" % operator)

      if matches_empty:
        sql += ' LEFT JOIN tags_seriestag AS st' + s + ' ON st' + s + '.series_id=s.id AND st' + s + '.tag_id=t' + s + '.id'
        sql += ' LEFT JOIN tags_tagvalue AS v' + s + ' ON v' + s + '.id=st' + s + '.value_id'

        where[-1] = '(' + where[-1] + ' OR v' + s + '.id IS NULL)'
      else:
        sql += ' JOIN tags_seriestag AS st' + s + ' ON st' + s + '.series_id=s.id AND st' + s + '.tag_id=t' + s + '.id'
        sql += ' JOIN tags_tagvalue AS v' + s + ' ON v' + s + '.id=st' + s + '.value_id'

      all_match_empty = all_match_empty and matches_empty

    if all_match_empty:
      raise ValueError("At least one tagspec must not match the empty string")

    if where:
      sql += ' WHERE ' + ' AND '.join(where)
      params.extend(whereparams)

    sql += ' ORDER BY s.path'

    return sql, params

  def find_series(self, tags):
    sql, params = self.find_series_query(tags)

    with connection.cursor() as cursor:
      cursor.execute(sql, params)

      return [row[0] for row in cursor.fetchall()]

  def get_series(self, path):
    with connection.cursor() as cursor:
      sql = 'SELECT s.id, t.tag, v.value'
      sql += ' FROM tags_series AS s'
      sql += ' JOIN tags_seriestag AS st ON st.series_id=s.id'
      sql += ' JOIN tags_tag AS t ON t.id=st.tag_id'
      sql += ' JOIN tags_tagvalue AS v ON v.id=st.value_id'
      sql += ' WHERE s.path=%s'
      params = [path]
      cursor.execute(sql, params)

      tags = {tag: value for (id, tag, value) in cursor.fetchall()}

      if not tags:
        return None

      return TaggedSeries(tags['name'], tags, id=id)

  def list_tags(self):
    with connection.cursor() as cursor:
      sql = 'SELECT t.id, t.tag'
      sql += ' FROM tags_tag AS t'
      sql += ' ORDER BY t.tag'
      params = []
      cursor.execute(sql, params)

      return [{'id': id, 'tag': tag} for (id, tag) in cursor.fetchall()]

  def get_tag(self, tag):
    with connection.cursor() as cursor:
      sql = 'SELECT t.id, t.tag'
      sql += ' FROM tags_tag AS t'
      sql += ' WHERE t.tag=%s'
      params = [tag]
      cursor.execute(sql, params)

      row = cursor.fetchone()

    if not row:
      return None

    (id, tag) = row

    return {
      'id': id,
      'tag': tag,
      'values': self.list_values(tag),
    }

  def list_values(self, tag):
    with connection.cursor() as cursor:
      sql = 'SELECT v.id, v.value, COUNT(st.id)'
      sql += ' FROM tags_tagvalue AS v'
      sql += ' JOIN tags_seriestag AS st ON st.value_id=v.id'
      sql += ' JOIN tags_tag AS t ON t.id=st.tag_id'
      sql += ' WHERE t.tag=%s'
      sql += ' GROUP BY v.id, v.value'
      sql += ' ORDER BY v.value'
      params = [tag]
      cursor.execute(sql, params)

      return [{'id': id, 'value': value, 'count': count} for (id, value, count) in cursor.fetchall()]

  def _insert_ignore(self, table, cols, data):
    if connection.vendor == 'mysql':
      sql = 'INSERT IGNORE INTO '
    elif connection.vendor == 'sqlite':
      sql = 'INSERT OR IGNORE INTO '
    elif connection.vendor == 'postgresql':
      sql = 'INSERT IGNORE INTO '
    else:
      raise Exception('Unsupported database vendor ' + connection.vendor)

    sql += table + ' (' + ','.join(cols) + ') VALUES ' + ', '.join(['(' + ', '.join(['%s'] * len(cols)) + ')'] * len(data))
    params = []
    for row in data:
      params.extend(row)

    with connection.cursor() as cursor:
      cursor.execute(sql, params)

  def tag_series(self, series):
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

      sql = 'SELECT id, tag FROM tags_tag WHERE tag IN (' + ', '.join(['%s'] * len(parsed.tags)) + ')'
      params = list(parsed.tags.keys())
      cursor.execute(sql, params)
      tag_ids = {tag: id for (id, tag) in cursor.fetchall()}

      # tag values
      self._insert_ignore('tags_tagvalue', ['value'], [[value] for value in parsed.tags.values()])

      sql = 'SELECT id, value FROM tags_tagvalue WHERE value IN (' + ', '.join(['%s'] * len(parsed.tags)) + ')'
      params = list(parsed.tags.values())
      cursor.execute(sql, params)
      value_ids = {value: id for (id, value) in cursor.fetchall()}

      # series
      if curr:
        series_id = curr.id
      else:
        self._insert_ignore('tags_series', ['path'], [[path]])

        sql = 'SELECT id FROM tags_series WHERE path=%s'
        params = [path]
        cursor.execute(sql, params)
        series_id = cursor.fetchone()[0]

      # series tags
      self._insert_ignore('tags_seriestag', ['series_id', 'tag_id', 'value_id'], [[series_id, tag_ids[tag], value_ids[value]] for tag, value in parsed.tags.items()])

    return path

  def del_series(self, series):
    # extract tags and normalize path
    parsed = self.parse(series)

    path = parsed.path

    # check if path is already tagged
    curr = self.get_series(path)
    if not curr:
      return True

    with connection.cursor() as cursor:
      sql = 'DELETE FROM tags_series WHERE id=%s'
      params = [curr.id]
      cursor.execute(sql, params)

      sql = 'DELETE FROM tags_seriestag WHERE series_id=%s'
      params = [curr.id]
      cursor.execute(sql, params)

    return True
