try:
  from importlib import import_module
except ImportError:  # python < 2.7 compatibility
  from django.utils.importlib import import_module

from django.conf import settings


store = import_module(settings.STORE_BACKEND)
STORE = store.Store()
