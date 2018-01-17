from __future__ import absolute_import
import time

# Use the built-in version of scandir/stat if possible, otherwise
# use the scandir module version
try:
    from os import scandir, stat  # noqa # pylint: disable=unused-import
except ImportError:
    from scandir import scandir, stat  # noqa # pylint: disable=unused-import

try:
    import whisper
except ImportError:
    whisper = False

try:
    import gzip
except ImportError:
    gzip = False


from graphite.intervals import Interval, IntervalSet
from graphite.logger import log
from graphite.readers.utils import merge_with_carbonlink, BaseReader

# The parser was replacing __readHeader with the <class>__readHeader
# which was not working.
if bool(whisper):
    whisper__readHeader = whisper.__readHeader


class WhisperReader(BaseReader):
    __slots__ = ('fs_path', 'real_metric_path')
    supported = bool(whisper)
    meta_info = None

    def __init__(self, fs_path, real_metric_path):
        self.fs_path = fs_path
        self.real_metric_path = real_metric_path

    def info(self):
        if not self.meta_info:
            self.meta_info = whisper.info(self.fs_path)
        return self.meta_info

    def get_raw_step(self):
        return self.info()['archives'][0]['secondsPerPoint']

    def get_intervals(self):
        start = time.time() - self.info()['maxRetention']
        end = max(stat(self.fs_path).st_mtime, start)
        return IntervalSet([Interval(start, end)])

    def fetch_data(self, startTime, endTime, now=None):
        return whisper.fetch(self.fs_path, startTime, endTime, now=now)

    def fetch(self, startTime, endTime, now=None, requestContext=None):
        try:
            data = self.fetch_data(startTime, endTime, now=now)
        except IOError:
            log.exception("Failed fetch of whisper file '%s'" % self.fs_path)
            return None
        if not data:
            return None

        time_info, values = data
        (start, end, step) = time_info

        meta_info = self.info()
        aggregation_method = meta_info['aggregationMethod']

        # Merge in data from carbon's cache
        values = merge_with_carbonlink(
            self.real_metric_path, start, step, values, aggregation_method, self.get_raw_step())

        return time_info, values


class GzippedWhisperReader(WhisperReader):
    supported = bool(whisper and gzip)

    def info(self):
        if not self.meta_info:
            fh = gzip.GzipFile(self.fs_path, 'rb')
            try:
                self.meta_info = whisper__readHeader(fh)  # evil, but necessary.
            finally:
                fh.close()
        return self.meta_info

    def fetch_data(self, startTime, endTime, now=None):
        fh = gzip.GzipFile(self.fs_path, 'rb')
        try:
            return whisper.file_fetch(fh, startTime, endTime, now=now)
        finally:
            fh.close()
