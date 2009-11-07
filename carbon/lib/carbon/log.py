import time
from sys import stdout, stderr
from twisted.python.log import startLoggingWithObserver, textFromEventDict, msg, err
from twisted.python.logfile import DailyLogFile


def formatEvent(event, includeType=False):
  message = textFromEventDict(event)

  timestamp = time.strftime("%d/%m/%Y %H:%M:%S")

  if includeType:
    typeTag = '[%s] ' % event.get('type', 'console')
  else:
    typeTag = ''

  return "%s :: %s%s" % (timestamp, typeTag, message)


def logToStdout():

  def observer(event):
    stdout.write( formatEvent(event, includeType=True) + '\n' )
    stdout.flush()

  startLoggingWithObserver(observer)


def logToDir(logDir):
  consoleLogFile = DailyLogFile('console.log', logDir)
  customLogs = {}

  def observer(event):
    message = formatEvent(event)
    logType = event.get('type')

    if logType is not None and logType not in customLogs:
      customLogs[logType] = DailyLogFile(logType + '.log', logDir)

    logfile = customLogs.get(logType, consoleLogFile)
    logfile.write(message + '\n')
    logfile.flush()

  startLoggingWithObserver(observer)


def cache(message, **context):
  context['type'] = 'cache'
  msg(message, **context)

def creates(message, **context):
  context['type'] = 'creates'
  msg(message, **context)

def updates(message, **context):
  context['type'] = 'updates'
  msg(message, **context)

def listener(message, **context):
  context['type'] = 'listener'
  msg(message, **context)

def relay(message, **context):
  context['type'] = 'relay'
  msg(message, **context)

def query(message, **context):
  context['type'] = 'query'
  msg(message, **context)
