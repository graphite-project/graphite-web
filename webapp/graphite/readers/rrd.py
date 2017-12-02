import sys
import os
import time
import six

# Use the built-in version of scandir/stat if possible, otherwise
# use the scandir module version
try:
    from os import scandir, stat  # noqa # pylint: disable=unused-import
except ImportError:
    from scandir import scandir, stat  # noqa # pylint: disable=unused-import

try:
    import rrdtool
except ImportError:
    rrdtool = False

from django.conf import settings
from graphite.intervals import Interval, IntervalSet
from graphite.readers.utils import BaseReader


class RRDReader(BaseReader):
    supported = bool(rrdtool)

    @staticmethod
    def _convert_fs_path(fs_path):
        if isinstance(fs_path, six.text_type):
            fs_path = fs_path.encode(sys.getfilesystemencoding())
        return os.path.realpath(fs_path)

    def __init__(self, fs_path, datasource_name):
        self.fs_path = RRDReader._convert_fs_path(fs_path)
        self.datasource_name = datasource_name

    def get_intervals(self):
        start = time.time() - self.get_retention(self.fs_path)
        end = max(stat(self.fs_path).st_mtime, start)
        return IntervalSet([Interval(start, end)])

    def fetch(self, startTime, endTime):
        startString = time.strftime(
            "%H:%M_%Y%m%d+%Ss", time.localtime(startTime))
        endString = time.strftime("%H:%M_%Y%m%d+%Ss", time.localtime(endTime))

        if settings.FLUSHRRDCACHED:
            rrdtool.flushcached(self.fs_path, '--daemon',
                                settings.FLUSHRRDCACHED)

        (timeInfo, columns, rows) = rrdtool.fetch(
            self.fs_path,
            settings.RRD_CF, '-s' + startString, '-e' + endString)
        colIndex = list(columns).index(self.datasource_name)
        rows.pop()  # chop off the latest value because RRD returns crazy last values sometimes
        values = (row[colIndex] for row in rows)

        return (timeInfo, values)

    @staticmethod
    def get_datasources(fs_path):
        info = rrdtool.info(RRDReader._convert_fs_path(fs_path))

        if 'ds' in info:
            return [datasource_name for datasource_name in info['ds']]
        else:
            ds_keys = [key for key in info if key.startswith('ds[')]
            datasources = set(key[3:].split(']')[0] for key in ds_keys)
            return list(datasources)

    @staticmethod
    def get_retention(fs_path):
        info = rrdtool.info(RRDReader._convert_fs_path(fs_path))
        if 'rra' in info:
            rras = info['rra']
        else:
            # Ugh, I like the old python-rrdtool api better..
            rra_count = max([int(key[4])
                             for key in info if key.startswith('rra[')]) + 1
            rras = [{}] * rra_count
            for i in range(rra_count):
                rras[i]['pdp_per_row'] = info['rra[%d].pdp_per_row' % i]
                rras[i]['rows'] = info['rra[%d].rows' % i]

        retention_points = 0
        for rra in rras:
            points = rra['pdp_per_row'] * rra['rows']
            if points > retention_points:
                retention_points = points

        return retention_points * info['step']
