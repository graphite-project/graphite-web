from django.http import HttpResponseBadRequest
from graphite.logger import log


class NormalizeEmptyResultError(Exception):
    # throw error for normalize() when empty
    pass


class InputParameterError(ValueError):

    def __init__(self, *args, **kwargs):
        super(InputParameterError, self).__init__(*args, **kwargs)
        self.context = {}

    def setSourceIdHeaders(self, sourceIdHeaders):
        if 'sourceIdHeaders' not in self.context:
            self.context['sourceIdHeaders'] = {}

        self.context['sourceIdHeaders'].update(sourceIdHeaders)

    def setTarget(self, rawTarget):
        self.context['target'] = rawTarget

    def setFunction(self, function, args, kwargs):
        self.context['function'] = function
        self.context['args'] = args
        self.context['kwargs'] = kwargs

    def describe(self):
        target = self.context.get('target', None)
        source = ''
        sourceIdHeaders = self.context.get('sourceIdHeaders', None)

        # generate string describing query source
        if sourceIdHeaders:
            headers = list(sourceIdHeaders.keys())
            headers.sort()
            for name in headers:
                if source:
                    source += ', '
                source += '{name}: {value}'.format(
                    name=name,
                    value=sourceIdHeaders[name])

        func = self.context.get('function', None)

        kwargs = self.context.get('kwargs', {})
        kwargKeys = list(kwargs.keys())

        # keep kwargs sorted in message, for consistency and testability
        kwargKeys.sort()

        # generate string of args and kwargs
        args = ', '.join(
            argList
            for argList in [
                ', '.join(repr(arg) for arg in self.context.get('args', [])),
                ', '.join('{k}={v}'.format(k=str(k), v=repr(kwargs[k])) for k in kwargKeys),
            ] if argList
        )

        msg = 'Invalid parameters ({msg})'.format(msg=str(self))
        if target:
            msg += '; target: "{target}"'.format(target=target)

        if source:
            msg += '; source: "{source}"'.format(source=source)

        # needs to be last because the string "args" may potentially be thousands
        # of chars long after expanding the globbing patterns
        if func:
            msg += '; func: "{func}({args})"'.format(func=func, args=args)

        return msg


# decorator which turns InputParameterExceptions into Django's HttpResponseBadRequest
def handleInputParameterError(f):
    def new_f(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except InputParameterError as e:
            msg = e.describe()
            log.warning(msg)
            return HttpResponseBadRequest(msg)

    return new_f
