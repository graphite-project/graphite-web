import codecs
import time

from six.moves.urllib.parse import urlencode, urlsplit, parse_qs

from django.conf import settings
from django.core.cache import cache

from graphite.http_pool import http
from graphite.intervals import Interval, IntervalSet
from graphite.logger import log
from graphite.node import LeafNode, BranchNode
from graphite.render.hashing import compactHash
from graphite.util import unpickle, logtime, is_local_interface, json, msgpack, BufferedHTTPReader

from graphite.finders.utils import BaseFinder
from graphite.readers.remote import RemoteReader


class RemoteFinder(BaseFinder):
    local = False

    @classmethod
    def factory(cls):
        finders = []
        for host in settings.CLUSTER_SERVERS:
            if settings.REMOTE_EXCLUDE_LOCAL and is_local_interface(cls.parse_host(host)['host']):
                continue
            finders.append(cls(host))
        return finders

    @staticmethod
    def parse_host(host):
        if host.startswith('http://') or host.startswith('https://'):
            parsed = urlsplit(host)
        else:
            scheme = 'https' if settings.INTRACLUSTER_HTTPS else 'http'
            parsed = urlsplit(scheme + '://' + host)

        return {
          'host': parsed.netloc,
          'url': '%s://%s%s' % (parsed.scheme, parsed.netloc, parsed.path),
          'params': {key: value[-1] for (key, value) in parse_qs(parsed.query).items()},
        }

    def __init__(self, host):
        parsed = self.parse_host(host)
        self.host = parsed['host']
        self.url = parsed['url']
        self.params = parsed['params']
        self.last_failure = 0
        self.tags = not self.params.get('noTags')

    @property
    def disabled(self):
        return time.time() - self.last_failure < settings.REMOTE_RETRY_DELAY

    def fail(self):
        self.last_failure = time.time()

    @logtime
    def find_nodes(self, query, timer=None):
        timer.set_msg(
            'host: {host}, query: {query}'.format(
                host=self.host,
                query=query))

        log.debug("RemoteFinder.find_nodes(host=%s, query=%s) called" % (self.host, query))

        # prevent divide by 0
        cacheTTL = settings.FIND_CACHE_DURATION or 1
        if query.startTime:
            start = query.startTime - (query.startTime % cacheTTL)
        else:
            start = ""

        if query.endTime:
            end = query.endTime - (query.endTime % cacheTTL)
        else:
            end = ""

        cacheKey = "find:%s:%s:%s:%s" % (self.host, compactHash(query.pattern), start, end)

        results = cache.get(cacheKey)
        if results is not None:
            log.debug(
                "RemoteFinder.find_nodes(host=%s, query=%s) using cached result" %
                (self.host, query))
        else:
            url = '/metrics/find/'

            query_params = [
                ('local', self.params.get('local', '1')),
                ('format', self.params.get('format', 'pickle')),
                ('query', query.pattern),
            ]
            if query.startTime:
                query_params.append(('from', int(query.startTime)))

            if query.endTime:
                query_params.append(('until', int(query.endTime)))

            result = self.request(
                url,
                fields=query_params,
                headers=query.headers,
                timeout=settings.FIND_TIMEOUT)

            try:
                if result.getheader('content-type') == 'application/x-msgpack':
                  results = msgpack.load(BufferedHTTPReader(
                    result, buffer_size=settings.REMOTE_BUFFER_SIZE), encoding='utf-8')
                else:
                  results = unpickle.load(BufferedHTTPReader(
                    result, buffer_size=settings.REMOTE_BUFFER_SIZE))
            except Exception as err:
                self.fail()
                log.exception(
                    "RemoteFinder[%s] Error decoding find response from %s: %s" %
                    (self.host, result.url_full, err))
                raise Exception("Error decoding find response from %s: %s" % (result.url_full, err))
            finally:
                result.release_conn()

            cache.set(cacheKey, results, settings.FIND_CACHE_DURATION)

        for node_info in results:
            # handle both 1.x and 0.9.x output
            path = node_info.get('path') or node_info.get('metric_path')
            is_leaf = node_info.get('is_leaf') or node_info.get('isLeaf')
            intervals = node_info.get('intervals') or []
            if not isinstance(intervals, IntervalSet):
                intervals = IntervalSet(
                    [Interval(interval[0], interval[1]) for interval in intervals])

            node_info = {
                'is_leaf': is_leaf,
                'path': path,
                'intervals': intervals,
            }

            if is_leaf:
                reader = RemoteReader(self, node_info)
                node = LeafNode(path, reader)
            else:
                node = BranchNode(path)

            node.local = False
            yield node

    def fetch(self, patterns, start_time, end_time, now=None, requestContext=None):
        reader = RemoteReader(self, {}, bulk_query=patterns)
        return reader.fetch_multi(start_time, end_time, now, requestContext)

    def get_index(self, requestContext):
        url = '/metrics/index.json'

        headers = requestContext.get('forwardHeaders')

        result = self.request(
            url,
            fields=[
              ('local', self.params.get('local', '1')),
            ],
            headers=headers,
            timeout=settings.FIND_TIMEOUT)

        try:
            reader = codecs.getreader('utf-8')
            results = json.load(reader(result))
        except Exception as err:
            self.fail()
            log.exception(
                "RemoteFinder[%s] Error decoding index response from %s: %s" %
                (self.host, result.url_full, err))
            raise Exception("Error decoding index response from %s: %s" % (result.url_full, err))
        finally:
            result.release_conn()

        return results

    def auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None):
        """
        Return auto-complete suggestions for tags based on the matches for the specified expressions, optionally filtered by tag prefix
        """
        if limit is None:
            limit = settings.TAGDB_AUTOCOMPLETE_LIMIT

        fields = [
            ('tagPrefix', tagPrefix or ''),
            ('limit', str(limit)),
            ('local', self.params.get('local', '1')),
        ]
        for expr in exprs:
            fields.append(('expr', expr))

        result = self.request(
            '/tags/autoComplete/tags',
            fields,
            headers=requestContext.get('forwardHeaders') if requestContext else None,
            timeout=settings.FIND_TIMEOUT)
        try:
            reader = codecs.getreader('utf-8')
            results = json.load(reader(result))
        except Exception as err:
            self.fail()
            log.exception(
                "RemoteFinder[%s] Error decoding autocomplete tags response from %s: %s" %
                (self.host, result.url_full, err))
            raise Exception("Error decoding autocomplete tags response from %s: %s" % (result.url_full, err))
        finally:
            result.release_conn()

        return results

    def auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None):
        """
        Return auto-complete suggestions for tags and values based on the matches for the specified expressions, optionally filtered by tag and/or value prefix
        """
        if limit is None:
            limit = settings.TAGDB_AUTOCOMPLETE_LIMIT

        fields = [
            ('tag', tag or ''),
            ('valuePrefix', valuePrefix or ''),
            ('limit', str(limit)),
            ('local', self.params.get('local', '1')),
        ]
        for expr in exprs:
            fields.append(('expr', expr))

        result = self.request(
            '/tags/autoComplete/values',
            fields,
            headers=requestContext.get('forwardHeaders') if requestContext else None,
            timeout=settings.FIND_TIMEOUT)
        try:
            reader = codecs.getreader('utf-8')
            results = json.load(reader(result))
        except Exception as err:
            self.fail()
            log.exception(
                "RemoteFinder[%s] Error decoding autocomplete values response from %s: %s" %
                (self.host, result.url_full, err))
            raise Exception("Error decoding autocomplete values response from %s: %s" % (result.url_full, err))
        finally:
            result.release_conn()

        return results

    def request(self, path, fields=None, headers=None, timeout=None):
        url = "%s%s" % (self.url, path)
        url_full = "%s?%s" % (url, urlencode(fields))

        try:
            result = http.request(
                'POST' if settings.REMOTE_STORE_USE_POST else 'GET',
                url,
                fields=fields,
                headers=headers,
                timeout=timeout,
                preload_content=False)
        except BaseException as err:
            self.fail()
            log.exception("RemoteFinder[%s] Error requesting %s: %s" % (self.host, url_full, err))
            raise Exception("Error requesting %s: %s" % (url_full, err))

        if result.status != 200:
            result.release_conn()
            self.fail()
            log.exception(
                "RemoteFinder[%s] Error response %d from %s" % (self.host, result.status, url_full))
            raise Exception("Error response %d from %s" % (result.status, url_full))

        result.url_full = url_full

        # reset last failure time so that retried fetches can re-enable a remote
        self.last_failure = 0

        log.debug("RemoteFinder[%s] Fetched %s" % (self.host, url_full))
        return result
