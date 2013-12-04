try:
  from importlib import import_module
except ImportError:  # python < 2.7 compatibility
  from django.utils.importlib import import_module

from django.conf import settings

from ..finders import CeresFinder, StandardFinder


finders = [
  CeresFinder(settings.CERES_DIR),
  StandardFinder(settings.STANDARD_DIRS),
]
store = import_module(settings.STORE_BACKEND)
STORE = store.Store(finders, hosts=settings.CLUSTER_SERVERS)
