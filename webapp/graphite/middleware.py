from graphite.logger import log

class LogExceptionsMiddleware(object):
    def process_exception(self, request, exception):
        log.exception('Exception encountered in <{0} {1}>'.format(request.method, request.build_absolute_uri()))
        return None
