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
from logging.handlers import NullHandler
from django.conf import settings

logging.addLevelName(30,"rendering")
logging.addLevelName(30,"cache")
logging.addLevelName(30,"metric_access")

class GraphiteLogger:
  def __init__(self):
    self.infoLogger = self._config_logger('info.log',
                                          'info',
                                          True,
                                          level = logging.INFO,
                                          )
    self.exceptionLogger = self._config_logger('exception.log',
                                               'exception',
                                               True,
                                               )
    #Setup log files
    self.cacheLogFile = os.path.join(settings.LOG_DIR,"cache.log")
    self.renderingLogFile = os.path.join(settings.LOG_DIR,"rendering.log")
    self.metricAccessLogFile = os.path.join(settings.LOG_DIR,"metricaccess.log")
    #Setup loggers
    self.cacheLogger = logging.getLogger("cache")
    self.renderingLogger = logging.getLogger("rendering")
    self.metricAccessLogger = logging.getLogger("metric_access")
    #Setup formatter & handlers
    self.formatter = logging.Formatter("%(asctime)s :: %(message)s","%a %b %d %H:%M:%S %Y")
    if settings.LOG_CACHE_PERFORMANCE:
      self.cacheHandler = Rotater(self.cacheLogFile,when="midnight",backupCount=1)
      self.cacheHandler.setFormatter(self.formatter)
      self.cacheLogger.addHandler(self.cacheHandler)
    else:
      self.cacheLogger.addHandler(NullHandler())
    if settings.LOG_RENDERING_PERFORMANCE:
      self.renderingHandler = Rotater(self.renderingLogFile,when="midnight",backupCount=1)
      self.renderingHandler.setFormatter(self.formatter)
      self.renderingLogger.addHandler(self.renderingHandler)
    else:
      self.renderingHandler.addHandler(NullHandler())
    if settings.LOG_METRIC_ACCESS:
      self.metricAccessHandler = Rotater(self.metricAccessLogFile,when="midnight",backupCount=1)
      self.metricAccessHandler.setFormatter(self.formatter)
      self.metricAccessLogger.addHandler(self.metricAccessHandler)
    else:
      self.metricAccessHandler.addHandler(NullHandler())

  @staticmethod
  def _config_logger(log_file_name, name, activate,
                     level=None, when=midnight, backupCount=1):
    log_file = os.path.join(settings.LOG_DIR, log_file_name)
    logger = logging.getLogger(name)
    if level is not None:
        logger.setLevel(level)
    if activate:
        formatter = logging.Formatter("%(asctime)s :: %(message)s","%a %b %d %H:%M:%S %Y")
        handler = Rotater(log_file, when=when, backupCount=backupCount)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    else:
        logger.addHandler(NullHandler())
    return logger

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
