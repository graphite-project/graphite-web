#!/usr/bin/env python
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
import whisper
from os.path import dirname, exists, join, realpath
from ConfigParser import ConfigParser

if len(sys.argv) == 2:
  SCHEMAS_FILE = sys.argv[1]
  print "Loading storage-schemas configuration from: '%s'" % SCHEMAS_FILE
else:
  SCHEMAS_FILE = realpath(join(dirname(__file__), '..', 'conf', 'storage-schemas.conf'))
  print "Loading storage-schemas configuration from default location at: '%s'" % SCHEMAS_FILE

config_parser = ConfigParser()
if not config_parser.read(SCHEMAS_FILE):
  print "Error: Couldn't read config file: %s" % SCHEMAS_FILE
  sys.exit(1)

errors_found = 0

for section in config_parser.sections():
  print "Section '%s':" % section
  options = dict(config_parser.items(section))
  retentions = options['retentions'].split(',')

  archives = []
  section_failed = False
  for retention in retentions:
    try:
      archives.append(whisper.parseRetentionDef(retention))
    except ValueError, e:
      print "  - Error: Section '%s' contains an invalid item in its retention definition ('%s')" % \
        (section, retention)
      print "    %s" % e.message
      section_failed = True

  if not section_failed:
    try:
      whisper.validateArchiveList(archives)
    except whisper.InvalidConfiguration, e:
      print "  - Error: Section '%s' contains an invalid retention definition ('%s')" % \
        (section, ','.join(retentions))
      print "    %s" % e.message

  if section_failed:
    errors_found += 1
  else:
    print "  OK"

if errors_found:
  print
  print "Storage-schemas configuration '%s' failed validation" % SCHEMAS_FILE
  sys.exit(1)

print
print "Storage-schemas configuration '%s' is valid" % SCHEMAS_FILE
