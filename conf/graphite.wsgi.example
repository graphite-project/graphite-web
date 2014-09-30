import os, sys
sys.path.append('/opt/graphite/webapp')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'graphite.settings')

import django

if django.VERSION < (1, 4):
    from django.core.handlers.wsgi import WSGIHandler
    application = WSGIHandler()
else:
    # From 1.4 wsgi support was improved and since 1.7 old style WSGI script
    # causes AppRegistryNotReady exception
    # https://docs.djangoproject.com/en/dev/releases/1.7/#wsgi-scripts
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()


# READ THIS
# Initializing the search index can be very expensive, please include
# the WSGIImportScript directive pointing to this script in your vhost
# config to ensure the index is preloaded before any requests are handed
# to the process.
from graphite.logger import log
log.info("graphite.wsgi - pid %d - reloading search index" % os.getpid())
import graphite.metrics.search
