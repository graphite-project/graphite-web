import inspect

from importlib import import_module
from os import listdir
from os.path import dirname, join, splitext

from django.conf import settings

from graphite.functions.params import Param, ParamTypes  # noqa
from graphite.logger import log

customDir = join(dirname(__file__), 'custom')
customModPrefix = 'graphite.functions.custom.'

_SeriesFunctions = {}
_PieFunctions = {}

def loadFunctions(force=False):
  if _SeriesFunctions and not force:
    return

  from graphite.render import functions

  _SeriesFunctions.clear()
  _SeriesFunctions.update(functions.SeriesFunctions)

  _PieFunctions.clear()
  _PieFunctions.update(functions.PieFunctions)

  custom_modules = []
  for filename in listdir(customDir):
    module_name, extension = splitext(filename)
    if extension != '.py' or module_name == '__init__':
      continue
    custom_modules.append(customModPrefix + module_name)

  for module_name in custom_modules + settings.FUNCTION_PLUGINS:
    try:
      module = import_module(module_name)
    except Exception as e:
      log.warning('Error loading function plugin %s: %s' % (module_name, e))
      continue

    for func_name, func in getattr(module, 'SeriesFunctions', {}).items():
      try:
        addFunction(_SeriesFunctions, func, func_name)
      except Exception as e:
        log.warning('Error loading function plugin %s: %s' % (module_name, e))

    for func_name, func in getattr(module, 'PieFunctions', {}).items():
      try:
        addFunction(_PieFunctions, func, func_name)
      except Exception as e:
        log.warning('Error loading function plugin %s: %s' % (module_name, e))

def addFunction(dest, func, func_name):
  if not hasattr(func, 'group'):
    func.group = 'Ungrouped'

  if not hasattr(func, 'params'):
    raise Exception('No params defined for %s' % func_name)

  for param in func.params:
    if not isinstance(param, Param):
      raise Exception('Invalid param specified for %s' % func_name)
    dest[func_name] = func

def SeriesFunctions():
  loadFunctions()
  return _SeriesFunctions

def SeriesFunction(name):
  loadFunctions()
  try:
    return _SeriesFunctions[name]
  except KeyError:
    raise KeyError('Function "%s" not found' % name)

def PieFunctions():
  loadFunctions()
  return _PieFunctions

def PieFunction(name):
  loadFunctions()
  try:
    return _PieFunctions[name]
  except KeyError:
    raise KeyError('Function "%s" not found' % name)

def functionInfo(name, func):
  argspec = inspect.getargspec(func)
  return {
    'name': name,
    'function': name + inspect.formatargspec(argspec[0][1:], argspec[1], argspec[2], argspec[3]),
    'description': inspect.getdoc(func),
    'module': inspect.getmodule(func).__name__,
    'group': getattr(func, 'group', 'Ungrouped'),
    'params': getattr(func, 'params', None),
  }
