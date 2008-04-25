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

import re
from ConfigParser import SafeConfigParser


class Schema:
  def __init__(self,name,priority,pattern,archives):
    self.name = name
    self.priority = int(priority)
    self.pattern = pattern
    self.regex = re.compile(pattern)
    self.archives = archives

  def matches(self,string):
    return bool( self.regex.search(string) )


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
    pattern = options['pattern']
    retentions = options['retentions'].split(',')
    archives = [ Archive.fromString(s) for s in retentions ]
    mySchema = Schema(section, priority, pattern, archives)
    schemaList.append( mySchema )
  schemaList.sort(key=lambda s: s.priority,reverse=True)
  schemaList.append( defaultSchema )
  return schemaList

defaultArchive = Archive(60,120) #2 hours retention for unclassified data
defaultSchema = Schema('default', -1, '.*', [defaultArchive])
