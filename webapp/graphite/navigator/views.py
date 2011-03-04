import re
import json
from os.path import getmtime
from ConfigParser import ConfigParser
from django.shortcuts import render_to_response
from django.conf import settings


fieldRegex = re.compile(r'<([^>]+)>')


class NavigatorConfig:
  def __init__(self):
    self.last_read = 0
    self.schemes = []
    self.default_params = {}

  def check(self):
    if getmtime(settings.NAVIGATOR_CONF) > self.last_read:
      self.load()

  def load(self):
    schemes = []
    parser = ConfigParser()
    parser.read(settings.NAVIGATOR_CONF)

    #XXX parse [ui] section

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


config = NavigatorConfig()


def navigator(request):
  config.check()
  context = {
    'schemes_json' : json.dumps(config.schemes),
    'default_params_json' : json.dumps(config.default_params),
    'jsdebug' : settings.JAVASCRIPT_DEBUG,
  }
  return render_to_response("navigator.html", context)
