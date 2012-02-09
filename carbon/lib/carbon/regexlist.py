import time
import re
import os.path
from carbon import log
from twisted.internet.task import LoopingCall


class RegexList:
  """ Maintain a list of regex for matching whitelist and blacklist """

  def __init__(self):
    self.regex_list = []
    self.list_file = None
    self.read_task = LoopingCall(self.read_list)
    self.rules_last_read = 0.0

  def read_from(self, list_file):
    self.list_file = list_file
    self.read_list()
    self.read_task.start(10, now=False)

  def read_list(self):
    # Clear rules and move on if file isn't there
    if not os.path.exists(self.list_file):
      self.regex_list = []
      return

    try:
      mtime = os.path.getmtime(self.list_file)
    except:
      log.err("Failed to get mtime of %s" % self.list_file)
      return

    if mtime <= self.rules_last_read:
      return

    # Begin read
    new_regex_list = []
    for line in open(self.list_file):
      pattern = line.strip()
      if line.startswith('#') or not line:
        continue
      try:
        new_regex_list.append(re.compile(pattern))
      except:
        log.err("Failed to parse '%s' in '%s'. Ignoring line" % (pattern, self.list_file))

    self.regex_list = new_regex_list
    self.rules_last_read = mtime

  def __contains__(self, value):
    for regex in self.regex_list:
      if regex.search(value):
        return True
    return False

  def __nonzero__(self):
    return bool(self.regex_list)


WhiteList = RegexList()
BlackList = RegexList()
