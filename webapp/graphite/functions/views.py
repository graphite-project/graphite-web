from graphite.util import jsonResponse, HttpResponse, HttpError
from graphite.functions import SeriesFunctions, SeriesFunction, PieFunctions, PieFunction, functionInfo

@jsonResponse
def functionList(request, queryParams):
  if request.method != 'GET':
    return HttpResponse(status=405)

  if queryParams.get('type') == 'pie':
    funcs = PieFunctions()
  else:
    funcs = SeriesFunctions()

  result = {}

  for (name, func) in funcs.items():
    result[name] = functionInfo(name, func)

  return result

@jsonResponse
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
