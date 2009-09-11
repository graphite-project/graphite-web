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


class Settings(dict):
  __getattr__ = dict.__getitem__

  def readFrom(self, path, section):
    self.clear()

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
