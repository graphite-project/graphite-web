import fnmatch
import os.path


def get_real_metric_path(absolute_path, metric_path):
  # Support symbolic links (real_metric_path ensures proper cache queries)
  if os.path.islink(absolute_path):
    real_fs_path = os.path.realpath(absolute_path)
    relative_fs_path = metric_path.replace('.', '/')
    base_fs_path = absolute_path[:-len(relative_fs_path)]
    relative_real_fs_path = real_fs_path[len(base_fs_path):]
    return fs_to_metric(relative_real_fs_path)

  return metric_path


def fs_to_metric(path):
  dirpath = os.path.dirname(path)
  filename = os.path.basename(path)
  return os.path.join(dirpath, filename.split('.')[0]).replace('/','.')


def _deduplicate(entries):
  yielded = set()
  for entry in entries:
    if entry not in yielded:
      yielded.add(entry)
      yield entry


def match_entries(entries, pattern):
  """A drop-in replacement for fnmatch.filter that supports pattern
  variants (ie. {foo,bar}baz = foobaz or barbaz)."""
  v1, v2 = pattern.find('{'), pattern.find('}')

  if v1 > -1 and v2 > v1:
    variations = pattern[v1+1:v2].split(',')
    variants = [ pattern[:v1] + v + pattern[v2+1:] for v in variations ]
    matching = []

    for variant in variants:
      matching.extend( fnmatch.filter(entries, variant) )

    return list( _deduplicate(matching) ) #remove dupes without changing order

  else:
    matching = fnmatch.filter(entries, pattern)
    matching.sort()
    return matching
