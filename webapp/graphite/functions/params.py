import six

from graphite.errors import InputParameterError
from graphite.render.attime import parseTimeOffset
from graphite.logger import log
from graphite.functions.aggfuncs import aggFuncs, aggFuncAliases


class ParamTypes(object):
  pass


class ParamType(object):

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
ParamType.register('node', validateInteger)
ParamType.register('nodeOrTag')
ParamType.register('series')
ParamType.register('seriesList', validateSeriesList)
ParamType.register('seriesLists', validateSeriesList)
ParamType.register('string')
ParamType.register('tag')


class ParamTypeAggFunc(ParamType):

  def __init__(self, name):
    super(ParamTypeAggFunc, self).__init__(name=name, validator=self.validateAggFuncs)

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


class Param(object):
  __slots__ = ('name', 'type', 'required', 'default', 'multiple', 'options', 'suggestions')

  def __init__(self, name, paramtype, required=False, default=None, multiple=False, options=None,
               suggestions=None):
    self.name = name
    if not isinstance(paramtype, ParamType):
      raise Exception('Invalid type %s for parameter %s' % (paramtype, name))
    self.type = paramtype
    self.required = bool(required)
    self.default = default
    self.multiple = bool(multiple)
    self.options = options
    self.suggestions = suggestions

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

  def validateValue(self, value):
    if value is None and self.default is not None:
      value = self.default

    # None is ok for optional params
    if not self.required and value is None:
      return True

    return self.type.isValid(value)


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

    # parameter is restricted to a defined set of values, but value is not in it
    if params[i].options and value not in params[i].options:
      raise InputParameterError(
        'Invalid option "{value}" specified for function "{func}" parameter "{param}"'.format(
          value=value, param=params[i].name, func=func))

    if not params[i].validateValue(value):
      raise InputParameterError(
        'Invalid {type} value specified for function "{func}" parameter "{param}": {value}'.format(
          type=params[i].type.name, func=func, param=params[i].name, value=value))

    valid_args.append(params[i].name)

  return True
