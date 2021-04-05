from django.http import HttpResponseBadRequest
from graphite.logger import log


class NormalizeEmptyResultError(Exception):
    # throw error for normalize() when empty
    pass


class InputParameterError(ValueError):

    def __init__(self, *args, **kwargs):
        super(InputParameterError, self).__init__(*args, **kwargs)
        self.context = {}

    def setSourceIdHeaders(self, newHeaders):
        headers = self.context.get('sourceIdHeaders', {})
        headers.update(newHeaders)
        self.context['sourceIdHeaders'] = headers

    @property
    def sourceIdHeaders(self):
        sourceIdHeaders = self.context.get('sourceIdHeaders', {})
        headers = list(sourceIdHeaders.keys())
        headers.sort()
        source = ''

        for name in headers:
            if source:
                source += ', '
            source += '{name}: {value}'.format(
                name=name,
                value=sourceIdHeaders[name])

        return source

    def setTargets(self, targets):
        self.context['targets'] = targets

    @property
    def targets(self):
        return ', '.join(self.context.get('targets', []))

    def setFunction(self, name, args, kwargs):
        self.context['function'] = {
            'name': name,
            'args': args,
            'kwargs': kwargs,
        }

    @property
    def function(self):
        func = self.context.get('function', None)
        if not func:
            return ''

        funcName = func.get('name', '')
        if not funcName:
            return ''

        kwargs = func.get('kwargs', {})
        kwargKeys = list(kwargs.keys())

        # keep kwargs sorted in message, for consistency and testability
        kwargKeys.sort()

        # generate string of args and kwargs
        args = ', '.join(
            argList
            for argList in [
                ', '.join(repr(arg) for arg in func.get('args', [])),
                ', '.join('{k}={v}'.format(k=str(k), v=repr(kwargs[k])) for k in kwargKeys),
            ] if argList
        )

        return '{func}({args})'.format(func=funcName, args=args)

    def __str__(self):
        msg = 'Invalid parameters ({msg})'.format(msg=str(super(InputParameterError, self).__str__()))
        targets = self.targets
        if targets:
            msg += '; targets: "{targets}"'.format(targets=targets)

        source = self.sourceIdHeaders
        if source:
            msg += '; source: "{source}"'.format(source=source)

        # needs to be last because the string "args" may potentially be thousands
        # of chars long after expanding the globbing patterns
        func = self.function
        if func:
            msg += '; func: "{func}"'.format(func=func)

        return msg


# decorator which turns InputParameterExceptions into Django's HttpResponseBadRequest
def handleInputParameterError(f):
    def new_f(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except InputParameterError as e:
            msgStr = str(e)
            log.warning('%s', msgStr)
            return HttpResponseBadRequest(msgStr)

    return new_f
