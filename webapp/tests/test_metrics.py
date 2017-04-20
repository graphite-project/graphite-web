import copy
import json
import os
import shutil
import time

from django.conf import settings
from django.core.urlresolvers import reverse
from .base import TestCase

import whisper

from graphite.util import unpickle


class MetricsTester(TestCase):
    db = os.path.join(settings.WHISPER_DIR, 'test.wsp')
    hostcpu = os.path.join(settings.WHISPER_DIR, 'hosts/hostname/cpu.wsp')

    settings.CLUSTER_SERVERS = ['127.1.1.1', '127.1.1.2']

    def wipe_whisper(self):
        try:
            os.remove(self.db)
        except OSError:
            pass

    def create_whisper_hosts(self, ts=None):
        worker1 = self.hostcpu.replace('hostname', 'worker1')
        worker2 = self.hostcpu.replace('hostname', 'worker2')
        try:
            os.makedirs(worker1.replace('cpu.wsp', ''))
            os.makedirs(worker2.replace('cpu.wsp', ''))
        except OSError:
            pass

        whisper.create(worker1, [(1, 60)])
        whisper.create(worker2, [(1, 60)])

        ts = ts or int(time.time())
        whisper.update(worker1, 1, ts)
        whisper.update(worker2, 2, ts)

    def wipe_whisper_hosts(self):
        try:
            os.remove(self.hostcpu.replace('hostname', 'worker1'))
            os.remove(self.hostcpu.replace('hostname', 'worker2'))
            shutil.rmtree(self.hostcpu.replace('hostname/cpu.wsp', ''))
        except OSError:
            pass

    def test_index_json(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        url = reverse('graphite.metrics.views.index_json')

        # default
        request = {}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data[0], 'hosts.worker1.cpu')
        self.assertEqual(data[1], 'hosts.worker2.cpu')

        # XXX Disabling this test for now since a local running
        # Graphite webapp will always return a 200, breaking our test
        ## cluster failure
        #request = {'cluster': 1}
        #response = self.client.post(url, request)
        #self.assertEqual(response.status_code, 500)
        #data = json.loads(response.content)
        #self.assertEqual(data, [])

        # jsonp
        request = {'jsonp': 'callback'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content.split("(")[1].strip(")"))
        self.assertEqual(data[0], 'hosts.worker1.cpu')
        self.assertEqual(data[1], 'hosts.worker2.cpu')


    def test_find_view(self):
        ts = int(time.time())
        #create a minus 60 variable to test with, otherwise the build could fail the longer the test runs
        ts_minus_sixty_seconds = ts - 60

        self.create_whisper_hosts(ts)
        self.addCleanup(self.wipe_whisper_hosts)

        url = reverse('graphite.metrics.views.find_view')

        #
        # Missing query param
        #
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.content, "Missing required parameter 'query'")

        #
        # format=invalid_format
        #
        response = self.client.post(url, {'format': 'invalid_format', 'query': '*'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.content, "Invalid value for 'format' parameter")


        def test_find_view_basics(data):
          response = self.client.post(url, data)
          self.assertEqual(response.status_code, 200)
          self.assertTrue(response.has_header('Pragma'))
          self.assertTrue(response.has_header('Cache-Control'))

          return response.content

        #
        # Default values
        #
        request_default = {'query': '',
                           'local': 0,
                           'wildcards': 0,
                           'from': -1,
                           'until': -1,
                           'jsonp': '',
                           'automatic_variants': 0}

        #
        # format=treejson
        #
        request=copy.deepcopy(request_default)
        request['format']='treejson'
        request['query']='*'
        content = test_find_view_basics(request)
        [data] = json.loads(content)
        self.assertEqual(data['text'], 'hosts')

        # No match
        request=copy.deepcopy(request_default)
        request['format']='treejson'
        request['query']='other'
        content = test_find_view_basics(request)
        self.assertEqual(content, '[]')

        request['query']='*'
        request['wildcards']=1
        content = test_find_view_basics(request)
        [data] = json.loads(content)
        self.assertEqual(data['text'], 'hosts')

        # Other formats than treejson shouldn't require DB calls
        with self.assertNumQueries(0):
            #
            # format=pickle
            #
            request=copy.deepcopy(request_default)
            request['format']='pickle'
            request['query']='*'
            content = test_find_view_basics(request)
            data = unpickle.loads(content)
            self.assertEqual(len(data), 1)
            self.assertEqual(data[0]['path'], 'hosts')
            self.assertEqual(data[0]['is_leaf'], False)

            request['query']='hosts.*.cpu'
            content = test_find_view_basics(request)
            data = unpickle.loads(content)
            self.assertEqual(len(data), 2)

            data = sorted(data, key=lambda item: item['path'])

            self.assertEqual(data[0]['path'], 'hosts.worker1.cpu')
            self.assertEqual(data[0]['is_leaf'], True)
            self.assertEqual(len(data[0]['intervals']), 1)
            #self.assertEqual(int(data[0]['intervals'][0].start), ts_minus_sixty_seconds)
            self.assertEqual(int(data[0]['intervals'][0].end), ts)

            self.assertEqual(data[1]['path'], 'hosts.worker2.cpu')
            self.assertEqual(data[1]['is_leaf'], True)
            self.assertEqual(len(data[1]['intervals']), 1)
            #self.assertEqual(int(data[1]['intervals'][0].start), ts_minus_sixty_seconds)
            self.assertEqual(int(data[1]['intervals'][0].end), ts)

            #
            # format=completer
            #
            request=copy.deepcopy(request_default)
            request['format']='completer'
            request['query']='*'
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'name': u'hosts', u'is_leaf': u'0', u'path': u'hosts.'}]})

            request['query']='hosts'
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'name': u'hosts', u'is_leaf': u'0', u'path': u'hosts.'}]})

            request['query']='hosts.*.*'
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'path': u'hosts.worker1.cpu', u'is_leaf': u'1', u'name': u'cpu'}, {u'path': u'hosts.worker2.cpu', u'is_leaf': u'1', u'name': u'cpu'}]})

            request['query']='hosts.'
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'is_leaf': u'0', u'name': u'worker1', u'path': u'hosts.worker1.'}, {u'is_leaf': u'0', u'name': u'worker2', u'path': u'hosts.worker2.'}]})

            # No match
            request['query']='other'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(data['metrics'], [])

            # No match
            request['query']='other'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(data['metrics'], [])

            # Test wildcards param
            request['wildcards']=1
            request['query']='hosts.*.'
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'name': u'*'}, {u'is_leaf': u'1', u'path': u'hosts.worker1.cpu', u'name': u'cpu'}, {u'is_leaf': u'1', u'path': u'hosts.worker2.cpu', u'name': u'cpu'}]})

            # Test from/until params
            request=copy.deepcopy(request_default)
            request['format']='completer'
            request['query']='hosts'
            request['from']=int(time.time())-60
            request['until']=int(time.time())
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'name': u'hosts', u'is_leaf': u'0', u'path': u'hosts.'}]})

            # automatic_variants
            request=copy.deepcopy(request_default)
            request['format']='completer'
            request['automatic_variants']=1
            request['query']='hosts.'
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'is_leaf': u'0', u'name': u'worker1', u'path': u'hosts.worker1.'}, {u'is_leaf': u'0', u'name': u'worker2', u'path': u'hosts.worker2.'}]})

            request['automatic_variants']=1
            request['query']='{hosts,blah}.'
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'path': u'hosts.worker1.', u'is_leaf': u'0', u'name': u'worker1'}, {u'path': u'hosts.worker2.', u'is_leaf': u'0', u'name': u'worker2'}]})

            request['automatic_variants']=1
            request['query']='hosts,blah.'
            content = test_find_view_basics(request)
            data = json.loads(content)
            data['metrics'] = sorted(data['metrics'])
            self.assertEqual(data, {u'metrics': [{u'name': u'worker1', u'path': u'hosts.worker1.', u'is_leaf': u'0'}, {u'name': u'worker2', u'path': u'hosts.worker2.', u'is_leaf': u'0'}]})

            # format=completer+jsonp
            request=copy.deepcopy(request_default)
            request['format']='completer'
            request['jsonp']='asdf'
            request['query']='*'
            content = test_find_view_basics(request)
            data = json.loads(content.split("(")[1].strip(")"))
            self.assertEqual(data, {u'metrics': [{u'name': u'hosts', u'path': u'hosts.', u'is_leaf': u'0'}]})

            # No match
            request['query']='other'
            content = test_find_view_basics(request)
            data = json.loads(content.split("(")[1].strip(")"))
            self.assertEqual(data['metrics'], [])

            #
            # format=nodelist
            #
            request=copy.deepcopy(request_default)
            request['format']='nodelist'
            request['query']='*'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(data, {u'nodes': [u'hosts']})

            request=copy.deepcopy(request_default)
            request['format']='nodelist'
            request['query']='*.*'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(data, {u'nodes': [u'worker1', u'worker2']})

            request=copy.deepcopy(request_default)
            request['format']='nodelist'
            request['query']='*.*.*'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(data, {u'nodes': [u'cpu']})

            # override node position
            request=copy.deepcopy(request_default)
            request['format']='nodelist'
            request['query']='*.*.*'
            request['position']='0'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(data, {u'nodes': [u'hosts']})

            # format=json
            request=copy.deepcopy(request_default)
            request['format']='json'

            # branch
            request['query']='*'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(data, [{u'path': u'hosts', u'is_leaf': False}])

            # leaf
            request['query']='hosts.*.cpu'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(len(data), 2)

            self.assertEqual(data[0]['path'], 'hosts.worker1.cpu')
            self.assertEqual(data[0]['is_leaf'], True)
            self.assertEqual(len(data[0]['intervals']), 1)
            #self.assertEqual(int(data[0]['intervals'][0]['start']), ts_minus_sixty_seconds)
            self.assertEqual(int(data[0]['intervals'][0]['end']), ts)

            self.assertEqual(data[1]['path'], 'hosts.worker2.cpu')
            self.assertEqual(data[1]['is_leaf'], True)
            self.assertEqual(len(data[1]['intervals']), 1)
            #self.assertEqual(int(data[1]['intervals'][0]['start']), ts_minus_sixty_seconds)
            self.assertEqual(int(data[1]['intervals'][0]['end']), ts)

            # No match
            request['query']='other'
            content = test_find_view_basics(request)
            data = json.loads(content)
            self.assertEqual(data, [])

            # format=json+jsonp
            request=copy.deepcopy(request_default)
            request['format']='json'
            request['jsonp']='asdf'

            # branch
            request['query']='*'
            content = test_find_view_basics(request)
            data = json.loads(content.split("(")[1].strip(")"))
            self.assertEqual(data, [{u'path': u'hosts', u'is_leaf': False}])

            # leaf
            request['query']='hosts.*.cpu'
            content = test_find_view_basics(request)
            data = json.loads(content.split("(")[1].strip(")"))
            self.assertEqual(len(data), 2)

            self.assertEqual(data[0]['path'], 'hosts.worker1.cpu')
            self.assertEqual(data[0]['is_leaf'], True)
            self.assertEqual(len(data[0]['intervals']), 1)
            #self.assertEqual(int(data[0]['intervals'][0]['start']), ts_minus_sixty_seconds)
            self.assertEqual(int(data[0]['intervals'][0]['end']), ts)

            self.assertEqual(data[1]['path'], 'hosts.worker2.cpu')
            self.assertEqual(data[1]['is_leaf'], True)
            self.assertEqual(len(data[1]['intervals']), 1)
            #self.assertEqual(int(data[1]['intervals'][0]['start']), ts_minus_sixty_seconds)
            self.assertEqual(int(data[1]['intervals'][0]['end']), ts)

            # No match
            request['query']='other'
            content = test_find_view_basics(request)
            data = json.loads(content.split("(")[1].strip(")"))
            self.assertEqual(data, [])

    def test_expand_view(self):
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        url = reverse('graphite.metrics.views.expand_view')

        # default
        request = {'query': '*'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['results'], [u'hosts'])

        # empty query
        request = {'query': ''}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['results'], [u''])

    def test_get_metadata_view(self):
        """Stub to test get_metadata_view.  This currently doesn't test a valid key """
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        url = reverse('graphite.metrics.views.get_metadata_view')

        # bad key
        request = {'metric': 'hosts.worker1.cpu', 'key': 'a'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['hosts.worker1.cpu']['error'], "Unexpected error occurred in CarbonLink.get_metadata(hosts.worker1.cpu, a)")

    def test_set_metadata_view(self):
        """Stub to test set_metadata_view.  This currently doesn't test a valid key """
        self.create_whisper_hosts()
        self.addCleanup(self.wipe_whisper_hosts)

        url = reverse('graphite.metrics.views.set_metadata_view')

        # GET
        # bad key
        request = {'metric': 'hosts.worker1.cpu', 'key': 'a', 'value': 'b'}
        response = self.client.get(url, request)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['hosts.worker1.cpu']['error'], "Unexpected error occurred in CarbonLink.set_metadata(hosts.worker1.cpu, a)")

        # POST
        # bad key
        request = {'operations': '[{ "metric": "hosts.worker1.cpu", "key": "a", "value": "b" }]'}
        response = self.client.post(url, request)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['hosts.worker1.cpu']['error'], "Unexpected error occurred in bulk CarbonLink.set_metadata(hosts.worker1.cpu)")
