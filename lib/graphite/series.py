class TimeSeries:
  def __init__(self,timeInfo,values):
    self.start = timeInfo[0]
    self.end = timeInfo[1]
    self.step = timeInfo[2]
    self.values = values

  def __len__(self):
    return len(self.values)


