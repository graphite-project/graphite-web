from __future__ import absolute_import

from graphite.tags.localdatabase import LocalDatabaseTagDB
from graphite.tags.redis import RedisTagDB
from graphite.tags.utils import TaggedSeries

from tests.base import TestCase

class TagsTest(TestCase):
  def _test_tagdb(self, db):
    # test path with tags
    parsed = db.parse('test.a;hello=tiger;blah=blah')
    self.assertIsInstance(parsed, TaggedSeries)
    self.assertEqual(parsed.metric, 'test.a')
    self.assertEqual(parsed.tags, {'blah': 'blah', 'hello': 'tiger', 'name': 'test.a'})

    # test formatting
    self.assertEqual(parsed.path, 'test.a;blah=blah;hello=tiger')

    # test encoding
    self.assertEqual(TaggedSeries.encode(parsed.path), '_tagged.2b0.2af.test-a;blah=blah;hello=tiger')

    # test path without tags
    parsed = db.parse('test.a')
    self.assertIsInstance(parsed, TaggedSeries)
    self.assertEqual(parsed.metric, 'test.a')
    self.assertEqual(parsed.tags, {'name': 'test.a'})

    # test formatting
    self.assertEqual(parsed.path, 'test.a')

    # test encoding
    self.assertEqual(TaggedSeries.encode(parsed.path), 'test.a')

    # query that shouldn't match anything
    db.del_series('test.a;blah=blah;hello=tiger')

    result = db.get_series('test.a;blah=blah;hello=tiger')
    self.assertEquals(result, None)

    # tag a series
    result = db.tag_series('test.a;hello=tiger;blah=blah')
    self.assertEquals(result, 'test.a;blah=blah;hello=tiger')

    # get series details
    result = db.get_series('test.a;blah=blah;hello=tiger')
    self.assertIsInstance(result, TaggedSeries)
    self.assertEqual(result.metric, 'test.a')
    self.assertEqual(result.tags, {'blah': 'blah', 'hello': 'tiger', 'name': 'test.a'})

    # tag more series
    result = db.tag_series('test.a;blah=blah;hello=tiger')
    self.assertEquals(result, 'test.a;blah=blah;hello=tiger')

    result = db.tag_series('test.a;blah=blah;hello=lion')
    self.assertEquals(result, 'test.a;blah=blah;hello=lion')

    # basic find
    result = db.find_series(['hello=tiger'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    # find with regex
    result = db.find_series(['hello=tiger', 'blah=~b.*'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    # find with not equal
    result = db.find_series(['hello=tiger', 'blah!=blah'])
    self.assertEqual(result, [])

    result = db.find_series(['hello=tiger', 'blah!=foo'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    # complex find
    result = db.find_series(['hello=~lion|tiger', 'blah!=foo'])
    self.assertEqual(result, ['test.a;blah=blah;hello=lion', 'test.a;blah=blah;hello=tiger'])

    # add series without 'hello' tag
    result = db.tag_series('test.b;blah=blah')
    self.assertEquals(result, 'test.b;blah=blah')

    # find series without tag
    result = db.find_series(['name=test.b', 'hello='])
    self.assertEqual(result, ['test.b;blah=blah'])

  def test_local_tagdb(self):
    return self._test_tagdb(LocalDatabaseTagDB())

  def test_redis_tagdb(self):
    return self._test_tagdb(RedisTagDB())
