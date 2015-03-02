from datetime import datetime
import json
import os
import time
import logging

from graphite.render.hashing import hashRequest, hashData
import whisper

from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import HttpRequest, QueryDict
from django.test import TestCase

# Silence logging during tests
LOGGER = logging.getLogger()

# logging.NullHandler is a python 2.7ism
if hasattr(logging, "NullHandler"):
  LOGGER.addHandler(logging.NullHandler())


class RenderTest(TestCase):
  db_std = os.path.join(settings.WHISPER_DIR, 'test.wsp')
  db_hot = os.path.join(settings.HOT_WHISPER_DIR, 'test.wsp')

  def wipe_whisper(self):
    try:
      os.remove(self.db_std)
    except OSError:
      pass

    try:
      os.remove(self.db_hot)
    except OSError:
      pass

  def test_render_view(self):
    url = reverse('graphite.render.views.renderView')

    ts = int(time.time())
    std_points = 60
    hot_points = 10
    request_fields = {'target': 'test', 'format': 'json', 'local': 1, 'until': ts, 'from': ts - 6}

    response = self.client.get(url, request_fields)
    self.assertEqual(json.loads(response.content), [])
    self.assertTrue(response.has_header('Expires'))
    self.assertTrue(response.has_header('Last-Modified'))
    self.assertTrue(response.has_header('Cache-Control'))

    response = self.client.get(url, {'target': 'test'})
    self.assertEqual(response['Content-Type'], 'image/png')
    self.assertTrue(response.has_header('Expires'))
    self.assertTrue(response.has_header('Last-Modified'))
    self.assertTrue(response.has_header('Cache-Control'))

    self.addCleanup(self.wipe_whisper)

    std_data_set = [[float(i) / 10, ts - std_points + 1 + i] for i in range(std_points - 1)]
    hot_data_set = [[float(i) / 100, ts - hot_points + 1 + i] for i in range(hot_points - 1)]

    whisper.create(self.db_std, [(1, std_points)])

    for [value, timestamp] in std_data_set:
      try:
        whisper.update(self.db_std, value, timestamp)
      except whisper.TimestampNotCovered:
        pass

    response = self.client.get(url, request_fields)
    data = json.loads(response.content)
    data_points = data[0]['datapoints'][-4:] \
      if data[0]['datapoints'][-1][0] is not None \
      else data[0]['datapoints'][-5:-1]

    self.assertEqual(data_points, std_data_set[-4:])

    whisper.create(self.db_hot, [(1, hot_points)])

    for [value, timestamp] in hot_data_set:
      whisper.update(self.db_hot, value, timestamp)

    response = self.client.get(url, request_fields)
    data = json.loads(response.content)
    data_points = data[0]['datapoints'][-4:] \
      if data[0]['datapoints'][-1][0] is not None \
      else data[0]['datapoints'][-5:-1]

    self.assertEqual(data_points, hot_data_set[-4:])

    request_fields['from'] = ts - hot_points - 1
    response = self.client.get(url, request_fields)
    data = json.loads(response.content)
    data_points = data[0]['datapoints'][-4:] \
      if data[0]['datapoints'][-1][0] is not None \
      else data[0]['datapoints'][-5:-1]

    self.assertEqual(data_points, std_data_set[-4:])

  def test_hash_request(self):
    # Requests with the same parameters should hash to the same values,
    # regardless of HTTP method.
    target_qd = QueryDict('&target=randomWalk(%27random%20walk%27)'
                          '&target=randomWalk(%27random%20walk2%27)'
                          '&target=randomWalk(%27random%20walk3%27)')
    empty_qd = QueryDict('')
    post_request = HttpRequest()
    post_request.POST = target_qd.copy()
    post_request.GET = empty_qd.copy()
    get_request = HttpRequest()
    get_request.GET = target_qd.copy()
    get_request.POST = empty_qd.copy()

    self.assertEqual(hashRequest(get_request), hashRequest(post_request))

    # Check that POST parameters are included in cache key calculations
    post_request_with_params = HttpRequest()
    post_request_with_params.GET = empty_qd.copy()
    post_request_with_params.POST = target_qd.copy()
    empty_post_request = HttpRequest()
    empty_post_request.GET = empty_qd.copy()
    empty_post_request.POST = empty_qd.copy()

    self.assertNotEqual(hashRequest(post_request_with_params),
                        hashRequest(empty_post_request))

    # Check that changing the order of the parameters has no impact on the
    # cache key
    request_params = HttpRequest()
    request_qd = QueryDict('&foo=1&bar=2')
    request_params.GET = request_qd.copy()
    request_params.POST = empty_qd.copy()

    reverse_request_params = HttpRequest()
    reverse_request_qd = QueryDict('&bar=2&foo=1')
    reverse_request_params.GET = reverse_request_qd.copy()
    reverse_request_params.POST = empty_qd.copy()

    self.assertEqual(hashRequest(request_params),
                     hashRequest(reverse_request_params))

  def test_hash_data(self):
    targets = ['foo=1', 'bar=2']
    start_time = datetime.fromtimestamp(0)
    end_time = datetime.fromtimestamp(1000)
    self.assertEqual(hashData(targets, start_time, end_time),
                     hashData(reversed(targets), start_time, end_time))

  def test_correct_timezone(self):
    url = reverse('graphite.render.views.renderView')
    response = self.client.get(url, {
      'target': 'constantLine(12)',
      'format': 'json',
      'from': '07:01_20140226',
      'until': '08:01_20140226',
      # tz is UTC
    })
    data = json.loads(response.content)[0]['datapoints']
    # all the from/until/tz combinations lead to the same window
    expected = [[12, 1393398060], [12, 1393401660]]
    self.assertEqual(data, expected)

    response = self.client.get(url, {
      'target': 'constantLine(12)',
      'format': 'json',
      'from': '08:01_20140226',
      'until': '09:01_20140226',
      'tz': 'Europe/Berlin',
      })
    data = json.loads(response.content)[0]['datapoints']
    # all the from/until/tz combinations lead to the same window
    expected = [[12, 1393398060], [12, 1393401660]]
    self.assertEqual(data, expected)
