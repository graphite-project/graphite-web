import pytz

from datetime import datetime

from graphite.compat import HttpResponse
from graphite.storage import extractForwardHeaders
from graphite.logger import log
from graphite.render.views import renderViewData
from graphite.tags.models import Series, Tag, TagValue, SeriesTag  # noqa # pylint: disable=unused-import

from django.conf import settings
from six.moves import zip

# import snappy and protobuf
try:
  import snappy
except ImportError:
  snappy = None

try:
  from graphite.prometheus.remote_pb2 import ReadRequest, ReadResponse
except ImportError:
  ReadRequest = None


def renderPrometheus(request):
  # import snappy and protobuf
  if snappy is None:
    raise Exception('snappy support is required, please pip install python-snappy')

  if ReadRequest is None:
    raise Exception('protobuf support is required, please pip install protobuf')

  # validate, uncompress & parse request
  if request.META.get('HTTP_CONTENT_ENCODING') != 'snappy':
    raise Exception('Expected snappy content encoding')

  if request.META.get('CONTENT_TYPE') != 'application/x-protobuf':
    raise Exception('Expected protobuf encoding')

  try:
    body = snappy.uncompress(request.body)
  except Exception as err:
    raise Exception('Error uncompressing request body: %s' % err)

  readReq = ReadRequest()

  try:
    readReq.ParseFromString(body)
  except Exception as err:
    raise Exception('Error parsing request body: %s' % err)

  log.debug(readReq)

  # build request context
  tzinfo = pytz.timezone(settings.TIME_ZONE)

  requestContext = {
    # NOTE: right now we only use the time range from the first query
    'startTime' : datetime.fromtimestamp(readReq.queries[0].start_timestamp_ms // 1000, tzinfo),
    'endTime' : datetime.fromtimestamp(readReq.queries[0].end_timestamp_ms // 1000, tzinfo),
    'now': datetime.now(tzinfo),
    'localOnly' : request.GET.get('local') == '1',
    'template' : {},
    'tzinfo' : tzinfo,
    'forwardHeaders': extractForwardHeaders(request),
    'data' : [],
    'prefetched' : {},
    'xFilesFactor' : float( request.GET.get('xFilesFactor', settings.DEFAULT_XFILES_FACTOR) ),
  }

  # translate query
  operators = [
    '=',
    '!=',
    '=~',
    '!=~',
  ]

  queries = []

  for query in readReq.queries:
    expressions = []
    for matcher in query.matchers:
      tag = matcher.name
      if tag == '__name__':
        tag = 'name'
      operator = operators[getattr(matcher, 'type', 0)]
      expressions.append('"' + (tag + operator + matcher.value).replace('"', '\\"') + '"')

    queries.append('seriesByTag(' + ','.join(expressions) + ')')

  # fetch data
  data = renderViewData(queries, requestContext)

  # build response object
  resp = ReadResponse()

  for expression in queries:
    result = resp.results.add()
    for series in data:
      if series.pathExpression != expression:
        continue

      ts = result.timeseries.add()
      for (tag, value) in series.tags.items():
        if tag == 'name':
          tag = '__name__'
        label = ts.labels.add()
        label.name = tag
        label.value = value
      timestamps = range(int(series.start), int(series.end) + 1, int(series.step))
      for value, timestamp in zip(series, timestamps):
        if value is None:
          continue

        sample = ts.samples.add()
        sample.timestamp = timestamp * 1000
        sample.value = value

  log.debug(resp)

  # serialize, compress & return result
  respData = snappy.compress(resp.SerializeToString())

  response = HttpResponse(respData, content_type='application/x-protobuf')
  response['Content-Encoding'] = 'snappy'

  return response
