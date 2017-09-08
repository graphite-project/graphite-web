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
      status=400
    )

  return HttpResponse(
    json.dumps(STORE.tagdb.del_series(path)) if STORE.tagdb else 'null',
    content_type='application/json'
  )

def tagList(request):
  if request.method != 'GET':
    return HttpResponse(status=405)

  return HttpResponse(
    json.dumps(STORE.tagdb.list_tags() if STORE.tagdb else []),
    content_type='application/json'
  )

def tagDetails(request, tag):
  if request.method != 'GET':
    return HttpResponse(status=405)

  return HttpResponse(
    json.dumps(STORE.tagdb.get_tag(tag) if STORE.tagdb else None),
    content_type='application/json'
  )
