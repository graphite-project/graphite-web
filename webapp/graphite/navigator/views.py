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

  def check(self):
    if getmtime(settings.NAVIGATOR_CONF) > self.last_read:
      self.load()

  def load(self):
    schemes = []
    parser = ConfigParser()
    parser.read(settings.NAVIGATOR_CONF)

    for section in parser.sections():
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
  }
  return render_to_response("navigator.html", context)
