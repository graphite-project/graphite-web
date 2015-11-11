import os
import sys
sys.path.append('/opt/graphite/webapp')

try:
    from importlib import import_module
except ImportError:
    from django.utils.importlib import import_module

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'graphite.settings')  # noqa

from django.conf import settings
from django.core.wsgi import get_wsgi_application
from graphite.logger import log

application = get_wsgi_application()

try:
    import whitenoise
except ImportError:
    whitenoise = False
else:
    # WhiteNoise < 2.0.1 does not support Python 2.6
    if sys.version_info[:2] < (2, 7):
        whitenoise_version = tuple(map(
                int, getattr(whitenoise, '__version__', '0').split('.')))
        if whitenoise_version < (2, 0, 1):
            whitenoise = False

if whitenoise:
    from whitenoise.django import DjangoWhiteNoise
    application = DjangoWhiteNoise(application)
    prefix = "/".join((settings.URL_PREFIX.strip('/'), 'static'))
    for directory in settings.STATICFILES_DIRS:
        application.add_files(directory, prefix=prefix)
    for app_path in settings.INSTALLED_APPS:
        module = import_module(app_path)
        directory = os.path.join(os.path.dirname(module.__file__), 'static')
        if os.path.isdir(directory):
            application.add_files(directory, prefix=prefix)

# Initializing the search index can be very expensive. The import below
# ensures the index is preloaded before any requests are handed to the
# process.
log.info("graphite.wsgi - pid %d - reloading search index" % os.getpid())
import graphite.metrics.search  # noqa
