import Queue
import time

from threading import Lock
from django.conf import settings
from multiprocessing.pool import ThreadPool

__init_lock = Lock()
__pools = {}


class Job(object):
  __slots__ = ('func', 'args', 'kwargs', 'result', 'exception')

  def __init__(self, func, *args, **kwargs):
    self.func = func
    self.args = args
    self.kwargs = kwargs
    self.result = None
    self.exception = None

  def run(self):
    try:
      self.result = self.func(*self.args, **self.kwargs)
    except Exception as err:
      self.exception = err


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
      job.run()
      queue.put(job)
  return queue


class PoolTimeoutError(Exception):
  pass


def pool_exec(pool, jobs, timeout):
  start = time.time()
  deadline = start + timeout
  if pool:
    done = 0
    total = len(jobs)

    queue = pool_apply(pool, jobs)

    while done < total:
      wait_time = deadline - time.time()
      try:
        result = queue.get(True, wait_time)
      # ValueError could happen if due to really unlucky timing wait_time
      # is negative
      except (Queue.Empty, ValueError):
        if time.time() > deadline:
          raise PoolTimeoutError("Timed out after %fs" % (time.time() - start))

        continue

      done += 1
      yield result
  else:
    for job in jobs:
      job.run()

      if time.time() > deadline:
        raise PoolTimeoutError("Timed out after %fs" % (time.time() - start))

      yield job

def pool_executor(job):
  job.run()
  return job
