import re
from carbon.conf import OrderedConfigParser
from carbon.util import parseDestinations


class RelayRule:
  def __init__(self, condition, destinations):
    self.condition = condition
    self.destinations = destinations

  def matches(self, metric):
    return bool( self.condition(metric) )


def loadRelayRules(path):
  rules = []
  parser = OrderedConfigParser()

  if not parser.read(path):
    raise Exception("Could not read rules file %s" % path)

  defaultRule = None
  for section in parser.sections():
    if not parser.has_option(section, 'destinations'):
      raise ValueError("Rules file %s section %s does not define a "
                       "'destinations' list" % (path, section))

    destination_strings = parser.get(section, 'destinations').split(',')
    destinations = parseDestinations(destination_strings)

    if parser.has_option(section, 'pattern'):
      if parser.has_option(section, 'default'):
        raise Exception("Section %s contains both 'pattern' and "
                        "'default'. You must use one or the other." % section)
      pattern = parser.get(section, 'pattern')
      regex = re.compile(pattern, re.I)
      rule = RelayRule(condition=regex.search, destinations=destinations)
      rules.append(rule)
      continue

    if parser.has_option(section, 'default'):
      if not parser.getboolean(section, 'default'):
        continue # just ignore default = false
      if defaultRule:
        raise Exception("Two default rules? Seriously?")
      defaultRule = RelayRule(condition=lambda metric: True,
                              destinations=destinations)

  if not defaultRule:
    raise Exception("No default rule defined. You must specify exactly one "
                    "rule with 'default = true' instead of a pattern.")

  rules.append(defaultRule)
  return rules
