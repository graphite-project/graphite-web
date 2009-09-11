import sys
import os
import pwd


def daemonize():
  if os.fork() > 0: sys.exit(0)
  os.setsid()
  if os.fork() > 0: sys.exit(0)
  si = open('/dev/null', 'r')
  so = open('/dev/null', 'a+')
  se = open('/dev/null', 'a+', 0)
  os.dup2(si.fileno(), sys.stdin.fileno())
  os.dup2(so.fileno(), sys.stdout.fileno())
  os.dup2(se.fileno(), sys.stderr.fileno())


def dropprivs(user):
  uid,gid = pwd.getpwnam(user)[2:4]
  os.setregid(gid,gid)
  os.setreuid(uid,uid)
  return (uid,gid)


class OrderedDict(dict):
  def __init__(self, *args, **kwargs):
    dict.__init__(self, *args, **kwargs)
    self._items = dict.items(self)

  def __setitem__(self, key, value):
    if key in self:
      oldValue = self[key]
      self._items.remove( (key,oldValue) )

    dict.__setitem__(self, key, value)
    self._items.append( (key,value) )

  def items(self):
    return self._items

  def iteritems(self):
    return iter( self._items )

  def keys(self):
    return [key for key,value in self._items]

  def values(self):
    return [value for key,value in self._items]

  def iterkeys(self):
    return iter(key for key,value in self._items)

  __iter__ = iterkeys

  def itervalues(self):
    return iter(value for key,value in self._items)

  def __delitem__(self, key):
    dict.__delitem__(self, key)
    self._items = [item for item in self._items if hash(item[0]) != hash(key)]

  def clear(self):
    dict.clear(self)
    self._items = []

  def pop(self, key):
    value = dict.pop(self, key)
    self._items.remove( (key,value) )
    return value

  def popitem(self):
    item = dict.popitem(self)
    self._items.remove(item)
    return item

  def update(self, otherDict):
    for key in otherDict:
      self[key] = otherDict[key]
