import time
from Queue import Queue, Full, Empty
from threading import Thread

from django.conf import settings
from threading import Lock

from graphite.logger import log


REQUEST_TYPE_FETCH = 0
REQUEST_TYPE_FIND = 1

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
    self.grow_by(len(settings.CLUSTER_SERVERS) * settings.WORKERS_PER_BACKEND)

  def grow_by(self, worker_count):
    for i in range(worker_count):
      self.workers.append(Worker(self.req_q))

  # takes a job to execute and a queue to put the result in
  def put(self, job, res_q):
    try:
      self.req_q.put(
        (job, res_q)
      )
    except Full:
      raise Exception('All backend workers busy')

  # generator that takes a list of jobs and yields result by result
  def put_multi(self, jobs, timeout=5):
    q = Queue()
    log_pre = 'put_multi ({inst}): '.format(inst=str(q))

    i = 0
    while i < len(jobs):
      log.info(
        '{pre}Submitting queue job {nr}/{tot}'
        .format(pre=log_pre, nr=i+1, tot=len(jobs)),
      )
      self.put(jobs[i], q)
      i += 1

    start = time.time()
    deadline = start + timeout

    i = 0
    while i < len(jobs):
      if time.time() > deadline:
        log.info("Timed out in pool.put_multi")

      try:
        yield q.get(block=True, timeout=0.1)
        i += 1
      except Empty:
        pass
    log.info(
      '{pre}Completed in {sec}s'
      .format(sec=time.time()-start, pre=log_pre),
    )


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
    log.info('Thread {thread}: processing'.format(
      thread=str(self.ident),
    ))
    self.respond(job[1], job[0]())

  def respond(self, queue, reply):
    if queue is not None:
      queue.put(reply)
