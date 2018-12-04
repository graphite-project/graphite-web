import mock

from urllib3.response import HTTPResponse
from graphite.util import BytesIO

from .base import TestCase
try:
    from django.urls import reverse
except ImportError:  # Django < 1.10
    from django.core.urlresolvers import reverse


class ComposerTest(TestCase):
    @mock.patch('six.moves.http_client.HTTPConnection.request')
    @mock.patch('six.moves.http_client.HTTPConnection.getresponse')
    @mock.patch('graphite.composer.views.SMTP')
    @mock.patch('django.conf.settings.SMTP_SERVER', 'localhost')
    def test_send_email(self, mock_smtp, http_response, http_request):
        url = reverse('composer_send_email')
        request = { "to": "noreply@localhost",
                   "url": 'https://localhost:8000/render?target=sumSeries(a.b.c.d)&title=Test&width=500&from=-55minutes&until=now&height=400'}

        response = self.client.get(reverse('render'), {'target': 'test'})
        self.assertEqual(response['Content-Type'], 'image/png')
        data = response.content
        responseObject = HTTPResponse(body=BytesIO(data), status=200, preload_content=False)
        http_request.return_value = responseObject
        http_response.return_value = responseObject

        instance = mock_smtp.return_value
        instance.sendmail.return_value = {}

        response = self.client.get(url, request)
        self.assertEqual(response.content, b'OK')
