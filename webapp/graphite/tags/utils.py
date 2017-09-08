"""Utility functions for tag databases."""
import abc
import re

from hashlib import sha256

try:
    from importlib import import_module
except ImportError:  # python < 2.7 compatibility
    from django.utils.importlib import import_module


class TaggedSeries(object):
  @classmethod
  def parse(cls, path):
    # if path is in openmetrics format: metric{tag="value",...}
    if path[-2:] == '"}' and '{' in path:
      return cls.parse_openmetrics(path)

    # path is a carbon path with optional tags: metric;tag=value;...
    return cls.parse_carbon(path)

  @classmethod
  def parse_openmetrics(cls, path):
    """parse a path in openmetrics format: metric{tag="value",...}

    https://github.com/RichiH/OpenMetrics
    """
    (metric, rawtags) = path[0:-1].split('{', 2)
    if not metric:
      raise Exception('Cannot parse path %s, no metric found' % path)

    tags = {}

    while len(rawtags) > 0:
      m = re.match(r'([^=]+)="((?:[\\]["\\]|[^"\\])+)"(:?,|$)', rawtags)
      if not m:
        raise Exception('Cannot parse path %s, invalid segment %s' % (path, rawtags))

      tags[m.group(1)] = m.group(2).replace(r'\"', '"').replace(r'\\', '\\')
      rawtags = rawtags[len(m.group(0)):]

    tags['name'] = metric
    return cls(metric, tags)

  @classmethod
  def parse_carbon(cls, path):
    """parse a carbon path with optional tags: metric;tag=value;..."""
    segments = path.split(';')

    metric = segments[0]
    if not metric:
      raise Exception('Cannot parse path %s, no metric found' % path)

    tags = {}

    for segment in segments[1:]:
      tag = segment.split('=', 1)
      if len(tag) != 2 or not tag[0]:
        raise Exception('Cannot parse path %s, invalid segment %s' % (path, segment))

      tags[tag[0]] = tag[1]

    tags['name'] = metric
    return cls(metric, tags)

  @staticmethod
  def format(tags):
    return tags.get('name', '') + ''.join(sorted([
      ';%s=%s' % (tag, value)
      for tag, value in tags.items()
      if tag != 'name'
    ]))

  @staticmethod
  def encode(metric, sep='.'):
    """
    Helper function to encode tagged series for storage in whisper etc

    When tagged series are detected, they are stored in a separate hierarchy of folders under a
    top-level _tagged folder, where subfolders are created by using the first 3 hex digits of the
    sha256 hash of the tagged metric path (4096 possible folders), and second-level subfolders are
    based on the following 3 hex digits (another 4096 possible folders) for a total of 4096^2
    possible subfolders. The metric files themselves are created with any . in the metric path
    replaced with -, to avoid any issues where metrics, tags or values containing a '.' would end
    up creating further subfolders. This helper is used by both whisper and ceres, but by design
    each carbon database and graphite-web finder is responsible for handling its own encoding so
    that different backends can create their own schemes if desired.

    A concrete example:

    .. code-block:: none

      some.metric;tag1=value2;tag2=value.2

      with sha256 hash starting effaae would be stored in:

      _tagged/eff/aae/some-metric;tag1=value2;tag2=value-2.wsp (whisper)
      _tagged/eff/aae/some-metric;tag1=value2;tag2=value-2 (ceres)

    """
    if ';' in metric:
      metric_hash = sha256(metric.encode('utf8')).hexdigest()
      return sep.join(['_tagged', metric_hash[0:3], metric_hash[3:6], metric.replace('.', '-')])

    # metric isn't tagged, just replace dots with the separator and trim any leading separator
    return metric.replace('.', sep).lstrip(sep)

  def __init__(self, metric, tags, series_id=None):
    self.metric = metric
    self.tags = tags
    self.id = series_id

  @property
  def path(self):
    return self.__class__.format(self.tags)


class BaseTagDB(object):
  __metaclass__ = abc.ABCMeta

  def __init__(self):
    """Initialize the tag db."""
    pass

  @abc.abstractmethod
  def find_series(self, tags):
    """
    Find series by tag, accepts a list of tag specifiers and returns a list of matching paths.

    Tags specifiers are strings, and may have the following formats:

    .. code-block:: none

      tag=spec    tag value exactly matches spec
      tag!=spec   tag value does not exactly match spec
      tag=~value  tag value matches the regular expression spec
      tag!=~spec  tag value does not match the regular expression spec

    Any tag spec that matches an empty value is consindered to match series that don't have that tag.

    At least one tag spec must require a non-empty value.

    Regular expression conditions are treated as being anchored at the start of the value.

    Matching paths are returned as a list of strings.
    """
    pass

  @abc.abstractmethod
  def get_series(self, path):
    """
    Get series by path, accepts a path string and returns a TaggedSeries object describing the series.

    If the path is not found in the TagDB, returns None.
    """
    pass

  @abc.abstractmethod
  def list_tags(self):
    """
    List defined tags, returns a list of dictionaries describing the tags stored in the TagDB.

    Each tag dict contains the key "tag" which holds the name of the tag.  Additional keys may be returned.

    .. code-block:: none

      [
        {
          'tag': 'tag1',
        },
      ]

    """
    pass

  @abc.abstractmethod
  def get_tag(self, tag):
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

    """
    pass

  @abc.abstractmethod
  def list_values(self, tag):
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

    """
    pass

  @abc.abstractmethod
  def tag_series(self, series):
    """
    Enter series into database.  Accepts a series string, upserts into the TagDB and returns the canonicalized series name.
    """
    pass

  @abc.abstractmethod
  def del_series(self, series):
    """
    Remove series from database.  Accepts a series string and returns True
    """
    pass

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


def get_tagdb(tagdb_path):
    module_name, class_name = tagdb_path.rsplit('.', 1)
    module = import_module(module_name)
    return getattr(module, class_name)()
