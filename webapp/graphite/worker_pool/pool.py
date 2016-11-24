import time
from Queue import Queue, Full, Empty
from threading import Thread, Lock

from django.conf import settings

from graphite.logger import log

# we'll never want more than one instance of Pool
init_lock = Lock()
is_initialized = False


def get_pool():
  with init_lock:
    instance = getattr(get_pool, 'instance', None)
    if instance is None:
      instance = Pool()
      setattr(get_pool, 'instance', instance)
      is_initialized = True
  return instance


def stop_pool():
  with init_lock:
    if not is_initialized:
      return

    get_pool().shutdown()


class Pool(object):

  def __init__(self):
    self.workers = []
    self.req_q = Queue()
    self.pool_lock = Lock()
    self.grow_by(
      # the number of workers should increase linear with the number of
      # backend servers
      settings.POOL_WORKERS_PER_BACKEND * len(settings.CLUSTER_SERVERS) +
      # plus we need some baseline for local finds and other stuff that
      # always happens
      settings.POOL_WORKERS
    )

  def grow_by(self, worker_count):
    with self.pool_lock:
      for i in range(worker_count):
        self.workers.append(Worker(self.req_q, self))

    log.info("got {workers} workers".format(workers=len(self.workers)))

  def shutdown(self):
    with self.pool_lock:
      for worker in self.workers:
        worker.shutdown = True

      self.put_multi(
        jobs=[
          None
          for i in range(len(self.workers))
        ],
        result_queue=False,
      )

      while self.workers:
        self.workers.pop().t.join()

  # takes a job to execute and a queue to put the result in
  def put(self, job, result_queue=None):
    try:
      self.req_q.put(
        (job, result_queue)
      )
    except Full:
      raise Exception('All backend workers busy')

  def put_multi(self, jobs, timeout=5, result_queue=None):
    if result_queue is None:
      q = Queue()
    else:
      q = result_queue

    log_pre = 'put_multi ({inst}): '.format(inst=str(q))

    i = 0
    while i < len(jobs):
      log.info(
        '{pre}Submitting queue job {nr}/{tot}'
        .format(pre=log_pre, nr=i+1, tot=len(jobs)),
      )
      self.put(jobs[i], q)
      i += 1

    if result_queue is not None:
      return

    start = time.time()
    deadline = start + timeout
    results = []

    while i > 0:
      if time.time() > deadline:
        log.info("Timed out in pool.put_multi")

      try:
        results.append(q.get(block=True, timeout=0.1))
        i -= 1
      except Empty:
        pass

    log.info(
      '{pre}Completed in {sec}s'
      .format(sec=time.time()-start, pre=log_pre),
    )
    return results


class Worker(object):

  def __init__(self, req_q, pool):
    self.pool = pool
    self.req_q = req_q
    self.shutdown = False
    self.start()

  def start(self):
    self.t = Thread(target=self.loop)
    self.t.start()

  def loop(self):
    self.ident = self.t.ident
    while True:
      self.process(self.req_q.get(block=True))
      if self.shutdown:
        break

  def process(self, job):
    if self.shutdown:
      return

    log.info('Thread {thread} at {time}: processing'.format(
      thread=str(self.ident),
      time=time.time(),
    ))
    self.respond(job[1], job[0][0](*job[0][1:]))

  def respond(self, queue, reply):
    if queue is not None:
      queue.put(reply)
