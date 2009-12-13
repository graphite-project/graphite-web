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
from carbon.conf import OrderedConfigParser, Settings, settings

try:
  import cPickle as pickle
except ImportError:
  import pickle


STORAGE_SCHEMAS_CONFIG = 'conf/storage-schemas.conf'
STORAGE_LISTS_DIR = 'storage/lists'


def getFilesystemPath(metric):
  return join(settings.LOCAL_DATA_DIR, metric.replace('.','/')) + '.wsp'


class Schema:
  def test(self, metric):
    raise NotImplementedError()

  def matches(self, metric):
    return bool( self.test(metric) )


class DefaultSchema(Schema):
  def __init__(self, name, archives):
    self.name = name
    self.archives = archives

  def test(self, metric):
    return True


class PatternSchema(Schema):
  def __init__(self, name, pattern, archives):
    self.name = name
    self.pattern = pattern
    self.regex = re.compile(pattern)
    self.archives = archives

  def test(self, metric):
    return self.regex.search(metric)


class ListSchema(Schema):
  def __init__(self, name, listName, archives):
    self.name = name
    self.listName = listName
    self.archives = archives
    self.path = join(WHITELISTS_DIR, listName)

    if exists(self.path):
      self.mtime = os.stat(self.path).st_mtime
      fh = open(self.path, 'rb')
      self.members = pickle.load(fh)
      fh.close()

    else:
      self.mtime = 0
      self.members = frozenset()

  def test(self, metric):
    if exists(self.path):
      current_mtime = os.stat(self.path).st_mtime

      if current_mtime > self.mtime:
        self.mtime = current_mtime
        fh = open(self.path, 'rb')
        self.members = pickle.load(fh)
        fh.close()

    return metric in self.members



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
  config = OrderedConfigParser()
  config.read(STORAGE_SCHEMAS_CONFIG)

  for section in config.sections():
    options = dict( config.items(section) )
    matchAll = options.get('match-all')
    pattern = options.get('pattern')
    listName = options.get('list')

    retentions = options['retentions'].split(',')
    archives = [ Archive.fromString(s) for s in retentions ]

    if matchAll:
      mySchema = DefaultSchema(section, archives)

    elif pattern:
      mySchema = PatternSchema(section, pattern, archives)

    elif listName:
      mySchema = ListSchema(section, listName, archives)

    else:
      raise ValueError('schema "%s" has no pattern or list parameter configured' % section)

    schemaList.append( mySchema )

  schemaList.append( defaultSchema )
  return schemaList


defaultArchive = Archive(60, 60 * 24 * 7) #default retention for unclassified data (7 days of minutely data)
defaultSchema = DefaultSchema('default', [defaultArchive])
