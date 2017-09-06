from graphite.logger import log
try:
    from django.utils.deprecation import MiddlewareMixin
except ImportError:  # Django < 1.10
    MiddlewareMixin = object


class LogExceptionsMiddleware(MiddlewareMixin):
    def process_exception(self, request, exception):
        log.exception('Exception encountered in <{0} {1}>'.format(request.method, request.build_absolute_uri()))
        return None
