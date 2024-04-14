from graphite.logger import log
from django.utils.deprecation import MiddlewareMixin


class LogExceptionsMiddleware(MiddlewareMixin):
    def process_exception(self, request, exception):
        log.exception('Exception encountered in <{0} {1}>'.format(request.method, request.build_absolute_uri()))
        return None
