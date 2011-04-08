import re


class RewriteRuleManager:
  def __init__(self):
    self.preRules = []
    self.postRules = []

  def read_from(self, path):
    pre = []
    post = []

    section = None
    for line in open(path):
      line = line.strip()
      if line.startswith('#') or not line:
        continue

      if line.startswith('[') and line.endswith(']'):
        section = line[1:-1].lower()

      else:
        pattern, replacement = line.split('=', 1)
        pattern, replacement = pattern.strip(), replacement.strip()
        rule = RewriteRule(pattern, replacement)

        if section == 'pre':
          pre.append(rule)
        elif section == 'post':
          post.append(rule)

    self.preRules = pre
    self.postRules = post


class RewriteRule:
  def __init__(self, pattern, replacement):
    self.pattern = pattern
    self.replacement = replacement
    self.regex = re.compile(pattern)

  def apply(self, metric):
    return self.regex.sub(self.replacement, metric)


# Ghetto singleton
RewriteRuleManager = RewriteRuleManager()
