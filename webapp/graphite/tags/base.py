"""Base tag database"""
import abc
import bisect
import re
import time

from graphite.tags.utils import TaggedSeries


class BaseTagDB(object):
    __metaclass__ = abc.ABCMeta

    def __init__(self, settings, *args, **kwargs):
        """Initialize the tag db."""
        self.settings = settings
        self.cache = kwargs.get('cache')
        self.log = kwargs.get('log')

    def find_series(self, tags, requestContext=None):
        """
        Find series by tag, accepts a list of tag specifiers and returns a list of matching paths.

        Tags specifiers are strings, and may have the following formats:

        .. code-block:: none

          tag=spec    tag value exactly matches spec
          tag!=spec   tag value does not exactly match spec
          tag=~value  tag value matches the regular expression spec
          tag!=~spec  tag value does not match the regular expression spec

        Any tag spec that matches an empty value is considered to match series that don't have that tag.

        At least one tag spec must require a non-empty value.

        Regular expression conditions are treated as being anchored at the start of the value.

        Matching paths are returned as a list of strings.
        """
        start_time = time.time()
        log_msg = 'completed in'

        try:
            cacheKey = self.find_series_cachekey(tags, requestContext=requestContext)
            result = self.cache.get(cacheKey) if self.cache else None
            if result is not None:
                log_msg = 'completed (cached) in'
            else:
                result = self._find_series(tags, requestContext)
                if self.cache:
                    self.cache.set(cacheKey, result, self.settings.TAGDB_CACHE_DURATION)
        except Exception:
            log_msg = 'failed in'
            raise
        finally:
            self.log_info('find_series',
                '{msg} {sec:.6}s'.format(
                    msg=log_msg,
                    sec=time.time() - start_time,
                )
            )

        return result

    def find_series_cachekey(self, tags, requestContext=None):
        return 'TagDB.find_series:' + ':'.join(sorted(tags))

    @abc.abstractmethod
    def _find_series(self, tags, requestContext=None):
        """
        Internal function called by find_series, follows the same semantics allowing base class to implement caching
        """

    @abc.abstractmethod
    def get_series(self, path, requestContext=None):
        """
        Get series by path, accepts a path string and returns a TaggedSeries object describing the series.

        If the path is not found in the TagDB, returns None.
        """

    @abc.abstractmethod
    def list_tags(self, tagFilter=None, limit=None, requestContext=None):
        """
        List defined tags, returns a list of dictionaries describing the tags stored in the TagDB.

        Each tag dict contains the key "tag" which holds the name of the tag.  Additional keys may be returned.

        .. code-block:: none

          [
            {
              'tag': 'tag1',
            },
          ]

        Accepts an optional tagFilter parameter which is a regular expression used to filter the list of returned tags.
        """

    @abc.abstractmethod
    def get_tag(self, tag, valueFilter=None, limit=None, requestContext=None):
        """
        Get details of a particular tag, accepts a tag name and returns a dict describing the tag.

        The dict contains the key "tag" which holds the name of the tag.  It also includes a "values" key,
        which holds a list of the values for each tag.  See list_values() for the structure of each value.

        .. code-block:: none

          {
            'tag': 'tag1',
            'values': [
              {
                'value': 'value1',
                'count': 1,
              }
            ],
          }

        Accepts an optional valueFilter parameter which is a regular expression used to filter the list of returned values.
        """

    @abc.abstractmethod
    def list_values(self, tag, valueFilter=None, limit=None, requestContext=None):
        """
        List values for a particular tag, returns a list of dictionaries describing the values stored in the TagDB.

        Each value dict contains the key "value" which holds the value, and the key "count" which is the number of
        series that have that value.  Additional keys may be returned.

        .. code-block:: none

          [
            {
              'value': 'value1',
              'count': 1,
            },
          ]

        Accepts an optional valueFilter parameter which is a regular expression used to filter the list of returned values.
        """

    @abc.abstractmethod
    def tag_series(self, series, requestContext=None):
        """
        Enter series into database.  Accepts a series string, upserts into the TagDB and returns the canonicalized series name.
        """

    def tag_multi_series(self, seriesList, requestContext=None):
        """
        Enter series into database.  Accepts a list of series strings, upserts into the TagDB and returns a list of canonicalized series names.
        """
        return [self.tag_series(series, requestContext) for series in seriesList]

    @abc.abstractmethod
    def del_series(self, series, requestContext=None):
        """
        Remove series from database.  Accepts a series string and returns True
        """

    def del_multi_series(self, seriesList, requestContext=None):
        """
        Remove series from database.  Accepts a list of series strings, removes them from the TagDB and returns True
        """
        for series in seriesList:
            self.del_series(series, requestContext)
        return True

    def auto_complete_tags(self, exprs, tagPrefix=None, limit=None, requestContext=None):
        """
        Return auto-complete suggestions for tags based on the matches for the specified expressions, optionally filtered by tag prefix
        """
        if limit is None:
            limit = self.settings.TAGDB_AUTOCOMPLETE_LIMIT
        else:
            limit = int(limit)

        if not exprs:
            return [
                tagInfo['tag'] for tagInfo in self.list_tags(
                    tagFilter='^(' + re.escape(tagPrefix) + ')' if tagPrefix else None,
                    limit=limit,
                    requestContext=requestContext,
                )
            ]

        result = []

        searchedTags = set([self.parse_tagspec(expr)[0] for expr in exprs])

        for path in self.find_series(exprs, requestContext=requestContext):
            try:
                tags = self.parse(path).tags
            except Exception:
                continue

            for tag in tags:
                if tag in searchedTags:
                    continue
                if tagPrefix and not tag.startswith(tagPrefix):
                    continue
                if tag in result:
                    continue
                if len(result) == 0 or tag >= result[-1]:
                    if len(result) >= limit:
                        continue
                    result.append(tag)
                else:
                    bisect.insort_left(result, tag)
                if len(result) > limit:
                    del result[-1]

        return result

    def auto_complete_values(self, exprs, tag, valuePrefix=None, limit=None, requestContext=None):
        """
        Return auto-complete suggestions for tags and values based on the matches for the specified expressions, optionally filtered by tag and/or value prefix
        """
        if limit is None:
            limit = self.settings.TAGDB_AUTOCOMPLETE_LIMIT
        else:
            limit = int(limit)

        if not exprs:
            return [
              v['value'] for v in self.list_values(
                tag,
                valueFilter='^(' + re.escape(valuePrefix) + ')' if valuePrefix else None,
                limit=limit,
                requestContext=requestContext,
              )
            ]

        result = []

        for path in self.find_series(exprs + [tag + '!='], requestContext=requestContext):
            try:
                tags = self.parse(path).tags
            except Exception:
                continue

            if tag not in tags:
                continue
            value = tags[tag]
            if valuePrefix and not value.startswith(valuePrefix):
                continue
            if value in result:
                continue
            if len(result) == 0 or value >= result[-1]:
                if len(result) >= limit:
                    continue
                result.append(value)
            else:
                bisect.insort_left(result, value)
            if len(result) > limit:
                del result[-1]

        return result

    def log_info(self, func, msg):
        if self.log:
            self.log.info('%s.%s.%s :: %s' % (self.__module__, self.__class__.__name__, func, msg))

    @staticmethod
    def parse(path):
        return TaggedSeries.parse(path)

    @staticmethod
    def parse_tagspec(tagspec):
        m = re.match('^([^;!=]+)(!?=~?)([^;]*)$', tagspec)
        if m is None:
            raise ValueError("Invalid tagspec %s" % tagspec)

        tag = m.group(1)
        operator = m.group(2)
        spec = m.group(3)

        return (tag, operator, spec)


class DummyTagDB(BaseTagDB):

    def _find_series(self, tags, requestContext=None):
        return []

    def get_series(self, path, requestContext=None):
        return None

    def list_tags(self, tagFilter=None, limit=None, requestContext=None):
        return []

    def get_tag(self, tag, valueFilter=None, limit=None, requestContext=None):
        return None

    def list_values(self, tag, valueFilter=None, limit=None, requestContext=None):
        return []

    def tag_series(self, series, requestContext=None):
        raise NotImplementedError('Tagging not implemented with DummyTagDB')

    def del_series(self, series, requestContext=None):
        return True
