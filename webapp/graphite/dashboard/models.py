from django.db import models
from graphite.account.models import Profile
from graphite.util import json
import six

class Dashboard(models.Model):
  name = models.CharField(primary_key=True, max_length=128)
  owners = models.ManyToManyField(Profile, related_name='dashboards')
  state = models.TextField()
  __str__ = lambda self: "Dashboard [%s]" % self.name

class Template(models.Model):

  class Admin: pass
  name = models.CharField(primary_key=True, max_length=128)
  owners = models.ManyToManyField(Profile, related_name='templates')
  state = models.TextField()
  __str__ = lambda self: "Template [%s]" % self.name

  def loadState(self, val):
    return self.state.replace('__VALUE__', val)

  def setState(self, state, key):
    #XXX Might not need this
    def replace_string(s):
      if isinstance(s, six.text_type):
        s = s.replace(key, '__VALUE__')
      return s

    def update_graph(graph):
      graph_opts = graph[1]
      graph_opts['target'] = [replace_string(s) for s in graph_opts['target']]
      return [replace_string(graph[0]),
              graph_opts,
              replace_string(graph[2])]

    # Parse JSON here and replace first five elements of target with __VALUE__
    parsed_state = json.loads(state)
    for i, graph in enumerate(parsed_state['graphs']):
      parsed_state['graphs'][i] = update_graph(graph)
    self.state = json.dumps(parsed_state)
