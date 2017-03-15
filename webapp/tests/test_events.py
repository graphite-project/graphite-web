import time
import json

from datetime import timedelta

from django.core.urlresolvers import reverse
from .base import TestCase
from django.utils import timezone

from graphite.events.models import Event


class EventTest(TestCase):
    def test_timezone_handling(self):
        url = reverse('events')
        data = {'what': 'something happened',
                'when': time.time() - 3590}
        with self.settings(TIME_ZONE='Europe/Moscow'):
            response = self.client.post(url, json.dumps(data),
                                        content_type='application/json')
        self.assertEqual(response.status_code, 200)
        event = Event.objects.get()
        self.assertTrue(timezone.now() - event.when < timedelta(hours=1))
        self.assertTrue(timezone.now() - event.when > timedelta(seconds=3580))

        url = reverse('events_get_data')
        with self.settings(TIME_ZONE='Europe/Berlin'):
            response1 = self.client.get(url)
        [event] = json.loads(response1.content)
        self.assertEqual(event['what'], 'something happened')
        with self.settings(TIME_ZONE='UTC'):
            response2 = self.client.get(url)
        self.assertEqual(response1.content, response2.content)

        url = reverse('events')
        data = {'what': 'something else happened'}
        with self.settings(TIME_ZONE='Asia/Hong_Kong'):
            response = self.client.post(url, json.dumps(data),
                                        content_type='application/json')
        self.assertEqual(response.status_code, 200)

        url = reverse('events_get_data')
        with self.settings(TIME_ZONE='Europe/Berlin'):
            response = self.client.get(url, {'from': int(time.time() - 3500)})
        [event] = json.loads(response.content)
        self.assertEqual(event['what'], 'something else happened')

    def test_event_tags(self):
        url = reverse('graphite.events.views.get_data')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(json.loads(response.content)), 0)

        creation_url = reverse('graphite.events.views.view_events')
        event = {
            'what': 'Something happened',
            'data': 'more info',
            'tags': ['foo', 'bar'],
        }
        response = self.client.post(creation_url, json.dumps(event),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)

        event = Event.objects.get()
        self.assertEqual(event.what, 'Something happened')
        self.assertEqual(event.tags, 'foo bar')

        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        events = json.loads(response.content)
        self.assertEqual(len(events), 1)
        event = events[0]
        self.assertEqual(event['what'], 'Something happened')
        self.assertEqual(event['tags'], ['foo', 'bar'])

    def test_tag_as_str(self):
        creation_url = reverse('graphite.events.views.view_events')
        event = {
            'what': 'Something happened',
            'data': 'more info',
            'tags': 'other',
        }
        response = self.client.post(creation_url, json.dumps(event),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)
        error = json.loads(response.content)
        self.assertEqual(error, {'error': '"tags" must be an array'})
        self.assertEqual(Event.objects.count(), 0)

    def test_tag_sets(self):
        creation_url = reverse('graphite.events.views.view_events')
        events = [
            {
                'what': 'Something happened',
                'data': 'more info',
                'tags': ['foo'],
            },
            {
                'what': 'Something else happened',
                'data': 'even more info',
                'tags': ['bar'],
            },
            {
                'what': 'A final thing happened',
                'data': 'yet even more info',
                'tags': ['foo', 'bar'],
            },
        ]

        for event in events:
            response = self.client.post(creation_url, json.dumps(event),
                                        content_type='application/json')
            self.assertEqual(response.status_code, 200)

        url = reverse('events_get_data')

        # should match two events using old set logic
        response = self.client.get(url, {'tags': 'foo'})
        self.assertEqual(response.status_code, 200)
        events = json.loads(response.content)
        self.assertEqual(len(events), 2)

        # should match one event using set intersection
        response = self.client.get("%s%s" % (url, '?tags=foo%20bar&set=intersection'))
        self.assertEqual(response.status_code, 200)
        events = json.loads(response.content)
        self.assertEqual(len(events), 1)

        # should match zero events using set intersection and unknown tag
        response = self.client.get("%s%s" % (url, '?tags=foo%20bar%20nope&set=intersection'))
        self.assertEqual(response.status_code, 200)
        events = json.loads(response.content)
        self.assertEqual(len(events), 0)

        # should match all events using set union
        response = self.client.get("%s%s" % (url, '?tags=foo%20bar&set=union'))
        self.assertEqual(response.status_code, 200)
        events = json.loads(response.content)
        self.assertEqual(len(events), 3)

    def test_get_detail_json(self):
        creation_url = reverse('graphite.events.views.view_events')
        event = {
            'what': 'Something happened',
            'data': 'more info',
            'tags': ['foo', 'bar'],
        }
        response = self.client.post(creation_url, json.dumps(event),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)

        url = reverse('events_detail', args=[1])
        response = self.client.get(url, {}, HTTP_ACCEPT='application/json')
        self.assertEqual(response.status_code, 200)
        event = json.loads(response.content)
        self.assertEqual(event['what'], 'Something happened')
        self.assertEqual(event['tags'], ['foo', 'bar'])

    def test_get_detail_json_object_does_not_exist(self):
        url = reverse('events_detail', args=[1])
        response = self.client.get(url, {}, HTTP_ACCEPT='application/json')
        self.assertEqual(response.status_code, 404)
        event = json.loads(response.content)
        self.assertEqual(event['error'], 'Event matching query does not exist')

    def test_render_events_issue_1749(self):
        url = reverse('graphite.render.views.renderView')
        response = self.client.get(url, {
                 'target': 'timeShift(events("tag1"), "1d")',
                 'format': 'json',
        })
        self.assertEqual(response.status_code, 200)
        response = self.client.get(url, {
                 'target': 'timeShift(events("tag1", "tag2"), "1d")',
                 'format': 'json',
        })
        self.assertEqual(response.status_code, 200)
