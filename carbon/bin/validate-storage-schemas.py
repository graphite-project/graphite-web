#!/usr/bin/python
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

import sys
from os.path import dirname, join, abspath, realpath
import traceback

BIN_DIR = dirname(abspath(__file__))
ROOT_DIR = realpath( dirname(BIN_DIR) )
LIB_DIR = join(ROOT_DIR, 'lib')
sys.path.insert(0, LIB_DIR)

import carbon
from carbon.conf import settings
settings['CONF_DIR'] = realpath(join(dirname(__file__), '..', 'conf'))
from carbon.storage import loadStorageSchemas
from ConfigParser import ConfigParser

config_parser = ConfigParser()
if not config_parser.read(join(settings['CONF_DIR'], 'storage-schemas.conf')):
  print "Error: Couldn't read config file: %s" % str(join(settings['CONF_DIR'], 'storage-schemas.conf'))
  sys.exit(1)

sections = []
sections = config_parser.sections()

validSchemas = []
try:
  validSchemas = carbon.storage.loadStorageSchemas()
except:
  traceback.print_exc()
  print 
  print "There is a severe syntax error in the config file."
  print "Please review the documentation or the example config file provided."
  print
  print

  sys.exit(1)

validSections = []
validSections = [ i.name for i in validSchemas ] 
validSections = validSections[:-1] 

invalidSections = []
invalidSections = set(sections) - set(validSections) 

print
if invalidSections:
 print "Errors found in the following sections of storage-schemas.conf:"
 print
 for i in invalidSections:
   print i
else:
  print "No problems found." 

print
print
