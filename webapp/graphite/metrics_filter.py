import re

from django.conf import settings
from graphite.metric_filter.models import UserMetricFilter
from graphite.metric_filter.models import GroupMetricFilter


def nodeFilter(user, nodePath):
    if settings.ALLOW_METRICFILTER_BY_USER:
        if user.id is not None:
            filters = UserMetricFilter.getFilters(user.id)
            if filters is not None:
                for filter in filters.all():
                    matching = match(nodePath, filter)
                    if matching is not None:
                        return matching
        for filters in GroupMetricFilter.getFiltersByUser(user):
            if filters is not None:
                for filter in filters.all():
                    if filter is not None:
                        matching = match(nodePath, filter)
                        if matching is not None:
                            return matching
        return False
    else:
        return True

def match(path, filter):
    #log.info('testing %s' % filter.filter)
    pattern = re.compile(filter.filter)
    if pattern.match(path):
        if filter.type_filter == 0:
            return True
        elif filter.type_filter == 1:
            return False
    else:
        return None
