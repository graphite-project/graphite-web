import socket, time
from graphite.util import HTTPConnectionWithTimeout
from urllib import urlencode
try:
  import cPickle as pickle
except ImportError:
  import pickle


class ClusterMember(object):
  timeout = 5
  lastFailure = 0.0
  retryDelay = 10
  available = property(lambda self: time.time() - self.lastFailure > self.retryDelay)

  def __init__(self, host):
    self.host = host

  def find(self, pattern):
    request = FindRequest(self, pattern)
    request.send()
    return request

  def fail(self):
    self.lastFailure = time.time()


class FindRequest:
  suppressErrors = True

  def __init__(self, server, pattern):
    self.server = server
    self.pattern = pattern
    self.connection = None

  def send(self):
    self.connection = HTTPConnectionWithTimeout(self.server.host)
    self.connection.timeout = self.server.timeout
    try:
      self.connection.request('GET', '/browser/local/?pattern=' + self.pattern)
    except:
      self.server.fail()
      if not self.suppressErrors:
        raise

  def get_results(self):
    if not self.connection:
      self.send()

    try:
      response = self.connection.getresponse()
      assert response.status == 200, "received error response %s - %s" % (response.status, response.reason)
      result_data = response.read()
      results = pickle.loads(result_data)
    except:
      self.server.fail()
      if not self.suppressErrors:
        raise
      else:
        results = []

    return [ RemoteNode(self.server,graphite_path,isLeaf) for (graphite_path,isLeaf) in results ]


class RemoteNode:
  def __init__(self, server, graphite_path, isLeaf):
    self.server = server
    self.fs_path = None
    self.graphite_path = graphite_path
    self.name = graphite_path.split('.')[-1]
    self.__isLeaf = isLeaf

  def fetch(self, startTime, endTime):
    if not self.__isLeaf:
      return []

    query_params = [
      ('target', self.graphite_path),
      ('pickle', 'true'),
      ('from', str( int(startTime) )),
      ('until', str( int(endTime) ))
    ]
    query_string = urlencode(query_params)

    connection = HTTPConnectionWithTimeout(self.server.host)
    connection.timeout = self.server.timeout
    connection.request('GET', '/render/?' + query_string)
    response = connection.getresponse()
    assert response.status == 200, "Failed to retrieve remote data: %d %s" % (response.status, response.reason)
    rawData = response.read()

    seriesList = pickle.loads(rawData)
    assert len(seriesList) == 1, "Invalid result: seriesList=%s" % str(seriesList)
    series = seriesList[0]

    timeInfo = (series['start'], series['end'], series['step'])
    return (timeInfo, series['values'])

  def isLeaf(self):
    return self.__isLeaf
