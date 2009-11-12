import traceback
from django.conf import settings
from django.http import HttpResponseServerError
from django.template import Context, loader


def server_error(request, template_name='500.html'):
  template = loader.get_template(template_name)
  context = Context({
    'stacktrace' : traceback.format_exc()
  })
  return HttpResponseServerError( template.render(context) )
