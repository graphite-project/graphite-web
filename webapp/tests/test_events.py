import json

from django.test import TestCase
from django.core.urlresolvers import reverse

from graphite.events.models import Event


class EventsTest(TestCase):
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
            'tags': "other",
        }
        response = self.client.post(creation_url, json.dumps(event),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)
        error = json.loads(response.content)
        self.assertEqual(error, {'error': '"tags" must be an array'})
        self.assertEqual(Event.objects.count(), 0)
