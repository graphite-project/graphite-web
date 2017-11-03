import fnmatch
import os.path
import re

EXPAND_BRACES_RE = re.compile(r'.*(\{.*?[^\\]?\})')


def get_real_metric_path(absolute_path, metric_path):
    # Support symbolic links (real_metric_path ensures proper cache queries)
    real_absolute_path = os.path.realpath(absolute_path)
    if absolute_path != real_absolute_path:
        # replace left side base_fs_path that contains sym link with real fs path
        relative_fs_path = metric_path.replace('.', os.sep)
        absolute_path_no_ext, _ext = os.path.splitext(absolute_path)
        base_fs_path = os.path.dirname(absolute_path_no_ext[:-len(relative_fs_path)])
        real_base_fs_path = os.path.realpath(base_fs_path)
        real_relative_fs_path = real_absolute_path[len(real_base_fs_path):].lstrip(os.sep)
        return fs_to_metric(real_relative_fs_path)

    return metric_path


def fs_to_metric(path):
    dirpath = os.path.dirname(path)
    filename = os.path.basename(path)
    return os.path.join(dirpath, filename.split('.')[0]).replace(os.sep, '.')


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
        variations = pattern[v1 + 1:v2].split(',')
        variants = [pattern[:v1] + v + pattern[v2 + 1:] for v in variations]

    else:
        variants = [pattern]
    return list(_deduplicate(variants))


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


def expand_braces(s):
    res = list()

    # Used instead of s.strip('{}') because strip is greedy.
    # We want to remove only ONE leading { and ONE trailing }, if both exist
    def remove_outer_braces(s):
        if s[0] == '{' and s[-1] == '}':
            return s[1:-1]
        return s

    m = EXPAND_BRACES_RE.search(s)
    if m is not None:
        sub = m.group(1)
        open_brace, close_brace = m.span(1)
        if ',' in sub:
            for pat in sub.strip('{}').split(','):
                res.extend(expand_braces(
                    s[:open_brace] + pat + s[close_brace:]))
        else:
            res.extend(expand_braces(
                s[:open_brace] + remove_outer_braces(sub) + s[close_brace:]))
    else:
        res.append(s.replace('\\}', '}'))

    return list(set(res))
