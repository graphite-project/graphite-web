import os
from django.core.handlers.wsgi import WSGIHandler

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'graphite.settings')

application = WSGIHandler()

# Initializing the search index can be very expensive. The import below
# ensures the index is preloaded before any requests are handed to the
# process.

from graphite.logger import log
log.info("graphite.wsgi - pid %d - reloading search index" % os.getpid())
import graphite.metrics.search
