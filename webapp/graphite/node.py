

class Node(object):
  __slots__ = ('name', 'path', 'local', 'is_leaf')

  def __init__(self, path):
    self.path = path
    self.name = path.split('.')[-1]
    self.local = True
    self.is_leaf = False

  def __repr__(self):
    return '<%s[%x]: %s>' % (self.__class__.__name__, id(self), self.path)


class BranchNode(Node):
  pass


class LeafNode(Node):
  __slots__ = ('reader', 'intervals')

  def __init__(self, path, reader):
    Node.__init__(self, path)
    self.reader = reader
    self.is_leaf = True

  def fetch(self, startTime, endTime, now=None, result_queue=None, headers=None):
    if result_queue:
      result_queue.put((self, self.reader.fetch(startTime, endTime, now, headers)))
    else:
      return self.reader.fetch(startTime, endTime, now, headers)

  def __repr__(self):
    return '<LeafNode[%x]: %s (%s)>' % (id(self), self.path, self.reader)
