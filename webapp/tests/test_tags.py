from __future__ import absolute_import

"""
try:
    from unittest.mock import patch
except ImportError:
    from mock import patch
"""

from graphite.tags.localdatabase import LocalDatabaseTagDB
from graphite.tags.utils import TaggedSeries
from tests.base import TestCase

class TagsTest(TestCase):
  def test_local_database(self):
    db = LocalDatabaseTagDB()

    # test path with tags
    parsed = db.parse('test.a;hello=tiger;blah=blah')
    self.assertIsInstance(parsed, TaggedSeries)
    self.assertEqual(parsed.metric, 'test.a')
    self.assertEqual(parsed.tags, {'blah': 'blah', 'hello': 'tiger', 'name': 'test.a'})

    # test formatting
    raw = parsed.format()
    self.assertEqual(raw, 'test.a;blah=blah;hello=tiger')

    # test path without tags
    parsed = db.parse('test.a')
    self.assertIsInstance(parsed, TaggedSeries)
    self.assertEqual(parsed.metric, 'test.a')
    self.assertEqual(parsed.tags, {'name': 'test.a'})

    # test formatting
    raw = parsed.format()
    self.assertEqual(raw, 'test.a')

    result = db.get_series('test.a;blah=blah;hello=tiger')
    self.assertEquals(result, None)

    result = db.tag_series('test.a;hello=tiger;blah=blah')
    self.assertEquals(result, 'test.a;blah=blah;hello=tiger')

    result = db.get_series('test.a;blah=blah;hello=tiger')
    self.assertIsInstance(result, TaggedSeries)
    self.assertEqual(result.metric, 'test.a')
    self.assertEqual(result.tags, {'blah': 'blah', 'hello': 'tiger', 'name': 'test.a'})

    result = db.tag_series('test.a;blah=blah;hello=tiger')
    self.assertEquals(result, 'test.a;blah=blah;hello=tiger')

    result = db.tag_series('test.a;blah=blah;hello=lion')
    self.assertEquals(result, 'test.a;blah=blah;hello=lion')

    result = db.find_series(['hello=tiger'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    result = db.find_series(['hello=tiger', 'blah=~b.*'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    result = db.find_series(['hello=tiger', 'blah!=blah'])
    self.assertEqual(result, [])

    result = db.find_series(['hello=tiger', 'blah!=foo'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    result = db.find_series(['hello=~lion|tiger', 'blah!=foo'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger', 'test.a;blah=blah;hello=lion'])
