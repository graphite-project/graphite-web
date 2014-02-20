
from graphite.logger import log
from graphite.intervals import Interval, IntervalSet
import time
import traceback


class Node(object):
  __slots__ = ('name', 'path', 'local', 'is_leaf', 'avoidIntervals')

  def __init__(self, path):
    self.path = path
    self.name = path.split('.')[-1]
    self.local = True
    self.is_leaf = False
    self.avoidIntervals = False

  def __repr__(self):
    return '<%s[%x]: %s>' % (self.__class__.__name__, id(self), self.path)


class BranchNode(Node):
  pass


class LeafNode(Node):
  __slots__ = ('reader', 'intervals')

  def __init__(self, path, reader, avoidIntervals=False):
    try:
      Node.__init__(self, path)
      self.reader = reader
      self.avoidIntervals = avoidIntervals
      if self.avoidIntervals:
        now = int(time.time())
        intervals = [Interval(0, now)]
        self.intervals = IntervalSet(intervals)               
      else:
        self.intervals = reader.get_intervals()
      self.is_leaf = True
    except Exception, e:
      log.exception("EXCEPTION: LeafNode.__init__() exception: %s" % (e))
    return

  def fetch(self, startTime, endTime):
    retval = []
    try:
      if self.avoidIntervals:
        self.intervals = self.reader.get_intervals(startTime=startTime, endTime=endTime)
      # log.info("LeafNode.fetch(): have intervals path %s, st=%s, et=%s, intervals: %s" % (self.path, startTime, endTime, self.intervals))
      retval = self.reader.fetch(startTime, endTime)
    except Exception, e:
      log.exception("EXCEPTION:  LeafNode.fetch(), path %s, exception: %s" % (self.path, e))
    return retval

  def __repr__(self):
    return '<LeafNode[%x]: %s (%s)>' % (id(self), self.path, self.reader)
