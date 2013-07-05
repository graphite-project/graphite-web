class Job: # Ugly POC
  context = {}
  
  def __init__(self, name, nodes, startTime, endTime):
    self.name = name
    self.nodes = nodes
    self.startTime = startTime
    self.endTime = endTime
       
  def isLeaf(self):
    return False
  
jobs_dict = { # Ugly POC
              "Venosaur": Job("Venosaur", ["serenity", "carbon", "think"], 0, 1373011463),
              "Charizard": Job("Charizard", ["carbon"], 0, 1373011463),
              "Blastoise": Job("Blastoise", ["serenity"], 0, 1373011463)
            }
  