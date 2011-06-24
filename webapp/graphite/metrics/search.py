import time
from os.path import getmtime
from django.conf import settings
from graphite.logger import log
from graphite.storage import is_pattern, match_entries


class IndexSearcher:
  def __init__(self, index_path):
    self.index_path = index_path
    self.last_mtime = 0
    self._tree = {}

  @property
  def tree(self):
    current_mtime = getmtime(self.index_path)
    if current_mtime > self.last_mtime:
      try:
        self.reload()
      except:
        raise
        raise SearchIndexCorrupt(self.index_path)

    return self._tree

  def reload(self):
    log.info("SearchIndex: reloading data from %s" % self.index_path)
    t = time.time()
    total_entries = 0
    tree = {}
    for line in open(self.index_path):
      line = line.strip()
      if not line: continue
      branches = line.split('.')
      leaf = branches.pop()
      cursor = tree
      for branch in branches:
        if branch not in cursor:
          cursor[branch] = {}
        cursor = cursor[branch]
      cursor[leaf] = line
      total_entries += 1

    self._tree = tree
    log.info("SearchIndex: index reload took %.6f seconds (%d entries)" % (time.time() - t, total_entries))

  def search(self, query, filters=(), max_results=None):
    query_parts = query.split('.')
    filters = [f.lower() for f in filters]
    results_found = 0
    for result in self.subtree_query(self.tree, query_parts):
      if self.apply_filters(result.lower(), filters):
        yield result
        results_found += 1
        if max_results is not None and results_found >= max_results:
          return

  def subtree_query(self, root, query_parts):
    if query_parts:
      my_query = query_parts[0]
      if is_pattern(my_query):
        matches = [root[node] for node in match_entries(root, my_query)]
      elif my_query in root:
        matches = [ root[my_query] ]
      else:
        matches = []

    else:
      matches = root.values()

    for child_node in matches:
      if isinstance(child_node, basestring): # we've hit a match
        yield child_node
      else: # keep recursing
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
