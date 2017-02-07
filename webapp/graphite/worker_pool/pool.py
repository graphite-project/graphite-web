import time
from Queue import Queue, Full, Empty
from threading import Thread

from django.conf import settings
from threading import Lock

from graphite.logger import log

# we'll never want more than one instance of Pool
init_lock = Lock()

def get_pool():
  with init_lock:
    instance = getattr(get_pool, 'instance', None)
    if instance is None:
      instance = Pool()
      setattr(get_pool, 'instance', instance)
  return instance


class Pool(object):

  def __init__(self):
    self.workers = []
    self.req_q = Queue()
    self.grow_by(settings.POOL_WORKERS)

  def grow_by(self, worker_count):
    for i in range(worker_count):
      self.workers.append(Worker(self.req_q))
    log.info("created {workers} workers".format(workers=len(self.workers)))

  # takes a job to execute and a queue to put the result in
  def put(self, job, result_queue):
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

  def __init__(self, req_q):
    self.req_q = req_q
    self.start()

  def start(self):
    self.t = Thread(target=self.loop)
    self.t.start()

  def loop(self):
    self.ident = self.t.ident
    while True:
      self.process(self.req_q.get(block=True))

  def process(self, job):
    log.info('Thread {thread} at {time}: processing'.format(
      thread=str(self.ident),
      time=time.time(),
    ))
    self.respond(job[1], job[0][0](*job[0][1:]))

  def respond(self, queue, reply):
    if queue is not None:
      queue.put(reply)
