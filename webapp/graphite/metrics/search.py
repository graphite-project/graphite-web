import time
import subprocess
import os.path
from django.conf import settings
from graphite.logger import log
from graphite.storage import is_pattern, match_entries

class IndexSearcher:
  def __init__(self, index_path):
    self.index_path = index_path
    if not os.path.isfile(index_path) and os.path.exists(index_path):
      log.exception("%s does not appear to be a file." % str(index_path));
    else:
      build_index_path = os.path.join(settings.GRAPHITE_ROOT, "bin/build-index.sh")
      retcode = subprocess.call(build_index_path)
      if retcode != 0:
        log.exception("Couldn't build index file %s" % str(index_path))
    self.last_mtime = 0
    self._tree = (None, {}) # (data, children)

  @property
  def tree(self):
    current_mtime = os.path.getmtime(self.index_path)
    if current_mtime > self.last_mtime:
      self.reload()

    return self._tree

  def reload(self):
    log.info("SearchIndex: reloading data from %s" % self.index_path)
    t = time.time()
    total_entries = 0
    tree = (None, {}) # (data, children)
    for line in open(self.index_path):
      line = line.strip()
      if not line:
        continue

      branches = line.split('.')
      leaf = branches.pop()
      parent = None
      cursor = tree
      for branch in branches:
        if branch not in cursor[1]:
          cursor[1][branch] = (None, {}) # (data, children)
        parent = cursor
        cursor = cursor[1][branch]

      cursor[1][leaf] = (line, {})
      total_entries += 1

    self._tree = tree
    self.last_mtime = os.path.getmtime(self.index_path)
    log.info("SearchIndex: index reload took %.6f seconds (%d entries)" % (time.time() - t, total_entries))

  def search(self, query, filters=(), max_results=None, keep_query_pattern=False):
    query_parts = query.split('.')
    filters = [f.lower() for f in filters]
    results_found = 0
    for result in self.subtree_query(self.tree, query_parts):
      # Overlay the query pattern on the resulting paths
      if keep_query_pattern:
        result_parts = result.split('.')
        result = '.'.join(query_parts + result_parts[len(query_parts):])

      if self.apply_filters(result.lower(), filters):
        yield result
        results_found += 1
        if max_results is not None and results_found >= max_results:
          return

  def subtree_query(self, root, query_parts):
    if query_parts:
      my_query = query_parts[0]
      if is_pattern(my_query):
        matches = [root[1][node] for node in match_entries(root[1], my_query)]
      elif my_query in root[1]:
        matches = [ root[1][my_query] ]
      else:
        matches = []

    else:
      matches = root[1].values()

    for child_node in matches:
      if child_node[0] is not None:
        yield child_node[0]
      for result in self.subtree_query(child_node, query_parts[1:]):
        yield result

  def apply_filters(self, node, filters):
    for filter_expr in filters:
      if not self.test_filter(node, filter_expr):
        return False
    return True

  def test_filter(self, node, filter_expr):
    for subexpr in filter_expr.split(','):
      if subexpr and subexpr in node:
        return True
    return False


class SearchIndexCorrupt(StandardError):
  pass


searcher = IndexSearcher(settings.INDEX_FILE)
searcher.reload()
