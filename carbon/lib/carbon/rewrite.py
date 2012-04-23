import time
import re
from os.path import exists, getmtime
from twisted.internet.task import LoopingCall
from carbon import log


class RewriteRuleManager:
  def __init__(self):
    self.preRules = []
    self.postRules = []
    self.read_task = LoopingCall(self.read_rules)
    self.rules_last_read = 0.0

  def clear(self):
    self.preRules = []
    self.postRules = []

  def read_from(self, rules_file):
    self.rules_file = rules_file
    self.read_rules()
    self.read_task.start(10, now=False)

  def read_rules(self):
    if not exists(self.rules_file):
      self.clear()
      return

    # Only read if the rules file has been modified
    try:
      mtime = getmtime(self.rules_file)
    except:
      log.err("Failed to get mtime of %s" % self.rules_file)
      return
    if mtime <= self.rules_last_read:
      return

    pre = []
    post = []

    section = None
    for line in open(self.rules_file):
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
    self.rules_last_read = mtime


class RewriteRule:
  def __init__(self, pattern, replacement):
    self.pattern = pattern
    self.replacement = replacement
    self.regex = re.compile(pattern)

  def apply(self, metric):
    return self.regex.sub(self.replacement, metric)


# Ghetto singleton
RewriteRuleManager = RewriteRuleManager()
