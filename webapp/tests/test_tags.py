from __future__ import absolute_import, division
import sys

try:
  from django.urls import reverse
except ImportError:  # Django < 1.10
  from django.core.urlresolvers import reverse

from django.conf import settings
from mock import patch, Mock

from graphite.tags.localdatabase import LocalDatabaseTagDB
from graphite.tags.redis import RedisTagDB
from graphite.tags.http import HttpTagDB
from graphite.tags.utils import TaggedSeries
from graphite.util import json

from tests.base import TestCase

def json_bytes(obj, *args, **kwargs):
  s = json.dumps(obj, *args, **kwargs)
  if sys.version_info[0] >= 3:
    return s.encode('utf-8')
  return s

class TagsTest(TestCase):
  def test_taggedseries(self):
    # test path with tags
    parsed = TaggedSeries.parse('test.a;hello=tiger;blah=blah')
    self.assertIsInstance(parsed, TaggedSeries)
    self.assertEqual(parsed.metric, 'test.a')
    self.assertEqual(parsed.tags, {'blah': 'blah', 'hello': 'tiger', 'name': 'test.a'})

    # test formatting
    self.assertEqual(parsed.path, 'test.a;blah=blah;hello=tiger')

    # test encoding
    self.assertEqual(TaggedSeries.encode(parsed.path), '_tagged.2b0.2af.test_DOT_a;blah=blah;hello=tiger')

    # test decoding
    self.assertEqual(TaggedSeries.decode('_tagged.2b0.2af.test_DOT_a;blah=blah;hello=tiger'), parsed.path)

    # test path without tags
    parsed = TaggedSeries.parse('test.a')
    self.assertIsInstance(parsed, TaggedSeries)
    self.assertEqual(parsed.metric, 'test.a')
    self.assertEqual(parsed.tags, {'name': 'test.a'})

    # test formatting
    self.assertEqual(parsed.path, 'test.a')

    # test encoding
    self.assertEqual(TaggedSeries.encode('test.a', sep='/'), 'test/a')

    # test encoding
    self.assertEqual(TaggedSeries.decode('test/a', sep='/'), 'test.a')

    # test parsing openmetrics
    parsed = TaggedSeries.parse(r'test.a{hello="tiger",blah="bla\"h"}')
    self.assertIsInstance(parsed, TaggedSeries)
    self.assertEqual(parsed.metric, 'test.a')
    self.assertEqual(parsed.tags, {'blah': 'bla"h', 'hello': 'tiger', 'name': 'test.a'})

  def _test_tagdb(self, db):
    # query that shouldn't match anything
    db.del_series('test.a;blah=blah;hello=tiger')

    result = db.get_series('test.a;blah=blah;hello=tiger')
    self.assertEqual(result, None)

    # tag a series
    result = db.tag_series('test.a;hello=tiger;blah=blah')
    self.assertEqual(result, 'test.a;blah=blah;hello=tiger')

    # get series details
    result = db.get_series('test.a;blah=blah;hello=tiger')
    self.assertIsInstance(result, TaggedSeries)
    self.assertEqual(result.metric, 'test.a')
    self.assertEqual(result.tags, {'blah': 'blah', 'hello': 'tiger', 'name': 'test.a'})

    # tag the same series again
    result = db.tag_series('test.a;blah=blah;hello=tiger')
    self.assertEqual(result, 'test.a;blah=blah;hello=tiger')

    # tag another series
    result = db.tag_series('test.a;blah=blah;hello=lion')
    self.assertEqual(result, 'test.a;blah=blah;hello=lion')

    # get list of tags
    result = db.list_tags()
    tagList = [tag for tag in result if tag['tag'] in ['name', 'hello', 'blah']]
    self.assertEqual(len(tagList), 3)
    self.assertEqual(tagList[0]['tag'], 'blah')
    self.assertEqual(tagList[1]['tag'], 'hello')
    self.assertEqual(tagList[2]['tag'], 'name')

    # get filtered list of tags
    result = db.list_tags(tagFilter='hello|bla')
    tagList = [tag for tag in result if tag['tag'] in ['name', 'hello', 'blah']]
    self.assertEqual(len(tagList), 2)
    self.assertEqual(tagList[0]['tag'], 'blah')
    self.assertEqual(tagList[1]['tag'], 'hello')

    # get filtered & limited list of tags
    result = db.list_tags(tagFilter='hello|bla', limit=1)
    tagList = [tag for tag in result if tag['tag'] in ['name', 'hello', 'blah']]
    self.assertEqual(len(tagList), 1)
    self.assertEqual(tagList[0]['tag'], 'blah')

    # get tag & list of values
    result = db.get_tag('hello')
    self.assertEqual(result['tag'], 'hello')
    valueList = [value for value in result['values'] if value['value'] in ['tiger', 'lion']]
    self.assertEqual(len(valueList), 2)
    self.assertEqual(valueList[0]['value'], 'lion')
    self.assertEqual(valueList[1]['value'], 'tiger')

    # get tag & limited list of values
    result = db.get_tag('hello', limit=1)
    self.assertEqual(result['tag'], 'hello')
    valueList = [value for value in result['values'] if value['value'] in ['tiger', 'lion']]
    self.assertEqual(len(valueList), 1)
    self.assertEqual(valueList[0]['value'], 'lion')

    # get tag & filtered list of values (match)
    result = db.get_tag('hello', valueFilter='tig')
    self.assertEqual(result['tag'], 'hello')
    valueList = [value for value in result['values'] if value['value'] in ['tiger', 'lion']]
    self.assertEqual(len(valueList), 1)
    self.assertEqual(valueList[0]['value'], 'tiger')

    # get tag & filtered list of values (no match)
    result = db.get_tag('hello', valueFilter='^tigr')
    self.assertEqual(result['tag'], 'hello')
    valueList = [value for value in result['values'] if value['value'] in ['tiger', 'lion']]
    self.assertEqual(len(valueList), 0)

    # get nonexistent tag
    result = db.get_tag('notarealtag')
    self.assertIsNone(result)

    # basic find
    result = db.find_series(['hello=tiger'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    # find with regex
    result = db.find_series(['blah=~b.*', 'hello=~^tiger', 'test=~.*'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    # find with not regex
    result = db.find_series(['blah!=~$', 'hello=~tiger', 'test!=~.+'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    result = db.find_series(['hello=~lion', 'blah!=~$'])
    self.assertEqual(result, ['test.a;blah=blah;hello=lion'])

    # find with not equal
    result = db.find_series(['hello=tiger', 'blah!=blah'])
    self.assertEqual(result, [])

    result = db.find_series(['hello=tiger', 'blah!=foo'])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    result = db.find_series(['hello=tiger', 'blah!='])
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

    result = db.find_series(['blah!=', 'hello!='])
    self.assertEqual(result, ['test.a;blah=blah;hello=lion', 'test.a;blah=blah;hello=tiger'])

    # complex find
    result = db.find_series(['hello=~lion|tiger', 'blah!=foo'])
    self.assertEqual(result, ['test.a;blah=blah;hello=lion', 'test.a;blah=blah;hello=tiger'])

    # add series without 'hello' tag
    result = db.tag_series('test.b;blah=blah')
    self.assertEqual(result, 'test.b;blah=blah')

    # find series without tag
    result = db.find_series(['name=test.b', 'hello='])
    self.assertEqual(result, ['test.b;blah=blah'])

    # find that results in no matched values
    result = db.find_series(['blah=~foo'])
    self.assertEqual(result, [])

    # find with invalid tagspec
    with self.assertRaises(ValueError):
      db.find_series('test')

    # find with no specs that require non-empty match
    with self.assertRaises(ValueError):
      db.find_series('test=')

    # tag multiple series
    result = db.tag_multi_series([
      'test.a;blah=blah;hello=lion',
      'test.b;hello=lion;blah=blah',
      'test.c;blah=blah;hello=lion',
    ])
    self.assertEqual(result, [
      'test.a;blah=blah;hello=lion',
      'test.b;blah=blah;hello=lion',
      'test.c;blah=blah;hello=lion',
    ])

    # delete series we added
    self.assertTrue(db.del_series('test.a;blah=blah;hello=tiger'))
    self.assertTrue(db.del_series('test.a;blah=blah;hello=lion'))

    self.assertTrue(db.del_multi_series([
      'test.b;blah=blah;hello=lion',
      'test.c;blah=blah;hello=lion',
    ]))

  def test_local_tagdb(self):
    return self._test_tagdb(LocalDatabaseTagDB(settings))

  def test_redis_tagdb(self):
    return self._test_tagdb(RedisTagDB(settings))

  def test_tagdb_autocomplete(self):
    self.maxDiff = None

    db = LocalDatabaseTagDB(settings)

    self._test_autocomplete(db, 'graphite.tags.localdatabase.LocalDatabaseTagDB.find_series')

  def _test_autocomplete(self, db, patch_target):
    search_exprs = ['name=test.a']

    find_result = [('test.a;tag1=value1.%3d;tag2=value2.%3d' % (i, 201 - i)) for i in range(1,201)]

    def mock_find_series(self, exprs, requestContext=None):
      if search_exprs[0] not in exprs:
        raise Exception('Unexpected exprs %s' % str(exprs))

      return find_result

    with patch(patch_target, mock_find_series):
      result = db.auto_complete_tags(search_exprs)
      self.assertEqual(result, [
        'tag1',
        'tag2',
      ])

      result = db.auto_complete_tags(search_exprs, limit=1)
      self.assertEqual(result, [
        'tag1',
      ])

      result = db.auto_complete_values(search_exprs, 'tag2')
      self.assertEqual(result, [('value2.%3d' % i) for i in range(1,101)])

      result = db.auto_complete_values(search_exprs, 'tag2', limit=50)
      self.assertEqual(result, [('value2.%3d' % i) for i in range(1,51)])

      result = db.auto_complete_values(search_exprs, 'tag1', 'value1.1')
      self.assertEqual(result, [('value1.%3d' % i) for i in range(100,200)])

      result = db.auto_complete_values(search_exprs, 'tag1', 'value1.1', limit=50)
      self.assertEqual(result, [('value1.%3d' % i) for i in range(100,150)])

      result = db.auto_complete_values(search_exprs, 'nonexistenttag1', 'value1.1')
      self.assertEqual(result, [])

      find_result = [('test.a;tag1=value1.%3d;tag2=value2.%3d' % (i // 2, (201 - i) // 2)) for i in range(2,202)]

      result = db.auto_complete_values(search_exprs, 'tag1', 'value1.', limit=50)
      self.assertEqual(result, [('value1.%3d' % i) for i in range(1,51)])

  def test_find_series_cached(self):
    mockCache = Mock()
    mockCache.get.return_value = ['test.a;blah=blah;hello=tiger']

    result = LocalDatabaseTagDB(settings, cache=mockCache).find_series(['name=test.a','hello=tiger'])
    self.assertEqual(mockCache.get.call_count, 1)
    self.assertEqual(mockCache.get.call_args[0][0], 'TagDB.find_series:hello=tiger:name=test.a')
    self.assertEqual(result, ['test.a;blah=blah;hello=tiger'])

  def test_tagdb_cached(self):
    mockCache = Mock()
    mockCache.get.return_value = []

    mockLog = Mock()

    result = LocalDatabaseTagDB(settings, cache=mockCache, log=mockLog).find_series(['tag2=value2', 'tag1=value1'])

    self.assertEqual(mockCache.get.call_count, 1)
    self.assertEqual(mockCache.get.call_args[0][0], 'TagDB.find_series:tag1=value1:tag2=value2')
    self.assertEqual(result, [])

    self.assertEqual(mockLog.info.call_count, 1)
    self.assertRegexpMatches(
      mockLog.info.call_args[0][0],
      'graphite\.tags\.localdatabase\.LocalDatabaseTagDB\.find_series :: completed \(cached\) in [-.e0-9]+s'
    )

  def test_http_tagdb(self):
    # test http tagdb using django client
    db = HttpTagDB(settings)
    db.base_url = reverse('tagList').replace('/tags', '')
    db.username = ''
    db.password = ''

    # helper class to mock urllib3 response object
    class mockResponse(object):
      def __init__(self, status, data):
        self.status = status
        self.data = data

    # mock http request that forwards requests using django client
    def mockRequest(method, url, fields=None, headers=None, timeout=None):
      if db.username and db.password:
        self.assertEqual(headers, {'Authorization': 'Basic dGVzdDp0ZXN0\n'})
      else:
        self.assertEqual(headers, {})

      req_fields = {}
      for (field, value) in fields:
        if field in req_fields:
          req_fields[field].append(value)
        else:
          req_fields[field] = [value]

      if method == 'POST':
        result = self.client.post(url, req_fields)
      elif method == 'GET':
        result = self.client.get(url, req_fields)
      else:
        raise Exception('Invalid HTTP method %s' % method)

      return mockResponse(result.status_code, result.content)

    # use mockRequest to send http requests to live django running configured tagdb
    with patch('graphite.http_pool.http.request', mockRequest):
      self._test_tagdb(db)

      with self.assertRaisesRegexp(Exception, 'HTTP Error from remote tagdb: 405'):
        db.get_tag('delSeries')

      db.username = 'test'
      db.password = 'test'

      result = db.tag_series('test.a;hello=tiger;blah=blah')
      self.assertEqual(result, 'test.a;blah=blah;hello=tiger')

      result = db.list_values('hello')
      valueList = [value for value in result if value['value'] in ['tiger', 'lion']]
      self.assertEqual(len(valueList), 1)
      self.assertEqual(valueList[0]['value'], 'tiger')

      result = db.list_values('notarealtag')
      self.assertEqual(result, [])

      self.assertTrue(db.del_series('test.a;blah=blah;hello=tiger'))

      # test auto complete forwarding to remote host
      with self.settings(TAGDB_HTTP_AUTOCOMPLETE=True):
        self.maxDiff = None
        self._test_autocomplete(db, settings.TAGDB + '.find_series')

      # test auto complete using find_series
      with self.settings(TAGDB_HTTP_AUTOCOMPLETE=False):
        self._test_autocomplete(db, settings.TAGDB + '.find_series')

  def test_tag_views(self):
    url = reverse('tagList')

    ## tagSeries

    # get should fail
    response = self.client.get(url + '/tagSeries', {'path': 'test.a;hello=tiger;blah=blah'})
    self.assertEqual(response.status_code, 405)

    # post without path should fail
    response = self.client.post(url + '/tagSeries', {})
    self.assertEqual(response.status_code, 400)
    self.assertEqual(response['Content-Type'], 'application/json')

    # tagging a series should succeed
    expected = 'test.a;blah=blah;hello=tiger'

    response = self.client.post(url + '/tagSeries', {'path': 'test.a;hello=tiger;blah=blah'})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, sort_keys=True))

    ## list tags

    # put should fail
    response = self.client.put(url, {})
    self.assertEqual(response.status_code, 405)

    # filtered list
    expected = [{"tag": "hello"}]

    response = self.client.get(url, {'filter': 'hello$'})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    result = json.loads(response.content)
    self.assertEqual(len(result), len(expected))
    self.assertEqual(result[0]['tag'], expected[0]['tag'])

    # pretty output
    response = self.client.get(url, {'filter': 'hello$', 'pretty': 1})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    result = json.loads(response.content)
    self.assertEqual(len(result), len(expected))
    self.assertEqual(result[0]['tag'], expected[0]['tag'])

    ## tag details

    # put should fail
    response = self.client.put(url + '/hello', {})
    self.assertEqual(response.status_code, 405)

    expected = {"tag": "hello", "values": [{"count": 1, "value": "tiger"}]}

    response = self.client.get(url + '/hello', {'filter': 'tiger$'})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    result = json.loads(response.content)
    self.assertEqual(result['tag'], expected['tag'])
    self.assertEqual(len(result['values']), len(expected['values']))
    self.assertEqual(result['values'][0]['count'], expected['values'][0]['count'])
    self.assertEqual(result['values'][0]['value'], expected['values'][0]['value'])

    # pretty output
    response = self.client.get(url + '/hello', {'filter': 'tiger$', 'pretty': 1})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    result = json.loads(response.content)
    self.assertEqual(result['tag'], expected['tag'])
    self.assertEqual(len(result['values']), len(expected['values']))
    self.assertEqual(result['values'][0]['count'], expected['values'][0]['count'])
    self.assertEqual(result['values'][0]['value'], expected['values'][0]['value'])

    ## findSeries

    # put should fail
    response = self.client.put(url + '/findSeries', {})
    self.assertEqual(response.status_code, 405)

    # expr is required
    response = self.client.post(url + '/findSeries', {})
    self.assertEqual(response.status_code, 400)
    self.assertEqual(response['Content-Type'], 'application/json')

    # basic find
    expected = ['test.a;blah=blah;hello=tiger']

    response = self.client.get(url + '/findSeries?expr[]=name=test.a&expr[]=hello=tiger&expr[]=blah=blah&pretty=1')
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    # tag another series
    expected = 'test.a;blah=blah;hello=lion'

    response = self.client.post(url + '/tagSeries', {'path': 'test.a;hello=lion;blah=blah'})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, sort_keys=True))

    ## autocomplete tags

    response = self.client.put(url + '/autoComplete/tags', {})
    self.assertEqual(response.status_code, 405)

    expected = [
      'hello',
    ]

    response = self.client.get(url + '/autoComplete/tags?tagPrefix=hello&pretty=1')
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    expected = [
      'blah',
      'hello',
    ]

    response = self.client.get(url + '/autoComplete/tags?expr[]=name=test.a&pretty=1')
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    expected = [
      'hello',
    ]

    response = self.client.get(url + '/autoComplete/tags?expr=name=test.a&tagPrefix=hell&pretty=1')
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    ## autocomplete values

    response = self.client.put(url + '/autoComplete/values', {})
    self.assertEqual(response.status_code, 405)

    expected = {'error': 'no tag specified'}

    response = self.client.get(url + '/autoComplete/values', {})
    self.assertEqual(response.status_code, 400)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected))

    expected = ['lion','tiger']

    response = self.client.get(url + '/autoComplete/values?tag=hello&pretty=1')
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    expected = ['lion','tiger']

    response = self.client.get(url + '/autoComplete/values?expr[]=name=test.a&tag=hello&pretty=1')
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    expected = ['lion']

    response = self.client.get(url + '/autoComplete/values?expr=name=test.a&tag=hello&valuePrefix=li&pretty=1')
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    ## delSeries

    # PUT should fail
    response = self.client.put(url + '/delSeries', {})
    self.assertEqual(response.status_code, 405)

    # path is required
    response = self.client.post(url + '/delSeries', {})
    self.assertEqual(response.status_code, 400)
    self.assertEqual(response['Content-Type'], 'application/json')

    # delete first series we added
    expected = True

    response = self.client.post(url + '/delSeries', {'path': 'test.a;blah=blah;hello=tiger'})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, sort_keys=True))

    # delete second series
    expected = True

    response = self.client.post(url + '/delSeries', {'path': 'test.a;blah=blah;hello=lion'})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, sort_keys=True))

    # delete nonexistent series

    expected = True

    response = self.client.post(url + '/delSeries', {'path': 'test.a;blah=blah;hello=lion'})
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, sort_keys=True))

    # find nonexistent series
    expected = []

    response = self.client.get(url + '/findSeries?expr=name=test.a&expr=hello=tiger&expr=blah=blah')
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, sort_keys=True))

    # tag multiple series

    # get should fail
    response = self.client.get(url + '/tagMultiSeries', {'path': 'test.a;hello=tiger;blah=blah'})
    self.assertEqual(response.status_code, 405)

    # post without path should fail
    response = self.client.post(url + '/tagMultiSeries', {})
    self.assertEqual(response.status_code, 400)
    self.assertEqual(response['Content-Type'], 'application/json')

    # multiple path should succeed
    expected = [
      'test.a;blah=blah;hello=tiger',
      'test.b;blah=blah;hello=tiger',
    ]

    response = self.client.post(url + '/tagMultiSeries', {
      'path': [
        'test.a;hello=tiger;blah=blah',
        'test.b;hello=tiger;blah=blah',
      ],
      'pretty': '1',
    })
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    # multiple path[] should succeed
    expected = [
      'test.a;blah=blah;hello=tiger',
      'test.b;blah=blah;hello=tiger',
    ]

    response = self.client.post(url + '/tagMultiSeries', {
      'path[]': [
        'test.a;hello=tiger;blah=blah',
        'test.b;hello=tiger;blah=blah',
      ],
      'pretty': '1',
    })
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    # remove multiple series
    expected = True

    response = self.client.post(url + '/delSeries', {
      'path': [
        'test.a;hello=tiger;blah=blah',
        'test.b;hello=tiger;blah=blah',
      ],
      'pretty': '1',
    })
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))

    expected = True

    response = self.client.post(url + '/delSeries', {
      'path[]': [
        'test.a;hello=tiger;blah=blah',
        'test.b;hello=tiger;blah=blah',
      ],
      'pretty': '1',
    })
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response['Content-Type'], 'application/json')
    self.assertEqual(response.content, json_bytes(expected, indent=2, sort_keys=True))
