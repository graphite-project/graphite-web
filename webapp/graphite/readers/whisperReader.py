import os
import time
from graphite.node import LeafNode, BranchNode
from graphite.intervals import Interval, IntervalSet
from graphite.carbonlink import CarbonLink
from graphite.logger import log
from django.conf import settings

try:
  import whisper
except ImportError:
  whisper = False

try:
  import gzip
except ImportError:
  gzip = False

class WhisperReader(object):
  __slots__ = ('fs_path', 'real_metric_path')
  supported = bool(whisper)

  def __init__(self, fs_path, real_metric_path):
    self.fs_path = fs_path
    self.real_metric_path = real_metric_path

  def get_intervals(self):
    start = time.time() - whisper.info(self.fs_path)['maxRetention']
    end = max( os.stat(self.fs_path).st_mtime, start )
    return IntervalSet( [Interval(start, end)] )

  def fetch(self, startTime, endTime):
    data = whisper.fetch(self.fs_path, startTime, endTime)
    if not data:
      return None

    time_info, values = data
    (start,end,step) = time_info

    # Merge in data from carbon's cache
    try:
      cached_datapoints = CarbonLink.query(self.real_metric_path)
    except:
      log.exception("Failed CarbonLink query '%s'" % self.real_metric_path)
      cached_datapoints = []

    for (timestamp, value) in cached_datapoints:
      interval = timestamp - (timestamp % step)

      try:
        i = int(interval - start) / step
        values[i] = value
      except:
        pass

    return (time_info, values)


class GzippedWhisperReader(WhisperReader):
  supported = bool(whisper and gzip)

  def get_intervals(self):
    fh = gzip.GzipFile(self.fs_path, 'rb')
    try:
      info = whisper.__readHeader(fh) # evil, but necessary.
    finally:
      fh.close()

    start = time.time() - info['maxRetention']
    end = max( os.stat(self.fs_path).st_mtime, start )
    return IntervalSet( [Interval(start, end)] )

  def fetch(self, startTime, endTime):
    fh = gzip.GzipFile(self.fs_path, 'rb')
    try:
      return whisper.file_fetch(fh, startTime, endTime)
    finally:
      fh.close()

