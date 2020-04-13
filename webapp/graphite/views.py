import traceback
from django.http import HttpResponseServerError
from django.template import loader


def server_error(request, template_name='500.html'):
    template = loader.get_template(template_name)
    context = {'stacktrace' : traceback.format_exc()}
    return HttpResponseServerError(template.render(context))
