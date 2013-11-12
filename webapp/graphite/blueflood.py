import requests
import time
from optparse import OptionParser

try:
    import simplejson as json
except ImportError:
    import json


class Blueflood(object):
    def __init__(self, tenantId, api_key, **options):
        self.tenant = 'graphite_demo'

        if tenantId is not None:
            self.tenant = tenantId

        self._api_key = api_key
        self._api_version = 'v1.0'
        self._blueflood_host = 'localhost'
        self._blueflood_ingestion_port = '19000'
        self._blueflood_query_port = '20000'
        # count of messages to hit before flush
        self._blueflood_flush_count = 1
        # max time between successive flushes (seconds)
        self._blueflood_flush_interval = 30

        for key, value in options.items():
            if key == 'bf_host' and value is not None:
                self._blueflood_host = options['bf_host']

            if key == 'ingestion_port' and value is not None:
                self._blueflood_ingestion_port = options['ingestion_port']

            if key == 'query_port' and value is not None:
                self._blueflood_query_port = options['query_port']

            if key == 'api_version' and value is not None:
                self.api_version = options['api_version']

            if key == 'flush_buffer_threshold' and value is not None:
                self._blueflood_flush_count = options['flush_buffer_threshold']

            if key == 'max_flush_interval' and value is not None:
                self._blueflood_flush_interval = options['max_flush_interval']

        self.ingestion_base_url = 'http://' + self._blueflood_host + ':' +\
            self._blueflood_ingestion_port + '/' + self._api_version + '/'

        self.query_base_url = 'http://' + self._blueflood_host + ':' +\
            self._blueflood_query_port + '/' + self._api_version + '/'

        self._writer = BluefloodWriter(self.ingestion_base_url,
                                       self._blueflood_flush_count,
                                       self._blueflood_flush_interval)
        self._reader = BluefloodReader(self.query_base_url)

    def create(self, metric, **options):
        return self._writer.create(self.tenant, metric, **options)

    def exists(self, metric):
        return self._reader.exists(self.tenant, metric)

    def write(self, metric, datapoints):
        return self._writer.write(self.tenant, metric, datapoints)

    def set_metadata(self, metric, key, value):
        return self._writer.write_metadata(self.tenant, metric, key, value)

    def get_intervals(self, metric):
        return self._reader.get_intervals(self.tenant, metric)

    def fetch(self, metric, start_time, end_time):
        return self._reader.fetch(self.tenant, metric, start_time, end_time)


class BluefloodWriter(object):
    def __init__(self, ingestion_base_url, flush_threshold_count,
                 flush_threshold_time):
        self._base_url = ingestion_base_url
        self._buffer = []
        self._FLUSH_SIZE_MIN = flush_threshold_count
        self._MAX_FLUSH_INTERVAL = flush_threshold_time
        self._last_flushed = time.time()
        self._MAX_METRICS_PER_FLUSH = 1000

    def _get_metrics_url(self, tenantId):
        return self._base_url + tenantId + '/experimental/metrics'

    def create(self, tenant, metric, **options):
        # Nothing to be done for BF
        return True

    def _get_metrics_payload(self, metric, datapoints):
        data = []

        for timestamp, value in datapoints:
            if timestamp is not None and value is not None:
                metricObj = {}
                 # BF accepts milli-seconds since epoch as timestamp
                metricObj['collectionTime'] = long(timestamp) * 1000
                metricObj['metricName'] = metric
                metricObj['ttlInSeconds'] = 2 * 24 * 60 * 60  # 2 days
                metricObj['metricValue'] = value
                data.append(metricObj)

        return data

    def _should_flush(self):
        if (len(self._buffer) >= self._FLUSH_SIZE_MIN or
                time.time() - self._last_flushed > self._MAX_FLUSH_INTERVAL):
            return True

    def _flush_batch(self, url, batch):
        payload = json.dumps(batch, indent=4, separators=(',', ': '))
        try:
            r = requests.post(url, data=payload)
            if r.status_code != requests.codes.ok:
                raise Exception('Failed sending metrics to BF.')
        except Exception:
            raise Exception('Cannot ingest metrics into bluflood')

    def write(self, tenant, metric, datapoints):
        data = self._get_metrics_payload(metric, datapoints)
        if len(data) > 0:
            self._buffer += data

        if self._should_flush():
            url = self._get_metrics_url(tenant)

            # TODO: optimize this later
            while len(self._buffer) > 0:
                end = min(self._MAX_METRICS_PER_FLUSH, len(self._buffer))
                batch = self._buffer[:end]
                try:
                    self._flush_batch(url, batch)
                except:
                    raise
                else:
                    self._buffer = self._buffer[end:]

    def write_metadata(self, tenant, metric, key, value):
        #TODO: Needs implementation
        return True


class BluefloodReader(object):
    def __init__(self, query_base_url):
        self._base_url = query_base_url
        self._POINTS_TO_FETCH = 1000  # BF max limit

    def _get_metrics_query_url(self, tenantId, metricName, start, end, points):
        return self._base_url + tenantId\
            + '/experimental/views/metric_data/' + metricName\
            + '?from=' + str(start) + '&to=' + str(end) + '&points='\
            + str(points)

    def exists(self, tenant, metric):
        end = long(time.time() * 1000)
        start = 0  # 0 milliseconds since epoch
        url = self._get_metrics_query_url(tenant, metric, start, end, 100)

        try:
            r = requests.get(url)
            if r.status_code == requests.codes.ok:
                metrics = json.loads(r.content)['values']
                return len(metrics) > 0
            else:
                raise Exception('Invalid HTTP status code')
        except:
            raise

    def get_intervals(self, tenant, metric):
        end = long(time.time() * 1000)
        start = 0  # 0 milliseconds since epoch
        url = self._get_metrics_query_url(tenant, metric, start, end, 100)

        try:
            r = requests.get(url)
            if r.status_code == requests.codes.ok:
                body = json.loads(r.content)
                metrics = body['values']
                if len(metrics) > 0:
                    start = metrics[0]['timestamp']
                    end = metrics[len(metrics) - 1]['timestamp']
                    if end == start:
                        end = start + 300000  # HACK
                    return [(start, end)]
                else:
                    raise Exception('Metric doesn\'t exist in Blueflood')
            else:
                raise Exception('Invalid HTTP response code.')
        except:
            raise

    # startTime and endTime has to be time since epoch in milli-seconds
    def fetch(self, tenant, metric, start_time, end_time):
        url = self._get_metrics_query_url(tenant, metric, start_time,
                                          end_time, self._POINTS_TO_FETCH)
        try:
            print(url)
            r = requests.get(url)
            metrics = json.loads(r.content)['values']
            print(metrics)
            return metrics
        except:
            raise

    def read_metadata(self, tenant, metric, key, value):
        #TODO: Needs implementation
        raise NotImplemented()

    def get_metrics(self, tenant, query):
        # TODO Needs implementation
        raise NotImplemented()


def main():
    usage = 'usage: %prog \n' + \
            '--host=<host running blueflood> \n' + \
            '--in_port=<blueflood HTTP metrics ingestion port>' + \
            '--out_port=<blueflood HTTP metrics query port>'
    parser = OptionParser(usage=usage)
    parser.add_option('--host', dest='host', help='Blueflood host')
    parser.add_option('--in_port', dest='ingestion_port',
                      help='HTTP ingestion port')
    parser.add_option('--out_port', dest='query_port', help='HTTP query port')

    (options, args) = parser.parse_args()
    if not options.host:
        options.host = 'localhost'
    if not options.ingestion_port:
        options.ingestion_port = '19000'
    if not options.query_port:
        options.query_port = '20000'

    bf = Blueflood('graphite_demo', 'FAKE_API_KEY', bf_host=options.host,
                   ingestion_port=options.ingestion_port,
                   query_port=options.query_port)

    datapoints = []
    datapoints.append((12345678, 167))
    datapoints.append((12345679, 168))
    bf.write('rand', datapoints)


if __name__ == 'main':
    main()
