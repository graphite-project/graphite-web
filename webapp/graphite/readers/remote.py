from traceback import format_exc

from django.conf import settings

from graphite.logger import log
from graphite.readers.utils import BaseReader
from graphite.util import unpickle, msgpack, BufferedHTTPReader

import time


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

        retries = 1 # start counting at one to make log output and settings more readable
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

        data = self.deserialize(result)

        try:
            return [
                {
                    'pathExpression': series.get('pathExpression', series['name']),
                    'name': series['name'],
                    'time_info': (series['start'], series['end'], series['step']),
                    'values': series['values'],
                }
                for series in data
            ]
        except Exception as err:
            self.finder.fail()
            log.exception(
                "RemoteReader[%s] Invalid render response from %s: %s" %
                (self.finder.host, result.url_full, repr(err)))
            raise Exception("Invalid render response from %s: %s" % (result.url_full, repr(err)))

    #
    # Here be Snap monkey-patch code
    #
    def deserialize(self, result):
        # avoid buffered reader if possible, instead using in-memory unpacking for small->REMOTE_BUFFER_SIZE payloads
        try:
            start = time.time()
            measured_reader = MeasuredReader(BufferedHTTPReader(result, settings.REMOTE_BUFFER_SIZE))
            first_chunk = self._fill_first_buffer(measured_reader, settings.REMOTE_BUFFER_SIZE)
            if len(first_chunk) < settings.REMOTE_BUFFER_SIZE:
                log.info("Using inline deserializer for small payload")
                download_time = time.time() - start
                serialization_start = time.time()
                deserialized = self._deserialize_buffer(first_chunk, result.getheader('content-type'))

                serialization_time = time.time() - serialization_start
                log.info("Read %d bytes in %f seconds." % (measured_reader.bytes_read, download_time))
                log.info("Deserialized %d bytes in %f seconds." % (measured_reader.bytes_read, serialization_time))
                return deserialized
            else:
                log.info("Using streaming deserializer for large payload")
                reader = BufferedHTTPReader(measured_reader, settings.REMOTE_BUFFER_SIZE)
                reader.buffer = first_chunk
                deserialized = self._deserialize_stream(reader, result.getheader('content-type'))
                
                log.info("Processed %d bytes in %f seconds." % (measured_reader.bytes_read, time.time() - start))
                return deserialized
        except Exception as err:
            self.finder.fail()
            log.exception(
                "RemoteReader[%s] Error decoding render response from %s: %s" %
                (self.finder.host, result.url_full, err))
            raise Exception("Error decoding render response from %s: %s" % (result.url_full, err))
        finally:

            result.release_conn()

    def _fill_first_buffer(self, reader, max_buffer_size):
        payload = b''
        cur = reader.read(max_buffer_size)
        while len(payload) < max_buffer_size and len(cur) > 0:
            payload += cur
            cur = reader.read(max_buffer_size - len(payload))
        return payload

    def _deserialize_buffer(self, byte_buffer, content_type):
        if content_type == 'application/x-msgpack':
            data = msgpack.unpackb(byte_buffer, encoding='utf-8')
        else:
            data = unpickle.loads(byte_buffer)

        return data

    def _deserialize_stream(self, stream, content_type):
        if content_type == 'application/x-msgpack':
            data = msgpack.load(stream, encoding='utf-8')
        else:
            data = unpickle.load(stream)

        return data

