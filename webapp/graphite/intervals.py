INFINITY = float('inf')
NEGATIVE_INFINITY = -INFINITY


class IntervalSet:
  __slots__ = ('intervals', 'size')

  def __init__(self, intervals, disjoint=False):
    self.intervals = intervals

    if not disjoint:
      self.intervals = union_overlapping(self.intervals)

    self.size = sum(i.size for i in self.intervals)

  def __repr__(self):
    return repr(self.intervals)

  def __iter__(self):
    return iter(self.intervals)

  def __nonzero__(self):
    return self.size != 0

  def __sub__(self, other):
    return self.intersect( other.complement() )

  def complement(self):
    complementary = []
    cursor = NEGATIVE_INFINITY

    for interval in self.intervals:
      if cursor < interval.start:
        complementary.append( Interval(cursor, interval.start) )
        cursor = interval.end

    if cursor < INFINITY:
      complementary.append( Interval(cursor, INFINITY) )

    return IntervalSet(complementary, disjoint=True)

  def intersect(self, other): #XXX The last major bottleneck. Factorial-time hell.
    # Then again, this function is entirely unused...
    if (not self) or (not other):
      return IntervalSet([])

    #earliest = max(self.intervals[0].start, other.intervals[0].start)
    #latest = min(self.intervals[-1].end, other.intervals[-1].end)

    #mine = [i for i in self.intervals if i.start >= earliest and i.end <= latest]
    #theirs = [i for i in other.intervals if i.start >= earliest and i.end <= latest]

    intersections = [x for x in (i.intersect(j)
                                 for i in self.intervals
                                 for j in other.intervals)
                     if x]

    return IntervalSet(intersections, disjoint=True)

  def intersect_interval(self, interval):
    intersections = [x for x in (i.intersect(interval)
                                 for i in self.intervals)
                     if x]
    return IntervalSet(intersections, disjoint=True)

  def union(self, other):
    return IntervalSet( sorted(self.intervals + other.intervals) )



class Interval:
  __slots__ = ('start', 'end', 'tuple', 'size')

  def __init__(self, start, end):
    if end - start < 0:
      raise ValueError("Invalid interval start=%s end=%s" % (start, end))

    self.start = start
    self.end = end
    self.tuple = (start, end)
    self.size = self.end - self.start

  def __eq__(self, other):
    return self.tuple == other.tuple

  def __hash__(self):
    return hash( self.tuple )

  def __cmp__(self, other):
    return cmp(self.start, other.start)

  def __len__(self):
    raise TypeError("len() doesn't support infinite values, use the 'size' attribute instead")

  def __nonzero__(self):
    return self.size != 0

  def __repr__(self):
    return '<Interval: %s>' % str(self.tuple)

  def intersect(self, other):
    start = max(self.start, other.start)
    end = min(self.end, other.end)

    if end > start:
      return Interval(start, end)

  def overlaps(self, other):
    earlier = self if self.start <= other.start else other
    later = self if earlier is other else other
    return earlier.end >= later.start

  def union(self, other):
    if not self.overlaps(other):
      raise TypeError("Union of disjoint intervals is not an interval")

    start = min(self.start, other.start)
    end = max(self.end, other.end)
    return Interval(start, end)


def union_overlapping(intervals):
  """Union any overlapping intervals in the given set."""
  disjoint_intervals = []

  for interval in intervals:
    if not disjoint_intervals or interval.start > disjoint_intervals[-1].end:
      disjoint_intervals.append(interval)
    elif interval.end > disjoint_intervals[-1].end:
      disjoint_intervals[-1] = Interval(disjoint_intervals[-1].start, interval.end)

  return disjoint_intervals
