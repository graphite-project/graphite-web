import os

try:
    from importlib import import_module
except ImportError:
    from django.utils.importlib import import_module

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'graphite.settings')  # noqa

from django.conf import settings
from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()

try:
    from whitenoise.django import DjangoWhiteNoise
except ImportError:
    pass
else:
    application = DjangoWhiteNoise(application)
    prefix = "/".join((settings.URL_PREFIX.strip('/'), 'static'))
    for directory in settings.STATICFILES_DIRS:
        application.add_files(directory, prefix=prefix)
    for app_path in settings.INSTALLED_APPS:
        module = import_module(app_path)
        directory = os.path.join(os.path.dirname(module.__file__), 'static')
        if os.path.isdir(directory):
            application.add_files(directory, prefix=prefix)
