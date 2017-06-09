import Queue

from threading import Lock
from django.conf import settings
from multiprocessing.pool import ThreadPool

__init_lock = Lock()
__pools = {}


def get_pool(name="default", thread_count=settings.POOL_WORKERS):
  """Get (and initialize) a Thread pool.

  If the thread pool had already been initialized, thread_count will
  be ignored.
  """
  if not settings.USE_WORKER_POOL or not thread_count:
    return None

  with __init_lock:
    pool = __pools.get(name, None)
    if pool is None:
      pool = ThreadPool(thread_count)
      __pools[name] = pool
  return pool


def stop_pools():
  with __init_lock:
    for name in list(__pools.keys()):
      pool = __pools.pop(name)
      pool.close()


def stop_pool(name="default"):
  with __init_lock:
    __pools[name].close()
    del __pools[name]


def pool_apply(pool, jobs):
  """Return a queue that will contain results of jobs.

  A list of jobs is passed in arguments and a queue of
  results is returned. If settings.USE_WORKER_POOL is
  True, then the jobs will be applied asynchronously.
  """
  queue = Queue.Queue()
  if pool:
    def return_result(x):
      return queue.put(x)
    for job in jobs:
      pool.apply_async(
        func=job[0], args=job[1:], callback=return_result)
  else:
    for job in jobs:
      queue.put(job[0](*job[1:]))
  return queue
