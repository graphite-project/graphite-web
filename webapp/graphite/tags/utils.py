"""Utility functions for tag databases."""
import abc

try:
    from importlib import import_module
except ImportError:  # python < 2.7 compatibility
    from django.utils.importlib import import_module


class TaggedSeries(object):
  @classmethod
  def parse(cls, path):
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

  def __init__(self, metric, tags, id=None):
    self.metric = metric
    self.tags = tags
    self.id = id

  def format(self):
    return self.metric + ''.join(sorted([
      ';' + tag + '=' + value
      for tag, value in self.tags.items()
      if tag != 'name'
    ]))


class BaseTagDB(object):
  __metaclass__ = abc.ABCMeta

  def __init__(self):
    """Initialize the tag db."""
    pass

  @abc.abstractmethod
  def find_series(self, tags):
    """Find series by tag"""
    pass

  @abc.abstractmethod
  def get_series(self, path):
    """Get series by path"""
    pass

  @abc.abstractmethod
  def list_tags(self):
    """List defined tags"""
    pass

  @abc.abstractmethod
  def get_tag(self, tag):
    """Get details of a particular tag"""
    pass

  @abc.abstractmethod
  def list_values(self, tag):
    """List values for a particular tag"""
    pass

  @abc.abstractmethod
  def tag_series(self, series):
    """Enter series into database and return canonical series name"""
    pass

  @abc.abstractmethod
  def del_series(self, series):
    """Remove series from database"""
    pass

  def parse(self, path):
    return TaggedSeries.parse(path)


def get_tagdb(tagdb_path):
    module_name, class_name = tagdb_path.rsplit('.', 1)
    module = import_module(module_name)
    return getattr(module, class_name)()
