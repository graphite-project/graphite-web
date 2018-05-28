import time
import socket
import struct
import random

from django.conf import settings

from graphite.render.hashing import ConsistentHashRing
from graphite.logger import log
from graphite.util import load_module, unpickle
from graphite.singleton import ThreadSafeSingleton


try:
  import six.moves.cPickle as pickle
except ImportError:
  import pickle


def load_keyfunc():
  if settings.CARBONLINK_HASHING_KEYFUNC:
    module_path, func_name = settings.CARBONLINK_HASHING_KEYFUNC.rsplit(':', 1)
    log.cache("Using keyfunc %s found in %s" % (str(func_name), str(module_path)))
    return load_module(module_path, member=func_name)
  else:
    return lambda x: x


class CarbonLinkRequestError(Exception):
  pass


class CarbonLinkPool(object):
  def __init__(self, hosts, timeout):
    self.hosts = [ (server, instance) for (server, port, instance) in hosts ]
    self.ports = dict(
      ((server, instance), port) for (server, port, instance) in hosts )
    self.timeout = float(timeout)
    servers = set([server for (server, port, instance) in hosts])
    if len(servers) < settings.REPLICATION_FACTOR:
      raise Exception("REPLICATION_FACTOR=%d cannot exceed servers=%d" % (
        settings.REPLICATION_FACTOR, len(servers)))

    self.hash_ring = ConsistentHashRing(
      self.hosts, hash_type=settings.CARBONLINK_HASHING_TYPE)
    self.keyfunc = load_keyfunc()
    self.connections = {}
    self.last_failure = {}
    # Create a connection pool for each host
    for host in self.hosts:
      self.connections[host] = set()

  def select_host(self, metric):
    "Returns the carbon host that has data for the given metric"
    key = self.keyfunc(metric)
    nodes = []
    servers = set()
    for node in self.hash_ring.get_nodes(key):
      (server, instance) = node
      if server in servers:
        continue
      servers.add(server)
      nodes.append(node)
      if len(servers) >= settings.REPLICATION_FACTOR:
        break

    available = [ n for n in nodes if self.is_available(n) ]
    return random.choice(available or nodes)

  def is_available(self, host):
    now = time.time()
    last_fail = self.last_failure.get(host, 0)
    return (now - last_fail) < settings.CARBONLINK_RETRY_DELAY

  def get_connection(self, host):
    # First try to take one out of the pool for this host
    (server, instance) = host
    port = self.ports[host]
    connectionPool = self.connections[host]
    try:
      return connectionPool.pop()
    except KeyError:
      pass #nothing left in the pool, gotta make a new connection

    log.cache("CarbonLink creating a new socket for %s" % str(host))
    connection = socket.socket()
    connection.settimeout(self.timeout)
    try:
      connection.connect((server, port))
    except:
      self.last_failure[host] = time.time()
      raise
    else:
      connection.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
      return connection

  def query(self, metric):
    request = dict(type='cache-query', metric=metric)
    results = self.send_request(request)
    log.cache("CarbonLink cache-query request for %s returned %d datapoints" % (
      metric, len(results['datapoints'])))
    return results['datapoints']

  def get_metadata(self, metric, key):
    request = dict(type='get-metadata', metric=metric, key=key)
    results = self.send_request(request)
    log.cache("CarbonLink get-metadata request received for %s:%s" % (metric, key))
    return results['value']

  def set_metadata(self, metric, key, value):
    request = dict(type='set-metadata', metric=metric, key=key, value=value)
    results = self.send_request(request)
    log.cache("CarbonLink set-metadata request received for %s:%s" % (metric, key))
    return results

  def send_request(self, request):
    metric = request['metric']
    serialized_request = pickle.dumps(request, protocol=-1)
    len_prefix = struct.pack("!L", len(serialized_request))
    request_packet = len_prefix + serialized_request
    result = {}
    result.setdefault('datapoints', [])

    if metric.startswith(settings.CARBON_METRIC_PREFIX):
      return self.send_request_to_all(request)

    if not self.hosts:
      log.cache("CarbonLink is not connected to any host. Returning empty nodes list")
      return result

    host = self.select_host(metric)
    conn = self.get_connection(host)
    log.cache("CarbonLink sending request for %s to %s" % (metric, str(host)))
    try:
      conn.sendall(request_packet)
      result = self.recv_response(conn)
    except Exception as e:
      self.last_failure[host] = time.time()
      log.cache("Exception getting data from cache %s: %s" % (str(host), e))
    else:
      self.connections[host].add(conn)
      if 'error' in result:
        log.cache("Error getting data from cache: %s" % result['error'])
        raise CarbonLinkRequestError(result['error'])
      log.cache("CarbonLink finished receiving %s from %s" % (str(metric), str(host)))
    return result

  def send_request_to_all(self, request):
    metric = request['metric']
    serialized_request = pickle.dumps(request, protocol=-1)
    len_prefix = struct.pack("!L", len(serialized_request))
    request_packet = len_prefix + serialized_request
    results = {}
    results.setdefault('datapoints', {})

    for host in self.hosts:
      conn = self.get_connection(host)
      log.cache("CarbonLink sending request for %s to %s" % (metric, str(host)))
      try:
        conn.sendall(request_packet)
        result = self.recv_response(conn)
      except Exception as e:
        self.last_failure[host] = time.time()
        log.cache("Exception getting data from cache %s: %s" % (str(host), e))
      else:
        self.connections[host].add(conn)
        if 'error' in result:
          log.cache("Error getting data from cache %s: %s" % (str(host), result['error']))
        else:
          if len(result['datapoints']) > 1:
              results['datapoints'].update(result['datapoints'])
      log.cache("CarbonLink finished receiving %s from %s" % (str(metric), str(host)))
    return results

  def recv_response(self, conn):
    len_prefix = self.recv_exactly(conn, 4)
    body_size = struct.unpack("!L", len_prefix)[0]
    body = self.recv_exactly(conn, body_size)
    return unpickle.loads(body)

  @staticmethod
  def recv_exactly(conn, num_bytes):
    buf = b''
    while len(buf) < num_bytes:
      data = conn.recv(num_bytes - len(buf))
      if not data:
        raise Exception("Connection lost")
      buf += data

    return buf


@ThreadSafeSingleton
class GlobalCarbonLinkPool(CarbonLinkPool):
  def __init__(self):
    hosts = []
    for host in settings.CARBONLINK_HOSTS:
      parts = host.split(':')
      server = parts[0]
      port = int(parts[1])
      if len(parts) > 2:
        instance = parts[2]
      else:
        instance = None
      hosts.append((server, int(port), instance))
    timeout = settings.CARBONLINK_TIMEOUT
    CarbonLinkPool.__init__(self, hosts, timeout)


def CarbonLink():
  """Handy accessor for the global singleton."""
  return GlobalCarbonLinkPool.instance()
