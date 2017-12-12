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
