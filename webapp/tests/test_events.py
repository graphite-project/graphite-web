import time
import json

from datetime import timedelta

from django.core.urlresolvers import reverse
from django.test import TestCase
from django.utils import timezone

from graphite.events.models import Event


class EventTest(TestCase):
    def test_timezone_handling(self):
        url = reverse("graphite.events.views.view_events")
        data = {'what': 'something happened',
                'when': time.time() - 3590}
        with self.settings(TIME_ZONE='Europe/Moscow'):
            response = self.client.post(url, json.dumps(data),
                                        content_type='application/json')
        self.assertEqual(response.status_code, 200)
        event = Event.objects.get()
        self.assertTrue(timezone.now() - event.when < timedelta(hours=1))
        self.assertTrue(timezone.now() - event.when > timedelta(seconds=3580))

        url = reverse('graphite.events.views.get_data')
        with self.settings(TIME_ZONE='Europe/Berlin'):
            response1 = self.client.get(url)
        [event] = json.loads(response1.content)
        self.assertEqual(event['what'], 'something happened')
        with self.settings(TIME_ZONE='UTC'):
            response2 = self.client.get(url)
        self.assertEqual(response1.content, response2.content)

        url = reverse("graphite.events.views.view_events")
        data = {'what': 'something else happened'}
        with self.settings(TIME_ZONE='Asia/Hong_Kong'):
            response = self.client.post(url, json.dumps(data),
                                        content_type='application/json')
        self.assertEqual(response.status_code, 200)

        url = reverse('graphite.events.views.get_data')
        with self.settings(TIME_ZONE='Europe/Berlin'):
            response = self.client.get(url, {'from': int(time.time() - 3500)})
        [event] = json.loads(response.content)
        self.assertEqual(event['what'], 'something else happened')