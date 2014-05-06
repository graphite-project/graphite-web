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

import os, sys, logging
try:
    from logging import NullHandler
except ImportError as ie:  # py2.6
    from logging import Handler

    class NullHandler(Handler):

        def emit(self, record):
            pass

logging.EXCEPTION = 60
logging.addLevelName(logging.EXCEPTION,"EXCEPTION")

logging.CACHE = 70
logging.addLevelName(logging.CACHE,"CACHE")

# TO-DO: removed unused code
class GraphiteLogger:
    def __init__(self):
        self.infoLogger = self._config_logger('info.log',
                                              'info',
                                              level = logging.INFO,
                                              )
        self.exceptionLogger = self._config_logger('exception.log',
                                                   'EXCEPTION',
                                                   )
        self.cacheLogger = self._config_logger('cache.log',
                                               'CACHE',
                                               )

    @staticmethod
    def _config_logger(log_file_name, name, level=None):
        logger = logging.getLogger(name)
        if level is not None:
            logger.setLevel(level)
        logger.addHandler(NullHandler())
        return logger

    def info(self,msg,*args,**kwargs):
        return self.infoLogger.info(msg,*args,**kwargs)

    def exception(self,msg="Exception Caught",**kwargs):
        return self.exceptionLogger.exception(msg,**kwargs)

    def cache(self,msg,*args,**kwargs):
        return self.cacheLogger.log(logging.CACHE,msg,*args,**kwargs)


log = GraphiteLogger() # import-shared logger instance
