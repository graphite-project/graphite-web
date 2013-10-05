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

import os, logging
from logging.handlers import TimedRotatingFileHandler as Rotater
from django.conf import settings

logging.addLevelName(30,"rendering")
logging.addLevelName(30,"cache")
logging.addLevelName(30,"metric_access")

class NullHandler(logging.Handler):
  """
  A log handler that does nothing. Part of logging.Handlers in python 2.7,
  but defined here for  python 2.6 compatibility.
  """
  def emit(self, record):
    pass

class GraphiteLogger:
  def __init__(self):
    self.nullHandler = NullHandler()
    #Setup loggers
    self.infoLogger = logging.getLogger("info")
    self.exceptionLogger = logging.getLogger("exception")
    self.cacheLogger = logging.getLogger("cache")
    if not self.cacheLogger.handlers:
        self.cacheLogger.addHandler(self.nullHandler)
    self.renderingLogger = logging.getLogger("rendering")
    if not self.renderingLogger.handlers:
        self.renderingLogger.addHandler(self.nullHandler)
    self.metricAccessLogger = logging.getLogger("metric_access")
    if not self.metricAccessLogger.handlers:
        self.metricAccessLogger.addHandler(self.nullHandler)

  def info(self,msg,*args,**kwargs):
    return self.infoLogger.info(msg,*args,**kwargs)

  def exception(self,msg="Exception Caught",**kwargs):
    return self.exceptionLogger.exception(msg,**kwargs)

  def cache(self,msg,*args,**kwargs):
    return self.cacheLogger.log(30,msg,*args,**kwargs)

  def rendering(self,msg,*args,**kwargs):
    return self.renderingLogger.log(30,msg,*args,**kwargs)

  def metric_access(self,msg,*args,**kwargs):
    return self.metricAccessLogger.log(30,msg,*args,**kwargs)


log = GraphiteLogger() # import-shared logger instance
