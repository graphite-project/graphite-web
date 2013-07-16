"""
Interacts with the job database/storage.
At the moment; this uses hard coded data but should finally interact with the real database/storage.
"""
import time
from sqlalchemy import create_engine, MetaData, Table, select

from graphite.logger import log

engine = create_engine('postgresql://silox:sup@localhost/hpc')
metadata = MetaData(engine)
jobs = Table('job', metadata, autoload=True)

def get_jobs(user, limit=False):
  """
  Returns all the jobs a user ever has submitted
  If the limit paramater is set, display the most recent limit number of jobs
  """
  # Build the select query
  s = select([jobs.c.id])

  # If the user isn't allowed to see everything; limit the query
  if not user.has_perm('account.can_see_all'):
    s = s.where(jobs.c.userr == user.username)

  # Order the jobs
  s = s.order_by(jobs.c.lasttime.desc())

  # Did we limit the jobs? Return only the last limit number of jobs!
  if limit:
    s = s.limit(limit)

  # Fetch the results and return the ID's as a list
  result = engine.execute(s).fetchall()
  return [job[0] for job in result]

def get_job_timerange(job):
  """
  Returns specific job timerange in the tuple (startTime, endTime)
  """
  s = select([jobs.c.start, jobs.c.lasttime]).where(jobs.c.id == job)
  result = engine.execute(s).first()

  if len(result) > 1:
    return (timestamp(result[0]), timestamp(result[1]))
  else:
    # Log to exception: a job must have nodes
    log.exeption("No timerange found for job %s", job)
    raise NoTimeRangeForJobException

def get_nodes(job):
  """
  Returns all the nodes a job has run on
  """
  s = select([jobs.c.exec_host]).where(jobs.c.id == job)
  result = engine.execute(s).first()

  if len(result) > 0:
    nodestring = result[0].split('.', 1)[0]
    nodes = nodestring.split('+')
    nodes = [str(node.split('/', 1)[0]) for node in nodes]
    return nodes
  else:
    # Log to exception: a job must have nodes
    log.exeption("No nodes found for job %s", job)
    raise NoNodesForJobException

class NoNodesForJobException(Exception):
  ''' Error die wordt opgegooid wanneer er geen nodes voor een job worden gevonden '''
  pass

class NoTimeRangeForJobException(Exception):
  ''' Error die wordt opgegooid wanneer er geen timerange voor een job wordt gevonden '''
  pass

def timestamp(datetime):
  "Convert a datetime object into epoch time"
  return time.mktime( datetime.timetuple() )
