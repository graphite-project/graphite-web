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
try:
    from logging import NullHandler
except ImportError as ie:  # py2.6
    from logging import Handler

    class NullHandler(Handler):

        def emit(self, record):
            pass
try:
    from logging import FileHandler, StreamHandler
except ImportError as ie:  # py2.6
    from logging.handlers import FileHandler, StreamHandler
from django.conf import settings


class GraphiteLogger:
  def __init__(self):
    self.infoLogger = self._config_logger(
        settings.LOG_FILE_INFO,
        'info',
        True,
        level = logging.DEBUG if settings.DEBUG else logging.INFO,
    )
    self.exceptionLogger = self._config_logger(
        settings.LOG_FILE_EXCEPTION,
        'exception',
        True,
    )
    self.cacheLogger = self._config_logger(
        settings.LOG_FILE_CACHE,
        'cache',
        settings.LOG_CACHE_PERFORMANCE,
        level = logging.DEBUG if settings.DEBUG else logging.INFO,
    )
    self.renderingLogger = self._config_logger(
        settings.LOG_FILE_RENDERING,
        'rendering',
        settings.LOG_RENDERING_PERFORMANCE,
        level = logging.DEBUG if settings.DEBUG else logging.INFO,
    )

  @staticmethod
  def _config_logger(log_file_name, name, activate,
                     level=None, when='midnight',
                     backupCount=settings.LOG_ROTATION_COUNT):
    logger = logging.getLogger(name)
    if level is not None:
        logger.setLevel(level)
    if activate:  # if want to log this one
        if log_file_name == '-':
            formatter = logging.Formatter(
                fmt='[%(asctime)s.%(msecs)03d] %(name)s %(levelname)s %(message)s',
                datefmt='%d/%b/%Y %H:%M:%S')
            handler = StreamHandler()
        else:
            formatter = logging.Formatter(
                fmt='%(asctime)s.%(msecs)03d :: %(message)s',
                datefmt='%Y-%m-%d,%H:%M:%S')
            log_file = os.path.join(settings.LOG_DIR, log_file_name)
            if settings.LOG_ROTATION:  # if we want to rotate logs
                handler = Rotater(log_file, when=when, backupCount=backupCount)
            else:  # let someone else, e.g. logrotate, rotate the logs
                handler = FileHandler(log_file)
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    else:
        logger.addHandler(NullHandler())
    return logger

  def info(self,msg,*args,**kwargs):
    return self.infoLogger.info(msg,*args,**kwargs)

  def debug(self,msg,*args,**kwargs):
    return self.infoLogger.debug(msg,*args,**kwargs)

  def warning(self,msg,*args,**kwargs):
    return self.infoLogger.warn(msg,*args,**kwargs)

  def exception(self,msg="Exception Caught",**kwargs):
    return self.exceptionLogger.exception(msg,**kwargs)

  def cache(self,msg,*args,**kwargs):
    return self.cacheLogger.info(msg,*args,**kwargs)

  def rendering(self,msg,*args,**kwargs):
    return self.renderingLogger.info(msg,*args,**kwargs)


log = GraphiteLogger() # import-shared logger instance
