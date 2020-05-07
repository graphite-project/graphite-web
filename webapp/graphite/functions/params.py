import six

from graphite.errors import InputParameterError
from graphite.render.attime import parseTimeOffset
from graphite.logger import log
from graphite.functions.aggfuncs import aggFuncs, aggFuncAliases
from graphite.render.datalib import TimeSeries


class ParamTypes(object):
    pass


class ParamType(object):
    options = []

    def __init__(self, name, validator=None):
        self.name = name
        self.validator = validator

    @classmethod
    def register(cls, name, *args):
        setattr(ParamTypes, name, cls(name, *args))

    def isValid(self, value):
        if self.validator is None:
            # if there's no validator for the type we assume True
            return value

        return self.validator(value)


def validateBoolean(value):
    if isinstance(value, six.string_types):
        if value.lower() == 'true':
            return True
        if value.lower() == 'false':
            return False
        raise ValueError('Invalid boolean value: {value}'.format(value=repr(value)))

    if type(value) in [int, float]:
        if value == 0:
            return False
        if value == 1:
            return True
        raise ValueError('Invalid boolean value: {value}'.format(value=repr(value)))

    return bool(value)


def validateFloat(value):
    return float(value)


def validateInteger(value):
    # prevent that float values get converted to int, because an
    # error is better than silently falsifying the result
    if type(value) is float:
        raise ValueError('Not a valid integer value: {value}'.format(value=repr(value)))

    return int(value)


def validateIntOrInf(value):
    try:
        return validateInteger(value)
    except (TypeError, ValueError):
        pass

    try:
        inf = float('inf')
        if float(value) == inf:
            return inf
    except (TypeError, ValueError, OverflowError):
        pass

    raise ValueError('Not a valid integer nor float value: {value}'.format(value=repr(value)))


def validateInterval(value):
    try:
        parseTimeOffset(value)
    except (IndexError, KeyError, TypeError, ValueError) as e:
        raise ValueError('Invalid interval value: {value}: {e}'.format(value=repr(value), e=str(e)))
    return value


def validateSeriesList(value):
    if not isinstance(value, list):
        raise ValueError('Invalid value type, it is not a list: {value}'.format(value=repr(value)))

    for series in value:
        if not isinstance(series, TimeSeries):
            raise ValueError('Invalid type "{type}", should be TimeSeries'.format(type=type(series)))

    return value


def validateSeriesLists(value):
    if not isinstance(value, list):
        raise ValueError('Invalid value type, it is not a list: {value}'.format(value=repr(value)))

    for entry in value:
        validateSeriesList(entry)

    return value


ParamType.register('boolean', validateBoolean)
ParamType.register('date')
ParamType.register('float', validateFloat)
ParamType.register('integer', validateInteger)
ParamType.register('interval', validateInterval)
ParamType.register('intOrInterval')
ParamType.register('intOrInf', validateIntOrInf)
ParamType.register('node', validateInteger)
ParamType.register('nodeOrTag')
ParamType.register('series')
ParamType.register('seriesList', validateSeriesList)
ParamType.register('seriesLists', validateSeriesLists)
ParamType.register('string')
ParamType.register('tag')

# special type that accepts everything
ParamType.register('any')


class ParamTypeAggFunc(ParamType):

    def __init__(self, name, validator=None):
        if validator is None:
            validator = self.validateAggFuncs

        super(ParamTypeAggFunc, self).__init__(name=name, validator=validator)
        self.options = self.getValidAggFuncs()

    @classmethod
    def getValidAggFuncs(cls):
        return list(aggFuncs.keys()) + list(aggFuncAliases.keys())

    @classmethod
    def getDeprecatedAggFuncs(cls):
        return [name + 'Series' for name in cls.getValidAggFuncs()]

    @classmethod
    def getAllValidAggFuncs(cls):
        return cls.getValidAggFuncs() + cls.getDeprecatedAggFuncs()

    def validateAggFuncs(self, value):
        if value in self.getValidAggFuncs():
            return value

        if value in self.getDeprecatedAggFuncs():
            log.warning('Deprecated aggregation function: {value}'.format(value=repr(value)))
            return value

        raise ValueError('Invalid aggregation function: {value}'.format(value=repr(value)))


ParamTypeAggFunc.register('aggFunc')


class ParamTypeAggOrSeriesFunc(ParamTypeAggFunc):
    options = []

    def __init__(self, name, validator=None):
        if validator is None:
            validator = self.validateAggOrSeriesFuncs
        super(ParamTypeAggOrSeriesFunc, self).__init__(name=name, validator=validator)

    def setSeriesFuncs(self, funcs):
        # check for each of the series functions whether they have an 'aggregator'
        # property being set to 'True'. If so we consider them valid aggregators.
        for name, func in funcs.items():
            if getattr(func, 'aggregator', False) is not True:
                continue

            self.options.append(name)

    def validateAggOrSeriesFuncs(self, value):
        try:
            return self.validateAggFuncs(value)
        except ValueError:
            pass

        if value in self.options:
            return value

        return False


ParamTypeAggOrSeriesFunc.register('aggOrSeriesFunc')


class Param(object):
    __slots__ = ('name', 'type', 'required', 'default', 'multiple', '_options', 'suggestions')

    def __init__(self, name, paramtype, required=False, default=None, multiple=False, options=None, suggestions=None):
        self.name = name
        if not isinstance(paramtype, ParamType):
            raise Exception('Invalid type %s for parameter %s' % (paramtype, name))
        self.type = paramtype
        self.required = bool(required)
        self.default = default
        self.multiple = bool(multiple)
        if options is None:
            options = []
        self._options = options
        self.suggestions = suggestions

    @property
    def options(self):
        options = list(set(getattr(self, '_options', []) + getattr(self.type, 'options', [])))
        options.sort(key=str)
        return options

    def toJSON(self):
        jsonVal = {
            'name': self.name,
            'type': self.type.name,
        }
        if self.required:
            jsonVal['required'] = True
        if self.default is not None:
            jsonVal['default'] = self.default
        if self.multiple:
            jsonVal['multiple'] = True
        if self.options:
            jsonVal['options'] = self.options
        if self.suggestions:
            jsonVal['suggestions'] = self.suggestions
        return jsonVal

    def validateValue(self, value, func):
        # if value isn't specified and there's a default then the default will be used,
        # we don't need to validate the default value because we trust that it is valid
        if value is None and self.default is not None:
            return value

        # None is ok for optional params
        if not self.required and value is None:
            return value

        # parameter is restricted to a defined set of values, but value is not in it
        if self.options and value not in self.options:
            raise InputParameterError(
                'Invalid option specified for function "{func}" parameter "{param}": {value}'.format(
                    func=func, param=self.name, value=repr(value)))

        try:
            return self.type.isValid(value)
        except Exception:
            raise InputParameterError(
                'Invalid "{type}" value specified for function "{func}" parameter "{param}": {value}'.format(
                    type=self.type.name, func=func, param=self.name, value=repr(value)))


def validateParams(func, params, args, kwargs):
    valid_args = []
    valid_kwargs = {}

    # total number of args + kwargs might be larger than number of params if
    # the last param allows to be specified multiple times
    if len(args) + len(kwargs) > len(params):
        if not params[-1].multiple:
            raise InputParameterError(
                'Too many parameters specified for function "{func}"'.format(func=func))

        # if args has more values than params and the last param allows multiple values,
        # then we're going to validate all paramas from the args value list
        args_params = params
        kwargs_params = []
    else:
        # take the first len(args) params and use them to validate the args values,
        # use the remaining params to validate the kwargs values
        args_params = params[:len(args)]
        kwargs_params = params[len(args):]

    # validate the args
    for (i, arg) in enumerate(args):
        if i >= len(args_params):
            # last parameter must be allowing multiple,
            # so we're using it to validate this arg
            param = args_params[-1]
        else:
            param = args_params[i]

        valid_args.append(param.validateValue(arg, func))

    # validate the kwargs
    for param in kwargs_params:
        value = kwargs.get(param.name, None)
        if value is None:
            if param.required:
                raise InputParameterError(
                    'Missing required parameter "{param}" for function "{func}"'
                    .format(param=param.name, func=func))
            continue

        valid_kwargs[param.name] = param.validateValue(value, func)

    if len(kwargs) > len(valid_kwargs):
        unexpected_keys = []
        for name in kwargs.keys():
            if name not in valid_kwargs:
                unexpected_keys.append(name)
        raise InputParameterError(
            'Unexpected key word arguments: {keys}'.format(
                keys=', '.join(
                    key
                    for key in kwargs.keys()
                    if key not in valid_kwargs.keys()
                )))

    return (valid_args, valid_kwargs)
