import re
import json
from os.path import getmtime
from ConfigParser import ConfigParser
from django.shortcuts import render_to_response
from django.conf import settings


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


def dashboard(request):
  config.check()
  context = {
    'schemes_json' : json.dumps(config.schemes),
    'ui_config_json' : json.dumps(config.ui_config),
    'jsdebug' : settings.JAVASCRIPT_DEBUG,
  }
  return render_to_response("dashboard.html", context)
