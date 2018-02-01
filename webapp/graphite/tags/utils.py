"""Utility functions for tag databases."""
import re

from hashlib import sha256


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
  def encode(metric, sep='.', hash_only=False):
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

    The hash_only parameter can be set to True to use the hash as the filename instead of a
    human-readable name.  This avoids issues with filename length restrictions, at the expense of
    being unable to decode the filename and determine the original metric name.

    A concrete example:

    .. code-block:: none

      some.metric;tag1=value2;tag2=value.2

      with sha256 hash starting effaae would be stored in:

      _tagged/eff/aae/some-metric;tag1=value2;tag2=value-2.wsp (whisper)
      _tagged/eff/aae/some-metric;tag1=value2;tag2=value-2 (ceres)

    """
    if ';' in metric:
      metric_hash = sha256(metric.encode('utf8')).hexdigest()
      return sep.join([
        '_tagged',
        metric_hash[0:3],
        metric_hash[3:6],
        metric_hash if hash_only else metric.replace('.', '_DOT_')
      ])

    # metric isn't tagged, just replace dots with the separator and trim any leading separator
    return metric.replace('.', sep).lstrip(sep)

  @staticmethod
  def decode(path, sep='.'):
    """
    Helper function to decode tagged series from storage in whisper etc
    """
    if path.startswith('_tagged'):
      return path.split(sep, 3)[-1].replace('_DOT_', '.')

    # metric isn't tagged, just replace the separator with dots
    return path.replace(sep, '.')

  def __init__(self, metric, tags, series_id=None):
    self.metric = metric
    self.tags = tags
    self.id = series_id

  @property
  def path(self):
    return self.__class__.format(self.tags)
