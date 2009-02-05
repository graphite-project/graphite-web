"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

import os, re
try:
  import cPickle as pickle
except ImportError:
  import pickle
from ConfigParser import SafeConfigParser


class Schema:
  def __init__(self, name, priority, test, archives):
    self.name = name
    self.priority = int(priority)
    self.test = test
    self.archives = archives

  def matches(self, metric):
    return bool( self.test(metric) )


class Archive:
  def __init__(self,secondsPerPoint,points):
    self.secondsPerPoint = int( secondsPerPoint )
    self.points = int( points )

  def getTuple(self):
    return (self.secondsPerPoint,self.points)

  @staticmethod
  def fromString(string):
    secondsPerPoint,points = string.strip().split(':',1)
    return Archive(secondsPerPoint,points)


def loadStorageSchemas():
  schemaList = []
  config = SafeConfigParser()
  config.read('../storage/schemas')
  for section in config.sections():
    options = dict( config.items(section) )
    priority = int( options['priority'] )
    pattern = options.get('pattern')
    listName = options.get('list')
    if pattern:
      regex = re.compile(pattern)
      test = lambda metric, regex=regex: regex.search(metric)
    elif listName:
      test = listTest(listName)
    else:
      print 'Error, schema "%s" has no pattern or list parameter configured' % section
    retentions = options['retentions'].split(',')
    archives = [ Archive.fromString(s) for s in retentions ]
    mySchema = Schema(section, priority, test, archives)
    schemaList.append( mySchema )
  schemaList.sort(key=lambda s: s.priority,reverse=True)
  schemaList.append( defaultSchema )
  return schemaList

def listTest(name):
  path = '../storage/lists/%s' % name
  state = {}
  if os.path.exists(path):
    state['mtime'] = os.stat(path).st_mtime
    fh = open(path, 'rb')
    state['members'] = pickle.load(fh)
    fh.close()
  else:
    state['mtime'] = 0
    state['members'] = frozenset()

  def test(metric):
    if os.path.exists(path):
      mtime = os.stat(path).st_mtime
      if mtime > state['mtime']:
        print 'Reloading %s' % path
        state['mtime'] = mtime
        fh = open(path, 'rb')
        state['members'] = pickle.load(fh)
        fh.close()
    return metric in state['members']

  return test

defaultArchive = Archive(60, 60 * 24 * 7) #default retention for unclassified data (7 days of minutely data)
regex = re.compile('.*')
test = lambda metric: regex.search(metric)
defaultSchema = Schema('default', -1, test, [defaultArchive])
