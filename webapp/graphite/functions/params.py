import six

from graphite.errors import InputParameterError
from graphite.render.attime import parseTimeOffset


class ParamTypes(object):
  pass


for paramType in [
  'aggFunc',
  'boolean',
  'date',
  'float',
  'integer',
  'interval',
  'intOrInterval',
  'node',
  'nodeOrTag',
  'series',
  'seriesList',
  'seriesLists',
  'string',
  'tag',
]:
  setattr(ParamTypes, paramType, paramType)


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


typeValidators = {
  'boolean': validateBoolean,
  'float': validateFloat,
  'integer': validateInteger,
  'interval': validateInterval,
  'node': validateInteger,
  'seriesList': validateSeriesList,
  'seriesLists': validateSeriesList,
}


class Param(object):
  __slots__ = ('name', 'type', 'required', 'default', 'multiple', 'options', 'suggestions')

  def __init__(self, name, paramtype, required=False, default=None, multiple=False, options=None,
               suggestions=None):
    self.name = name
    if not hasattr(ParamTypes, paramtype):
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
      'type': self.type,
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
    # None is ok for optional params
    if not self.required and value is None:
      return True

    validator = typeValidators.get(self.type, None)
    # if there's no validator for the type we assume True
    if validator is None:
      return True

    return validator(value)


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
        'Invalid option specified for function "{func}" parameter "{param}"'.format(
          param=params[i].name, func=func))

    if not params[i].validateValue(value):
      raise InputParameterError(
        'Invalid {type} value specified for function "{func}" parameter "{param}"'.format(
          type=params[i].type, param=params[i].name, func=func))

    valid_args.append(params[i].name)

  return True
