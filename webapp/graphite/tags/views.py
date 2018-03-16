from graphite.util import jsonResponse, HttpResponse, HttpError
from graphite.storage import STORE, extractForwardHeaders

def _requestContext(request, queryParams):
  return {
    'forwardHeaders': extractForwardHeaders(request),
    'localOnly': queryParams.get('local') == '1',
  }

@jsonResponse
def tagSeries(request, queryParams):
  if request.method != 'POST':
    return HttpResponse(status=405)

  path = queryParams.get('path')
  if not path:
    raise HttpError('no path specified', status=400)

  return STORE.tagdb.tag_series(path, requestContext=_requestContext(request, queryParams))

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

  return STORE.tagdb.tag_multi_series(paths, requestContext=_requestContext(request, queryParams))

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

  return STORE.tagdb.del_multi_series(paths, requestContext=_requestContext(request, queryParams))

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

  return STORE.tagdb.find_series(exprs, requestContext=_requestContext(request, queryParams))

@jsonResponse
def tagList(request, queryParams):
  if request.method != 'GET':
    return HttpResponse(status=405)

  return STORE.tagdb.list_tags(
    tagFilter=request.GET.get('filter'),
    limit=request.GET.get('limit'),
    requestContext=_requestContext(request, queryParams),
  )

@jsonResponse
def tagDetails(request, queryParams, tag):
  if request.method != 'GET':
    return HttpResponse(status=405)

  return STORE.tagdb.get_tag(
    tag,
    valueFilter=queryParams.get('filter'),
    limit=queryParams.get('limit'),
    requestContext=_requestContext(request, queryParams),
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

  return STORE.tagdb_auto_complete_tags(
    exprs,
    tagPrefix=queryParams.get('tagPrefix'),
    limit=queryParams.get('limit'),
    requestContext=_requestContext(request, queryParams)
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

  return STORE.tagdb_auto_complete_values(
    exprs,
    tag,
    valuePrefix=queryParams.get('valuePrefix'),
    limit=queryParams.get('limit'),
    requestContext=_requestContext(request, queryParams)
  )
