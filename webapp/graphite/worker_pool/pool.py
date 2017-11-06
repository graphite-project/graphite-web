import Queue
import time

from threading import Lock
from django.conf import settings
from multiprocessing.pool import ThreadPool

_init_lock = Lock()
_pools = {}


class Job(object):
  """A job to be executed by a pool

  The job accepts a function and arguments.

  When it is run, it will execute the function with the specified arguments.

  The return value of the function will be stored in the result property of the job.

  If the function raises an exception, it will be stored in the exception property of the job.
  """
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

  If settings.USE_WORKER_POOL is False or thread_count (default: settings.POOL_WORKERS)
  is 0, then None is returned.

  If the thread pool had already been initialized, thread_count will
  be ignored.
  """
  if not settings.USE_WORKER_POOL or not thread_count:
    return None

  with _init_lock:
    pool = _pools.get(name, None)
    if pool is None:
      pool = ThreadPool(thread_count)
      _pools[name] = pool
  return pool


def stop_pools():
  with _init_lock:
    for name in list(_pools.keys()):
      pool = _pools.pop(name)
      pool.close()


def stop_pool(name="default"):
  with _init_lock:
    _pools[name].close()
    del _pools[name]


class PoolTimeoutError(Exception):
  pass


def pool_exec(pool, jobs, timeout):
  """Execute a list of jobs, yielding each one as it completes.

  If a pool is specified then the jobs will be executed asynchronously,
  otherwise they are executed in order.

  If not all jobs have been executed after the specified timeout a
  PoolTimeoutError will be raised. When operating synchronously the
  timeout is checked after each job is run.
  """
  start = time.time()
  deadline = start + timeout
  if pool:
    queue = Queue.Queue()

    def pool_executor(job):
      job.run()
      queue.put(job)

    for job in jobs:
      pool.apply_async(func=pool_executor, args=[job])

    done = 0
    total = len(jobs)

    while done < total:
      wait_time = max(0, deadline - time.time())
      try:
        job = queue.get(True, wait_time)
      except Queue.Empty:
        raise PoolTimeoutError("Timed out after %fs" % (time.time() - start))

      done += 1
      yield job
  else:
    for job in jobs:
      job.run()

      if time.time() > deadline:
        raise PoolTimeoutError("Timed out after %fs" % (time.time() - start))

      yield job
