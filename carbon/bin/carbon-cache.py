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
from os.path import dirname, join, abspath

# Figure out where we're installed
BIN_DIR = dirname(abspath(__file__))
ROOT_DIR = dirname(BIN_DIR)

# Make sure that carbon's 'lib' dir is in the $PYTHONPATH if we're running from
# source.
LIB_DIR = join(ROOT_DIR, 'lib')
sys.path.insert(0, LIB_DIR)

if __name__ == "__main__":
    # If we were run directly, call ourselves as a tac file instead.
    from carbon.util import run_tac

    run_tac(__file__)

# Initialize twisted
try:
  from twisted.internet import epollreactor
  epollreactor.install()
except:
  pass

from twisted.application.service import Application
from carbon import service

application = Application("carbon-cache")

cache_service = service.createCacheService(None)
cache_service.setServiceParent(application)
