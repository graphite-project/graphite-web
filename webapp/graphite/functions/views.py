from graphite.util import jsonResponse, HttpResponse, HttpError
from graphite.functions import SeriesFunctions, SeriesFunction, PieFunctions, PieFunction, functionInfo

def jsonEncoder(obj):
  if hasattr(obj, 'toJSON'):
    return obj.toJSON()
  return obj.__dict__

@jsonResponse(default=jsonEncoder)
def functionList(request, queryParams):
  if request.method != 'GET':
    return HttpResponse(status=405)

  if queryParams.get('type') == 'pie':
    funcs = PieFunctions()
  else:
    funcs = SeriesFunctions()

  grouped = queryParams.get('grouped', '').lower() in ['1', 'true']
  group = queryParams.get('group')
  result = {}

  for (name, func) in funcs.items():
    info = functionInfo(name, func)
    if group is not None and group != info['group']:
      continue

    if grouped:
      if info['group'] not in result:
        result[info['group']] = {}
      result[info['group']][name] = info
    else:
      result[name] = info

  return result

@jsonResponse(default=jsonEncoder)
def functionDetails(request, queryParams, name):
  if request.method != 'GET':
    return HttpResponse(status=405)

  try:
    if queryParams.get('type') == 'pie':
      func = PieFunction(name)
    else:
      func = SeriesFunction(name)
  except KeyError:
    raise HttpError('Function not found: %s' % name, status=404)

  return functionInfo(name, func)
