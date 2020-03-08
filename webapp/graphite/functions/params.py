import six

from graphite.errors import InputParameterError
from graphite.render.attime import parseTimeOffset
from graphite.logger import log
from graphite.functions.aggfuncs import aggFuncs, aggFuncAliases


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
      return True

    return self.validator(value)


def validateBoolean(value):
  return isinstance(value, bool)


def validateFloat(value):
  return isinstance(value, float) or validateInteger(value)


def validateInteger(value):
  return isinstance(value, six.integer_types)


def validateIntOrInf(value):
  return validateInteger(value) or value == float('inf')


def validateInterval(value):
  try:
    parseTimeOffset(value)
  except Exception:
    return False
  return True


def validateSeriesList(value):
  return isinstance(value, list)


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
ParamType.register('seriesLists', validateSeriesList)
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
      return True

    if value in self.getDeprecatedAggFuncs():
      log.warning('Deprecated aggregation function "{value}" used'.format(value=value))
      return True

    return False


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
    if self.validateAggFuncs(value):
      return True

    if value in self.options:
      return True

    return False


ParamTypeAggOrSeriesFunc.register('aggOrSeriesFunc')


class Param(object):
  __slots__ = ('name', 'type', 'required', 'default', 'multiple', '_options', 'suggestions')

  def __init__(self, name, paramtype, required=False, default=None, multiple=False, options=[],
               suggestions=None):
    self.name = name
    if not isinstance(paramtype, ParamType):
      raise Exception('Invalid type %s for parameter %s' % (paramtype, name))
    self.type = paramtype
    self.required = bool(required)
    self.default = default
    self.multiple = bool(multiple)
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
      return True

    # None is ok for optional params
    if not self.required and value is None:
      return True

    # parameter is restricted to a defined set of values, but value is not in it
    if self.options and value not in self.options:
      raise InputParameterError(
        'Invalid option specified for function "{func}" parameter "{param}": {value}'.format(
          func=func, param=self.name, value=repr(value)))

    if not self.type.isValid(value):
      raise InputParameterError(
        'Invalid "{type}" value specified for function "{func}" parameter "{param}": {value}'.format(
          type=self.type.name, func=func, param=self.name, value=repr(value)))

    return True


def validateParams(func, params, args, kwargs):
  valid_args = []

  if len(params) == 0 or params[len(params)-1].multiple is False:
    if len(args) + len(kwargs) > len(params):
      raise InputParameterError(
        'Too many parameters specified for function "{func}"'.format(func=func))

  for i in range(len(params)):
    if len(args) <= i:
      # requirement is satisfied from "kwargs"
      value = kwargs.get(params[i].name, None)
      if value is None:
        if params[i].required:
          # required parameter is missing
          raise InputParameterError(
            'Missing required parameter "{param}" for function "{func}"'.format(
              param=params[i].name, func=func))
        else:
          # got multiple values for keyword argument
          if params[i].name in valid_args:
            raise InputParameterError(
              'Keyword parameter "{param}" specified multiple times for function "{func}"'.format(
                param=params[i].name, func=func))
    else:
      # requirement is satisfied from "args"
      value = args[i]

    params[i].validateValue(value, func)
    valid_args.append(params[i].name)

  return True
