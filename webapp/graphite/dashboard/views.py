import re
from os.path import getmtime
from ConfigParser import ConfigParser
from django.shortcuts import render_to_response
from django.http import HttpResponse
from django.conf import settings
from graphite.util import json
from graphite.dashboard.models import Dashboard


fieldRegex = re.compile(r'<([^>]+)>')


class DashboardConfig:
  def __init__(self):
    self.last_read = 0
    self.schemes = []
    self.ui_config = {}

  def check(self):
    if getmtime(settings.DASHBOARD_CONF) > self.last_read:
      self.load()

  def load(self):
    schemes = []
    parser = ConfigParser()
    parser.read(settings.DASHBOARD_CONF)

    self.ui_config['default_graph_width'] = parser.getint('ui', 'default_graph_width')
    self.ui_config['default_graph_height'] = parser.getint('ui', 'default_graph_height')
    self.ui_config['automatic_variants'] = parser.getboolean('ui', 'automatic_variants')
    self.ui_config['refresh_interval'] = parser.getint('ui', 'refresh_interval')

    for section in parser.sections():
      if section == 'ui':
        continue

      scheme = parser.get(section, 'scheme')
      fields = []

      for match in fieldRegex.finditer(scheme):
        field = match.group(1)
        if parser.has_option(section, '%s.label' % field):
          label = parser.get(section, '%s.label' % field)
        else:
          label = field

        fields.append({
          'name' : field,
          'label' : label
        })

      schemes.append({
        'name' : section,
        'pattern' : scheme,
        'fields' : fields,
      })

    self.schemes = schemes


config = DashboardConfig()


def dashboard(request, name=None):
  config.check()
  context = {
    'schemes_json' : json.dumps(config.schemes),
    'ui_config_json' : json.dumps(config.ui_config),
    'jsdebug' : settings.JAVASCRIPT_DEBUG,
  }

  if name is not None:
    try:
      dashboard = Dashboard.objects.get(name=name)
    except Dashboard.DoesNotExist:
      context['initialError'] = "Dashboard '%s' does not exist." % name
    else:
      context['initialState'] = dashboard.state

  return render_to_response("dashboard.html", context)


def save(request, name):
  # Deserialize and reserialize as a validation step
  state = str( json.dumps( json.loads( request.POST['state'] ) ) )

  try:
    dashboard = Dashboard.objects.get(name=name)
  except Dashboard.DoesNotExist:
    dashboard = Dashboard.objects.create(name=name, state=state)
  else:
    dashboard.state = state
    dashboard.save();

  return json_response( dict(success=True) )


def load(request, name):
  try:
    dashboard = Dashboard.objects.get(name=name)
  except Dashboard.DoesNotExist:
    return json_response( dict(error="Dashboard '%s' does not exist. " % name) )

  return json_response( dict(state=json.loads(dashboard.state)) )


def delete(request, name):
  try:
    dashboard = Dashboard.objects.get(name=name)
  except Dashboard.DoesNotExist:
    return json_response( dict(error="Dashboard '%s' does not exist. " % name) )
  else:
    dashboard.delete()
    return json_response( dict(success=True) )


def find(request):
  query = request.REQUEST['query']
  query_terms = set( query.lower().split() )
  results = []

  # Find all dashboard names that contain each of our query terms as a substring
  for dashboard in Dashboard.objects.all():
    name = dashboard.name.lower()
    found = True # blank queries return everything
    for term in query_terms:
      if term in name:
        found = True
      else:
        found = False
        break

    if found:
      results.append( dict(name=dashboard.name) )

  return json_response( dict(dashboards=results) )


def json_response(obj):
  return HttpResponse(mimetype='text/json', content=json.dumps(obj))
