"""
Interacts with the job database/storage.
At the moment; this uses hard coded data but should finally interact with the real database/storage.
"""
from graphite.logger import log

user_dict = {
  "root": ["Venosaur", "Charizard"],
  "Silox": ["Blastoise"]
}

jobs_dict = {
  "Venosaur": {
    'nodes': ["serenity", "carbon", "think"],
    'startTime': 2,
    'endTime': 1373444994
  },
  "Charizard": {
    'nodes': ["carbon"],
    'startTime': 1,
    'endTime': 1373444994
  },
  "Blastoise":
    {
      'nodes': ["serenity"],
      'startTime': 1373391116,
      'endTime': 1373401916
    }
}

def get_jobs(user, limit=False):
  """
  Returns all the jobs a user ever has submitted
  If the limit paramter is set, display the most recent limit number of jobs
  """
  try:
    jobs = []

    # Return all jobs for the admins
    if user.has_perm('account.can_see_all'):
      jobs = jobs_dict.keys()
    else:
      jobs = user_dict[user.username]

    # Sort them by startTime
    jobs = sorted(jobs, key=lambda k: jobs_dict[k]['startTime'])
    jobs.reverse()

    # Did we limit the jobs? Return only the last limit number of jobs!
    if limit:
      return jobs[:limit]
    
    return jobs

  except KeyError:
    # We log to info here; as it is possible that a user just doesn't has any jobs
    log.info("No jobs found for user %s", user)
    return []

def get_job_timerange(job):
  """
  Returns specific job timerange in the tuple (startTime, endTime)
  """
  try:
    return (jobs_dict[job]['startTime'], jobs_dict[job]['endTime'])
  except KeyError:
    # Log to exception: a job must have a timerange
    log.exeption("No timerange found for job %s", job)
    raise

def get_nodes(job):
  """
  Returns all the nodes a job has run on
  """
  try:
    return jobs_dict[job]['nodes']
  except KeyError:
    log.exception("No nodes found for job %s", job)
    raise
