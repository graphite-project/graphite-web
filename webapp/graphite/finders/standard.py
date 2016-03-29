import os
from os.path import isdir, isfile, join, basename
from django.conf import settings

from graphite.logger import log
from graphite.node import BranchNode, LeafNode
from graphite.readers import WhisperReader, GzippedWhisperReader, RRDReader
from graphite.util import find_escaped_pattern_fields

from . import fs_to_metric, get_real_metric_path, match_entries


class StandardFinder:
  DATASOURCE_DELIMITER = '::RRD_DATASOURCE::'

  def __init__(self, directories=None):
    directories = directories or settings.STANDARD_DIRS
    self.directories = directories

  def find_nodes(self, query):
    clean_pattern = query.pattern.replace('\\', '')
    pattern_parts = clean_pattern.split('.')

    for root_dir in self.directories:
      for absolute_path in self._find_paths(root_dir, pattern_parts):
        if basename(absolute_path).startswith('.'):
          continue

        if self.DATASOURCE_DELIMITER in basename(absolute_path):
          (absolute_path, datasource_pattern) = absolute_path.rsplit(self.DATASOURCE_DELIMITER, 1)
        else:
          datasource_pattern = None

        relative_path = absolute_path[ len(root_dir): ].lstrip('/')
        metric_path = fs_to_metric(relative_path)
        real_metric_path = get_real_metric_path(absolute_path, metric_path)

        metric_path_parts = metric_path.split('.')
        for field_index in find_escaped_pattern_fields(query.pattern):
          metric_path_parts[field_index] = pattern_parts[field_index].replace('\\', '')
        metric_path = '.'.join(metric_path_parts)

        # Now we construct and yield an appropriate Node object
        if isdir(absolute_path):
          yield BranchNode(metric_path)

        elif isfile(absolute_path):
          if absolute_path.endswith('.wsp') and WhisperReader.supported:
            reader = WhisperReader(absolute_path, real_metric_path)
            yield LeafNode(metric_path, reader)

          elif absolute_path.endswith('.wsp.gz') and GzippedWhisperReader.supported:
            reader = GzippedWhisperReader(absolute_path, real_metric_path)
            yield LeafNode(metric_path, reader)

          elif absolute_path.endswith('.rrd') and RRDReader.supported:
            if datasource_pattern is None:
              yield BranchNode(metric_path)

            else:
              for datasource_name in RRDReader.get_datasources(absolute_path):
                if match_entries([datasource_name], datasource_pattern):
                  reader = RRDReader(absolute_path, datasource_name)
                  yield LeafNode(metric_path + "." + datasource_name, reader)

  def _find_paths(self, current_dir, patterns):
    """Recursively generates absolute paths whose components underneath current_dir
    match the corresponding pattern in patterns"""
    pattern = patterns[0]
    patterns = patterns[1:]

    has_wildcard = pattern.find('{') > -1 or pattern.find('[') > -1 or pattern.find('*') > -1 or pattern.find('?') > -1

    if has_wildcard: # this avoids os.listdir() for performance
      try:
        entries = os.listdir(current_dir)
      except OSError as e:
        log.exception(e)
        entries = []
    else:
      entries = [ pattern ]

    subdirs = [entry for entry in entries if isdir(join(current_dir, entry))]
    matching_subdirs = match_entries(subdirs, pattern)

    if len(patterns) == 1 and RRDReader.supported: #the last pattern may apply to RRD data sources
      if not has_wildcard:
        entries = [ pattern + ".rrd" ]
      files = [entry for entry in entries if isfile(join(current_dir, entry))]
      rrd_files = match_entries(files, pattern + ".rrd")

      if rrd_files: #let's assume it does
        datasource_pattern = patterns[0]

        for rrd_file in rrd_files:
          absolute_path = join(current_dir, rrd_file)
          yield absolute_path + self.DATASOURCE_DELIMITER + datasource_pattern

    if patterns: #we've still got more directories to traverse
      for subdir in matching_subdirs:

        absolute_path = join(current_dir, subdir)
        for match in self._find_paths(absolute_path, patterns):
          yield match

    else: #we've got the last pattern
      if not has_wildcard:
        entries = [ pattern + '.wsp', pattern + '.wsp.gz', pattern + '.rrd' ]
      files = [entry for entry in entries if isfile(join(current_dir, entry))]
      matching_files = match_entries(files, pattern + '.*')

      for base_name in matching_files + matching_subdirs:
        yield join(current_dir, base_name)
