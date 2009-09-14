"""Copyright 2009 Chris Davis

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
from os.path import join, exists
from ConfigParser import ConfigParser
from carbon.conf import Settings, settings
from carbon.util import OrderedDict

try:
  import cPickle as pickle
except ImportError:
  import pickle


STORAGE_SCHEMAS_CONFIG = 'conf/storage-schemas.conf'
STORAGE_LISTS_DIR = 'storage/lists'


def getFilesystemPath(metric):
  return join(settings.LOCAL_DATA_DIR, metric.replace('.','/')) + '.wsp'


class Schema:
  def __init__(self, name, test, archives):
    self.name = name
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
  config = ConfigParser(dict_type=OrderedDict)
  config.read(STORAGE_SCHEMAS_CONFIG)

  for section in config.sections():
    options = dict( config.items(section) )
    pattern = options.get('pattern')
    listName = options.get('list')

    if pattern:
      regex = re.compile(pattern)
      test = lambda metric, regex=regex: regex.search(metric)

    elif listName:
      test = listTest(listName)

    else:
      raise ValueError('schema "%s" has no pattern or list parameter configured' % section)

    retentions = options['retentions'].split(',')
    archives = [ Archive.fromString(s) for s in retentions ]
    mySchema = Schema(section, test, archives)
    schemaList.append( mySchema )

  schemaList.append( defaultSchema )
  return schemaList


def listTest(name):
  path = join(WHITELISTS_DIR, name)
  state = {}

  if exists(path):
    state['mtime'] = os.stat(path).st_mtime
    fh = open(path, 'rb')
    state['members'] = pickle.load(fh)
    fh.close()

  else:
    state['mtime'] = 0
    state['members'] = frozenset()

  def test(metric):
    if exists(path):
      mtime = os.stat(path).st_mtime
      if mtime > state['mtime']:
        state['mtime'] = mtime
        fh = open(path, 'rb')
        state['members'] = pickle.load(fh)
        fh.close()

    return metric in state['members']

  return test


defaultArchive = Archive(60, 60 * 24 * 7) #default retention for unclassified data (7 days of minutely data)
defaultSchema = Schema(name='default', test=lambda m: True, archives=[defaultArchive])
