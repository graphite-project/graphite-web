""" Vertica Data Source for Graphite

Copyright [2013] Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

import pyodbc

from graphite.node import BranchNode, LeafNode
from graphite.readers import VerticaReader

class VerticaTree(object):
  """ Provides a find function to query the Graphite Tree stored in the Vertica DB.
      The results are iterated over and are either BranchNode or LeafNode objects.
  """
  def __init__(self, dsn, finder_table, metric_table, depth):
    """ Init function
        DSN must be setup in the OS ODBC config.
    """
    self.dsn = dsn
    self.conn = pyodbc.connect(dsn)
    self.finder_table = finder_table
    self.metric_table = metric_table
    self.depth = int(depth)

  def _build_path(self, parent_tuple):
    """ Given a list of parents build the graphite style path handling the various graphite special cases
        which are described in self._split_path.
    """
    parents = list(parent_tuple)
    # First deal with any empty paths
    for i, item in enumerate(parents):
      if item == '':
        parents[i] = '~'

    #last join and replace out any spaces
    return '.'.join(parents).replace(' ', '+').replace('(', '[').replace(')', ']')

  def _split_path(self, graphite_path):
    """ Take the dot seperated graphite path and split it into parts. There are various special cases
        to work around limitations with the graphite path:
          - % is the sql wildcard so replace *
          - graphite can't handle empty string so I replace with ~
          - graphite can't handle spaces so I replace with +
          - graphite can't handle () replace with []
    """
    clean_query = graphite_path.replace('*', '%').replace('~', '').replace('+', ' ').replace('[', '(').replace(']', ')')
    #pyodbc doesn't like unicode strings in some cases, so I explicitly cast to str
    splits = [ str(p) for p in clean_query.split('.')]
    return splits

  def get_cursor(self):
    """ Wrapper around the connection cursor which makes sure there is an active connection and if needed reconnects.
    """
    try:
      cur = self.conn.cursor()
      cur.execute('SELECT 1') #In most cases it does fail until this is run
    except pyodbc.Error:
      self.conn = pyodbc.connect(self.dsn)
      cur = self.conn.cursor()

    return cur

  def find(self, query):
    """ Query is a . seperated path with optional wildcards.
        This translates the path into the appropriate sql query, runs it then returns the results as a generator.
        It assumes there is a strict tree structure reflected in the queries and does not handle general queries
        across all levels of the tree.
    """
    splits = self._split_path(query)
    split_len = len(splits)

    if splits[-1] == '%': #Vertica is faster in this case to have no extra WHERE statement rather than like '%'
      del splits[-1]

    if split_len == 1: #The root query
      query = 'SELECT DISTINCT(depth0) FROM %s' % self.finder_table
    elif split_len < self.depth: #A tree building query
      parents = ','.join(['depth%d' % num for num in range(split_len - 1)])
      query = 'SELECT DISTINCT(depth%d),%s FROM %s WHERE ' % (split_len - 1, parents, self.finder_table)
    else: #Looking for leaves
      query = 'SELECT * FROM %s WHERE ' % self.finder_table

    for i, path_element in enumerate(splits):
      if i != 0: #No AND right after the Where
        query += 'AND '
      if '%' in path_element:
        query += 'depth%d LIKE ? ' % i
      else:
        query += 'depth%d = ? ' % i

    query += ';'
    cur = self.get_cursor()
    cur.execute(query, *splits)
    for row in cur:
      if split_len < self.depth: #A tree building query
        #For sql purposes the last branch is first in the list, I have to bring it around
        parent_list = list(row[1:])
        parent_list.append(row[0])
        yield BranchNode(self._build_path(parent_list))
      else:
        # In this result set row[0] is the id
        yield LeafNode(self._build_path(row[1:]), VerticaReader(self.get_cursor, row.id, self.metric_table) )

