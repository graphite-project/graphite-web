import fnmatch
import os.path
import re


def get_real_metric_path(absolute_path, metric_path):
  # Support symbolic links (real_metric_path ensures proper cache queries)
  if os.path.islink(absolute_path):
    real_fs_path = os.path.realpath(absolute_path)
    relative_fs_path = metric_path.replace('.', os.sep)
    base_fs_path = absolute_path[:-len(relative_fs_path)]
    relative_real_fs_path = real_fs_path[len(base_fs_path):]
    return fs_to_metric(relative_real_fs_path)

  return metric_path


def fs_to_metric(path):
  dirpath = os.path.dirname(path)
  filename = os.path.basename(path)
  return os.path.join(dirpath, filename.split('.')[0]).replace(os.sep,'.')


def _deduplicate(entries):
  yielded = set()
  for entry in entries:
    if entry not in yielded:
      yielded.add(entry)
      yield entry


def extract_variants(pattern):
  """Extract the pattern variants (ie. {foo,bar}baz = foobaz or barbaz)."""
  v1, v2 = pattern.find('{'), pattern.find('}')
  if v1 > -1 and v2 > v1:
    variations = pattern[v1+1:v2].split(',')
    variants = [ pattern[:v1] + v + pattern[v2+1:] for v in variations ]

  else:
    variants = [ pattern ]
  return list( _deduplicate(variants) )


def match_entries(entries, pattern):
    # First we check for pattern variants (ie. {foo,bar}baz = foobaz or barbaz)
    matching = []

    for variant in expand_braces(pattern):
      matching.extend(fnmatch.filter(entries, variant))

    return list(_deduplicate(matching))


"""
    Brace expanding patch for python3 borrowed from:
    https://bugs.python.org/issue9584
"""
def expand_braces(orig):
    r = r'.*(\{.+?[^\\]\})'
    p = re.compile(r)

    s = orig[:]
    res = list()

    m = p.search(s)
    if m is not None:
      sub = m.group(1)
      open_brace = s.find(sub)
      close_brace = open_brace + len(sub) - 1
      if sub.find(',') != -1:
        for pat in sub.strip('{}').split(','):
          res.extend(expand_braces(s[:open_brace] + pat + s[close_brace + 1:]))
      else:
          res.extend(expand_braces(s[:open_brace] + sub.replace('}', '\\}') + s[close_brace + 1:]))
    else:
      res.append(s.replace('\\}', '}'))

    return list(set(res))
