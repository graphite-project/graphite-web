from functools import wraps

from graphite.compat import HttpResponse
from graphite.util import json
from graphite.storage import STORE, extractForwardHeaders

def jsonResponse(f):
  @wraps(f)
  def wrapped_f(request, *args, **kwargs):
    if request.method == 'GET':
      queryParams = request.GET.copy()
    elif request.method == 'POST':
      queryParams = request.GET.copy()
      queryParams.update(request.POST)
    else:
      queryParams = {}

    try:
      return _jsonResponse(f(request, queryParams, *args, **kwargs), queryParams)
    except ValueError as err:
      return _jsonError(err.message, queryParams, getattr(err, 'status', 400))
    except Exception as err:
      return _jsonError(err.message, queryParams, getattr(err, 'status', 500))

  return wrapped_f

class HttpError(Exception):
  def __init__(self, message, status=500):
    super(HttpError, self).__init__(message)
    self.status=status

def _jsonResponse(data, queryParams, status=200):
  if isinstance(data, HttpResponse):
    return data

  if not queryParams:
    queryParams = {}

  return HttpResponse(
    json.dumps(
      data,
      indent=(2 if queryParams.get('pretty') else None),
      sort_keys=bool(queryParams.get('pretty'))
    ) if data is not None else 'null',
    content_type='application/json',
    status=status
  )

def _jsonError(message, queryParams, status=500):
  return _jsonResponse({'error': message}, queryParams, status=status)

def _requestContext(request):
  return {
    'forwardHeaders': extractForwardHeaders(request),
  }

@jsonResponse
def tagSeries(request, queryParams):
  if request.method != 'POST':
    return HttpResponse(status=405)

  path = queryParams.get('path')
  if not path:
    raise HttpError('no path specified', status=400)

  return STORE.tagdb.tag_series(path, requestContext=_requestContext(request))

@jsonResponse
def tagMultiSeries(request, queryParams):
  if request.method != 'POST':
    return HttpResponse(status=405)

  paths = []
  # Normal format: ?path=name;tag1=value1;tag2=value2&path=name;tag1=value2;tag2=value2
  if len(queryParams.getlist('path')) > 0:
    paths = queryParams.getlist('path')
  # Rails/PHP/jQuery common practice format: ?path[]=...&path[]=...
  elif len(queryParams.getlist('path[]')) > 0:
    paths = queryParams.getlist('path[]')
  else:
    raise HttpError('no paths specified',status=400)

  return STORE.tagdb.tag_multi_series(paths, requestContext=_requestContext(request))

@jsonResponse
def delSeries(request, queryParams):
  if request.method != 'POST':
    return HttpResponse(status=405)

  paths = []
  # Normal format: ?path=name;tag1=value1;tag2=value2&path=name;tag1=value2;tag2=value2
  if len(queryParams.getlist('path')) > 0:
    paths = queryParams.getlist('path')
  # Rails/PHP/jQuery common practice format: ?path[]=...&path[]=...
  elif len(queryParams.getlist('path[]')) > 0:
    paths = queryParams.getlist('path[]')
  else:
    raise HttpError('no path specified', status=400)

  return STORE.tagdb.del_multi_series(paths, requestContext=_requestContext(request))

@jsonResponse
def findSeries(request, queryParams):
  if request.method not in ['GET', 'POST']:
    return HttpResponse(status=405)

  exprs = []
  # Normal format: ?expr=tag1=value1&expr=tag2=value2
  if len(queryParams.getlist('expr')) > 0:
    exprs = queryParams.getlist('expr')
  # Rails/PHP/jQuery common practice format: ?expr[]=tag1=value1&expr[]=tag2=value2
  elif len(queryParams.getlist('expr[]')) > 0:
    exprs = queryParams.getlist('expr[]')

  if not exprs:
    raise HttpError('no tag expressions specified', status=400)

  return STORE.tagdb.find_series(exprs, requestContext=_requestContext(request))

@jsonResponse
def tagList(request, queryParams):
  if request.method != 'GET':
    return HttpResponse(status=405)

  return STORE.tagdb.list_tags(
    tagFilter=request.GET.get('filter'),
    limit=request.GET.get('limit'),
    requestContext=_requestContext(request),
  )

@jsonResponse
def tagDetails(request, queryParams, tag):
  if request.method != 'GET':
    return HttpResponse(status=405)

  return STORE.tagdb.get_tag(
    tag,
    valueFilter=queryParams.get('filter'),
    limit=queryParams.get('limit'),
    requestContext=_requestContext(request),
  )

@jsonResponse
def autoCompleteTags(request, queryParams):
  if request.method not in ['GET', 'POST']:
    return HttpResponse(status=405)

  exprs = []
  # Normal format: ?expr=tag1=value1&expr=tag2=value2
  if len(queryParams.getlist('expr')) > 0:
    exprs = queryParams.getlist('expr')
  # Rails/PHP/jQuery common practice format: ?expr[]=tag1=value1&expr[]=tag2=value2
  elif len(queryParams.getlist('expr[]')) > 0:
    exprs = queryParams.getlist('expr[]')

  return STORE.tagdb.auto_complete_tags(
    exprs,
    tagPrefix=queryParams.get('tagPrefix'),
    limit=queryParams.get('limit'),
    requestContext=_requestContext(request)
  )

@jsonResponse
def autoCompleteValues(request, queryParams):
  if request.method not in ['GET', 'POST']:
    return HttpResponse(status=405)

  exprs = []
  # Normal format: ?expr=tag1=value1&expr=tag2=value2
  if len(queryParams.getlist('expr')) > 0:
    exprs = queryParams.getlist('expr')
  # Rails/PHP/jQuery common practice format: ?expr[]=tag1=value1&expr[]=tag2=value2
  elif len(queryParams.getlist('expr[]')) > 0:
    exprs = queryParams.getlist('expr[]')

  tag = queryParams.get('tag')
  if not tag:
    raise HttpError('no tag specified', status=400)

  return STORE.tagdb.auto_complete_values(
    exprs,
    tag,
    valuePrefix=queryParams.get('valuePrefix'),
    limit=queryParams.get('limit'),
    requestContext=_requestContext(request)
  )
