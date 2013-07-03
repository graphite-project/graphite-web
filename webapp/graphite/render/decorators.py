"""A wrapper to limit the data range of a job

This wrapper wraps around the evaluateTarget function from evaluator.py and makes sure
a user can't see any data in the range outside his own job script.

"""



def limit_time_range(fetch):
  """ Main wrapper """
  def limit(node, startTime, endTime):
    
    # TODO Get the jobs database in here
    
    # TODO Are you an admin? Just return the function without any modifications
    
    node_name = node.metric_path.split('.', 1)[0] # To bad we can't use partition here as we have to stay 2.4 compatible


    # TODO get the node name from the nodes the user ran a job at
    # TODO get the timestamps when the user ran the job at the specific node
    # TODO make sure the endTime and startTime are in the jobtimeinterval
    if node_name == "serenity" and endTime - startTime > 60*60*3:
      startTime = endTime - 60*60*3

    return fetch(node, startTime, endTime)
    
  return limit
