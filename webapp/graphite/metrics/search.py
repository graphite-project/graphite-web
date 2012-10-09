import time
import subprocess
import os.path
from django.conf import settings
from graphite.logger import log
from graphite.util import is_pattern
from graphite.finders import match_entries

class IndexSearcher:
  def __init__(self, index_path):
    self.index_path = index_path
    if not os.path.exists(index_path):
      open(index_path, 'w').close() # touch the file to prevent re-entry down this code path
      build_index_path = os.path.join(settings.GRAPHITE_ROOT, "bin/build-index.sh")
      retcode = subprocess.call(build_index_path)
      if retcode != 0:
        log.exception("Couldn't build index file %s" % index_path)
        raise RuntimeError("Couldn't build index file %s" % index_path)
    self.last_mtime = 0
    self._tree = (None, {}) # (data, children)
    log.info("[IndexSearcher] performing initial index load")
    self.reload()

  @property
  def tree(self):
    current_mtime = os.path.getmtime(self.index_path)
    if current_mtime > self.last_mtime:
      log.info("[IndexSearcher] reloading stale index, current_mtime=%s last_mtime=%s" %
               (current_mtime, self.last_mtime))
      self.reload()

    return self._tree

  def reload(self):
    log.info("[IndexSearcher] reading index data from %s" % self.index_path)
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
    log.info("[IndexSearcher] index reload took %.6f seconds (%d entries)" % (time.time() - t, total_entries))

  def search(self, query, max_results=None, keep_query_pattern=False):
    query_parts = query.split('.')
    metrics_found = set()
    for result in self.subtree_query(self.tree, query_parts):
      # Overlay the query pattern on the resulting paths
      if keep_query_pattern:
        path_parts = result['path'].split('.')
        result['path'] = '.'.join(query_parts) + result['path'][len(query_parts):]

      if result['path'] in metrics_found:
        continue
      yield result

      metrics_found.add(result['path'])
      if max_results is not None and len(metrics_found) >= max_results:
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
      result = {
        'path' : child_node[0],
        'is_leaf' : bool(child_node[0]),
      }
      if result['path'] is not None and not result['is_leaf']:
        result['path'] += '.'
      yield result

      if query_parts:
        for result in self.subtree_query(child_node, query_parts[1:]):
          yield result


class SearchIndexCorrupt(StandardError):
  pass


searcher = IndexSearcher(settings.INDEX_FILE)
