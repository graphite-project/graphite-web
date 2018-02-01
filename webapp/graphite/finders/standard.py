import bisect
import fnmatch
import os
from os.path import isdir, isfile, join, basename, splitext
from django.conf import settings

# Use the built-in version of scandir/walk if possible, otherwise
# use the scandir module version
try:
    from os import scandir, walk
except ImportError:
    from scandir import scandir, walk

from graphite.logger import log
from graphite.node import BranchNode, LeafNode
from graphite.readers import WhisperReader, GzippedWhisperReader, RRDReader
from graphite.util import find_escaped_pattern_fields
from graphite.finders.utils import BaseFinder
from graphite.tags.utils import TaggedSeries

from . import fs_to_metric, get_real_metric_path, match_entries, expand_braces


class StandardFinder(BaseFinder):
    DATASOURCE_DELIMITER = '::RRD_DATASOURCE::'

    def __init__(self, directories=None):
        directories = directories or settings.STANDARD_DIRS
        self.directories = directories

    def find_nodes(self, query):
        clean_pattern = query.pattern.replace('\\', '')

        # translate query pattern if it is tagged
        tagged = not query.pattern.startswith('_tagged.') and ';' in query.pattern
        if tagged:
          # tagged series are stored in whisper using encoded names, so to retrieve them we need to
          # encode the query pattern using the same scheme used in carbon when they are written.
          encoded_paths = [
            TaggedSeries.encode(query.pattern, sep=os.sep, hash_only=True),
            TaggedSeries.encode(query.pattern, sep=os.sep, hash_only=False),
          ]

        pattern_parts = clean_pattern.split('.')

        for root_dir in self.directories:
            if tagged:
                relative_paths = []
                for pattern in encoded_paths:
                    entries = [
                        pattern + '.wsp',
                        pattern + '.wsp.gz',
                        pattern + '.rrd',
                    ]
                    for entry in entries:
                        if isfile(join(root_dir, entry)):
                            relative_paths.append(entry)
            else:
                relative_paths = self._find_paths(root_dir, pattern_parts)

            for relative_path in relative_paths:
                if basename(relative_path).startswith('.'):
                    continue

                if self.DATASOURCE_DELIMITER in basename(relative_path):
                    (relative_path, datasource_pattern) = relative_path.rsplit(
                        self.DATASOURCE_DELIMITER, 1)
                else:
                    datasource_pattern = None

                absolute_path = join(root_dir, relative_path)
                metric_path = fs_to_metric(relative_path)
                real_metric_path = get_real_metric_path(absolute_path, metric_path)

                # if we're finding by tag, return the proper metric path
                if tagged:
                  metric_path = query.pattern
                else:
                  metric_path_parts = metric_path.split('.')
                  for field_index in find_escaped_pattern_fields(query.pattern):
                      metric_path_parts[field_index] = pattern_parts[field_index].replace('\\', '')
                  metric_path = '.'.join(metric_path_parts)

                # Now we construct and yield an appropriate Node object
                if isdir(absolute_path):
                    yield BranchNode(metric_path)

                elif absolute_path.endswith('.wsp') and WhisperReader.supported:
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
        raw_pattern = patterns[0]
        patterns = patterns[1:]

        for pattern in expand_braces(raw_pattern):
            has_wildcard = pattern.find('[') > -1 or pattern.find('*') > -1 or pattern.find('?') > -1

            matching_subdirs = []
            files = []
            if has_wildcard:  # this avoids os.listdir() for performance
                subdirs = []
                try:
                    for x in scandir(current_dir):
                        if x.is_file():
                            files.append(x.name)
                        if x.is_dir():
                            subdirs.append(x.name)
                except OSError as e:
                    log.exception(e)

                if pattern == "**":
                    matching_subdirs = map(
                      lambda item: item[0][len(current_dir) + 1:],
                      walk(current_dir)
                    )

                    # if this is a terminal globstar, add a pattern for all files in subdirs
                    if not patterns:
                        patterns = ["*"]
                else:
                    matching_subdirs = match_entries(subdirs, pattern)
            elif isdir(join(current_dir, pattern)):
                matching_subdirs.append(pattern)

            # the last pattern may apply to RRD data sources
            if len(patterns) == 1 and RRDReader.supported:
                if not has_wildcard:
                    entries = [
                      pattern + ".rrd",
                    ]
                    rrd_files = [entry for entry in entries if isfile(join(current_dir, entry))]
                else:
                    rrd_files = match_entries(files, pattern + ".rrd")

                if rrd_files:  # let's assume it does
                    datasource_pattern = patterns[0]

                    for rrd_file in rrd_files:
                        yield rrd_file + self.DATASOURCE_DELIMITER + datasource_pattern

            if patterns:  # we've still got more directories to traverse
                for subdir in matching_subdirs:
                    absolute_path = join(current_dir, subdir)
                    for match in self._find_paths(absolute_path, patterns):
                        yield join(subdir, match)

            else:  # we've got the last pattern
                if not has_wildcard:
                    entries = [
                        pattern + '.wsp',
                        pattern + '.wsp.gz',
                        pattern + '.rrd',
                    ]
                    matching_files = [entry for entry in entries if isfile(join(current_dir, entry))]
                else:
                    matching_files = match_entries(files, pattern + '.*')

                for match in matching_files + matching_subdirs:
                    yield match

    def get_index(self, requestContext):
        matches = []

        for root, _, files in walk(settings.WHISPER_DIR):
          root = root.replace(settings.WHISPER_DIR, '')
          for base_name in files:
            if fnmatch.fnmatch(base_name, '*.wsp'):
              match = join(root, base_name).replace('.wsp', '').replace('/', '.').lstrip('.')
              bisect.insort_left(matches, match)

        # unlike 0.9.x, we're going to use os.walk with followlinks
        # since we require Python 2.7 and newer that supports it
        if RRDReader.supported:
          for root, _, files in walk(settings.RRD_DIR, followlinks=True):
            root = root.replace(settings.RRD_DIR, '')
            for base_name in files:
              if fnmatch.fnmatch(base_name, '*.rrd'):
                absolute_path = join(settings.RRD_DIR, root, base_name)
                base_name = splitext(base_name)[0]
                metric_path = join(root, base_name)
                rrd = RRDReader(absolute_path, metric_path)
                for datasource_name in rrd.get_datasources(absolute_path):
                  match = join(metric_path, datasource_name).replace('.rrd', '').replace('/', '.').lstrip('.')
                  if match not in matches:
                    bisect.insort_left(matches, match)

        return matches
