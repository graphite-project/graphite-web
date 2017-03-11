from threading import Lock
from django.conf import settings
from multiprocessing.pool import ThreadPool

init_lock = Lock()
is_initialized = False


# the number of workers should increase linear with the number of
# backend servers, plus we need some baseline for local finds and
# other stuff that always happens
thread_count = settings.POOL_WORKERS_PER_BACKEND * len(settings.CLUSTER_SERVERS) + settings.POOL_WORKERS

def get_pool():
  with init_lock:
    instance = getattr(get_pool, 'instance', None)
    if instance is None:
      instance = ThreadPool(thread_count)
      setattr(get_pool, 'instance', instance)
      is_initialized = True
  return instance


def stop_pool():
  with init_lock:
    if not is_initialized:
      return

    get_pool().close()
