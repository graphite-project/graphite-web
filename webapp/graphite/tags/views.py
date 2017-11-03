from graphite.compat import HttpResponse
from graphite.util import json
from graphite.storage import STORE

def tagSeries(request):
  if request.method != 'POST':
    return HttpResponse(status=405)

  path = request.POST.get('path')
  if not path:
    return HttpResponse(
      json.dumps({'error': 'no path specified'}),
      content_type='application/json',
      status=400
    )

  return HttpResponse(
    json.dumps(STORE.tagdb.tag_series(path)) if STORE.tagdb else 'null',
    content_type='application/json'
  )

def delSeries(request):
  if request.method != 'POST':
    return HttpResponse(status=405)

  path = request.POST.get('path')
  if not path:
    return HttpResponse(
      json.dumps({'error': 'no path specified'}),
      content_type='application/json',
      status=400
    )

  return HttpResponse(
    json.dumps(STORE.tagdb.del_series(path)) if STORE.tagdb else 'null',
    content_type='application/json'
  )

def findSeries(request):
  if request.method not in ['GET', 'POST']:
    return HttpResponse(status=405)

  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  exprs = []
  # Normal format: ?expr=tag1=value1&expr=tag2=value2
  if len(queryParams.getlist('expr')) > 0:
    exprs = queryParams.getlist('expr')
  # Rails/PHP/jQuery common practice format: ?expr[]=tag1=value1&expr[]=tag2=value2
  elif len(queryParams.getlist('expr[]')) > 0:
    exprs = queryParams.getlist('expr[]')

  if not exprs:
    return HttpResponse(
      json.dumps({'error': 'no tag expressions specified'}),
      content_type='application/json',
      status=400
    )

  return HttpResponse(
    json.dumps(STORE.tagdb.find_series(exprs) if STORE.tagdb else [],
               indent=(2 if queryParams.get('pretty') else None),
               sort_keys=bool(queryParams.get('pretty'))),
    content_type='application/json'
  )

def tagList(request):
  if request.method != 'GET':
    return HttpResponse(status=405)

  return HttpResponse(
    json.dumps(STORE.tagdb.list_tags(tagFilter=request.GET.get('filter')) if STORE.tagdb else [],
               indent=(2 if request.GET.get('pretty') else None),
               sort_keys=bool(request.GET.get('pretty'))),
    content_type='application/json'
  )

def tagDetails(request, tag):
  if request.method != 'GET':
    return HttpResponse(status=405)

  return HttpResponse(
    json.dumps(STORE.tagdb.get_tag(tag, valueFilter=request.GET.get('filter')) if STORE.tagdb else None,
               indent=(2 if request.GET.get('pretty') else None),
               sort_keys=bool(request.GET.get('pretty'))),
    content_type='application/json'
  )

def autoCompleteTags(request):
  if request.method not in ['GET', 'POST']:
    return HttpResponse(status=405)

  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  exprs = []
  # Normal format: ?expr=tag1=value1&expr=tag2=value2
  if len(queryParams.getlist('expr')) > 0:
    exprs = queryParams.getlist('expr')
  # Rails/PHP/jQuery common practice format: ?expr[]=tag1=value1&expr[]=tag2=value2
  elif len(queryParams.getlist('expr[]')) > 0:
    exprs = queryParams.getlist('expr[]')

  tagPrefix = queryParams.get('tagPrefix')

  result = STORE.tagdb.auto_complete_tags(exprs, tagPrefix, limit=queryParams.get('limit'))

  return HttpResponse(
    json.dumps(result,
               indent=(2 if queryParams.get('pretty') else None),
               sort_keys=bool(queryParams.get('pretty'))),
    content_type='application/json'
  )

def autoCompleteValues(request):
  if request.method not in ['GET', 'POST']:
    return HttpResponse(status=405)

  queryParams = request.GET.copy()
  queryParams.update(request.POST)

  exprs = []
  # Normal format: ?expr=tag1=value1&expr=tag2=value2
  if len(queryParams.getlist('expr')) > 0:
    exprs = queryParams.getlist('expr')
  # Rails/PHP/jQuery common practice format: ?expr[]=tag1=value1&expr[]=tag2=value2
  elif len(queryParams.getlist('expr[]')) > 0:
    exprs = queryParams.getlist('expr[]')

  tag = queryParams.get('tag')
  if not tag:
    return HttpResponse(
      json.dumps({'error': 'no tag specified'}),
      content_type='application/json',
      status=400
    )

  valuePrefix = queryParams.get('valuePrefix')

  result = STORE.tagdb.auto_complete_values(exprs, tag, valuePrefix, limit=queryParams.get('limit'))

  return HttpResponse(
    json.dumps(result,
               indent=(2 if queryParams.get('pretty') else None),
               sort_keys=bool(queryParams.get('pretty'))),
    content_type='application/json'
  )
