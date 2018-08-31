from traceback import format_exc

from django.conf import settings

from graphite.logger import log
from graphite.readers.utils import BaseReader
from graphite.util import unpickle, msgpack, BufferedHTTPReader

import time
import json


class MeasuredReader(object):
  def __init__(self, reader):
    self.reader = reader
    self.bytes_read = 0

  def read(self, amt=None):
    b = b''
    try:
      if amt:
        b = self.reader.read(amt)
      else:
        b = self.reader.read()
      return b
    finally:
      self.bytes_read += len(b)


class RemoteReader(BaseReader):
  __slots__ = (
    'finder',
    'metric_path',
    'intervals',
    'bulk_query',
  )

  def __init__(self, finder, node_info, bulk_query=None):
    self.finder = finder
    self.metric_path = node_info.get('path') or node_info.get('metric_path')
    self.intervals = node_info.get('intervals', [])
    self.bulk_query = set(bulk_query) if bulk_query else (
      [self.metric_path] if self.metric_path else []
    )

  def __repr__(self):
    return '<RemoteReader[%x]: %s %s>' % (id(self), self.finder.host, ','.join(self.bulk_query))

  def get_intervals(self):
    return self.intervals

  def fetch(self, startTime, endTime, now=None, requestContext=None):
    for series in self.fetch_multi(startTime, endTime, now, requestContext):
      if series['name'] == self.metric_path:
        return (series['time_info'], series['values'])

  def fetch_multi(self, startTime, endTime, now=None, requestContext=None):
    if not self.bulk_query:
      return []

    query_params = [
      ('format', self.finder.params.get('format', 'pickle')),
      ('local', self.finder.params.get('local', '1')),
      ('noCache', '1'),
      ('from', int(startTime)),
      ('until', int(endTime))
    ]

    for target in self.bulk_query:
      query_params.append(('target', target))

    if now is not None:
      query_params.append(('now', int(now)))

    headers = requestContext.get('forwardHeaders') if requestContext else None

    retries = 1  # start counting at one to make log output and settings more readable
    while True:
      try:
        result = self.finder.request(
          '/render/',
          fields=query_params,
          headers=headers,
          timeout=settings.FETCH_TIMEOUT,
        )
        break
      except Exception:
        if retries >= settings.MAX_FETCH_RETRIES:
          log.exception("Failed after %s attempts! Root cause:\n%s" %
                        (settings.MAX_FETCH_RETRIES, format_exc()))
          raise
        else:
          log.exception("Got an exception when fetching data! Try: %i of %i. Root cause:\n%s" %
                        (retries, settings.MAX_FETCH_RETRIES, format_exc()))
        retries += 1

    return self.deserialize(result)

  def deserialize(self, result):
    """
    Based on configuration, either stream-deserialize a response in settings.REMOTE_BUFFER_SIZE chunks,
    or read the entire payload and use inline deserialization.
    :param result: an http response object
    :return: deserialized response payload from cluster server
    """
    start = time.time()
    try:
      should_buffer = settings.REMOTE_BUFFER_SIZE > 0
      measured_reader = MeasuredReader(BufferedHTTPReader(result, settings.REMOTE_BUFFER_SIZE))

      content_type = result.getheader('content-type')
      if should_buffer:
        log.debug("Using streaming deserializer.")
        reader = BufferedHTTPReader(measured_reader, settings.REMOTE_BUFFER_SIZE)
        deserialized = self._deserialize_stream(reader, content_type)
      else:
        log.debug("Using inline deserializer for small payload")
        deserialized = self._deserialize_buffer(measured_reader.read(), content_type)
    except Exception as err:
      self.finder.fail()
      log.exception(
        "RemoteReader[%s] Error decoding render response from %s: %s" %
        (self.finder.host, result.url_full, err))
      raise Exception("Error decoding render response from %s: %s" % (result.url_full, repr(err)))
    finally:
      log.debug("Processed %d bytes in %f seconds." % (measured_reader.bytes_read, time.time() - start))
      result.release_conn()

    try:
      if content_type == "application/json":
        return self._create_fetch_response_from_json(deserialized)
      else:
        return self._create_fetch_response_from_object(deserialized)
      return self._create_fetch_response_from_json()
    except Exception as err:
      self.finder.fail()
      log.exception(
        "RemoteReader[%s] Invalid render response from %s: %s" %
        (self.finder.host, result.url_full, repr(err)))
      raise Exception("Invalid render response from %s: %s" % (result.url_full, repr(err)))

  @staticmethod
  def _deserialize_buffer(byte_buffer, content_type):
    if content_type == 'application/json':
      data = json.loads(byte_buffer)
    elif content_type == 'application/x-msgpack':
      data = msgpack.unpackb(byte_buffer, encoding='utf-8')
    else:
      data = unpickle.loads(byte_buffer)

    return data

  @staticmethod
  def _deserialize_stream(stream, content_type):
    if content_type == 'application/json':
      data = json.load(stream)
    elif content_type == 'application/x-msgpack':
      data = msgpack.load(stream, encoding='utf-8')
    else:
      data = unpickle.load(stream)

    return data

  @staticmethod
  def _create_fetch_response_from_json(data):
    # infer step, as it's not part of a json response
    step = 60
    start_time = 0
    end_time = 0

    if len(data) > 0 and len(data[0].get('datapoints', [])) > 1:
      example_series_datapoints = data[0]['datapoints']
      step = example_series_datapoints[1][1] - example_series_datapoints[0][1]
      start_time = example_series_datapoints[0][1]
      end_time = example_series_datapoints[-1][1]

    return [
      {
        'pathExpression': str(series.get('target')),
        'name': str(series.get('target')),
        'time_info': (start_time, end_time, step),
        'values': [d[0] for d in series.get('datapoints', [])],
      }
      for series in data
    ]

  @staticmethod
  def _create_fetch_response_from_object(data):
    return [
      {
        'pathExpression': series.get('pathExpression', series['name']),
        'name': series['name'],
        'time_info': (series['start'], series['end'], series['step']),
        'values': series['values'],
      }
      for series in data
    ]
