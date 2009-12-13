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

from ConfigParser import ConfigParser


defaults = dict(
  LOCAL_DATA_DIR="/opt/graphite/storage/whisper/",
  USER="",
  CREATION_DELAY=1.0,
  MAX_CACHE_SIZE='inf',
  MAX_UPDATES_PER_SECOND=1000,
  MAX_CREATES_PER_MINUTE='inf',
  LINE_RECEIVER_INTERFACE='0.0.0.0',
  LINE_RECEIVER_PORT=2003,
  PICKLE_RECEIVER_INTERFACE='0.0.0.0',
  PICKLE_RECEIVER_PORT=2004,
  CACHE_QUERY_INTERFACE='0.0.0.0',
  CACHE_QUERY_PORT=7002,
)


class OrderedConfigParser(ConfigParser):
  """Hacky workaround to ensure sections are always returned in the order
   they are defined in. Note that this does *not* make any guarantees about
   the order of options within a section or the order in which sections get
   written back to disk on write()."""
  _ordered_sections = []

  def read(self, path):
    result = ConfigParser.read(self, path)

    sections = []
    for line in open(path):
      line = line.strip()

      if line.startswith('[') and line.endswith(']'):
        sections.append( line[1:-1] )

    self._ordered_sections = sections

    return result

  def sections(self):
    return list( self._ordered_sections ) # return a copy for safety


class Settings(dict):
  __getattr__ = dict.__getitem__

  def readFrom(self, path, section):
    self.clear()
    self.update(defaults)

    parser = ConfigParser()
    assert parser.read(path), "Failed to read config file %s" % path

    for key,value in parser.items(section):
      try:
        value = int(value)
      except:
        try:
          value = float(value)
        except:
          pass

      self[ key.upper() ] = value


settings = Settings()
settings.update(defaults)
