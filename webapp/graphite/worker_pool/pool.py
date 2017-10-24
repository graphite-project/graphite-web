import Queue

from threading import Lock
from django.conf import settings
from multiprocessing.pool import ThreadPool

__init_lock = Lock()
__pools = {}


class Job(object):
  __slots__ = ('func', 'args', 'kwargs')

  def __init__(self, func, *args, **kwargs):
    self.func = func
    self.args = args
    self.kwargs = kwargs

  def run(self):
    try:
      return Result(self, result=self.func(*self.args, **self.kwargs))
    except Exception as err:
      return Result(self, exception=err)


class Result(object):
  __slots__ = ('job', 'result', 'exception')

  def __init__(self, job, result=None, exception=None):
    self.job = job
    self.result = result
    self.exception = exception


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
        func=pool_executor, args=[job], callback=return_result)
  else:
    for job in jobs:
      queue.put(job.run())
  return queue


def pool_executor(job):
  return job.run()
