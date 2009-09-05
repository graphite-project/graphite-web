from twisted.python.log import startLoggingWithObserver, DailyLogFile, textFromEventDict, msg


customLogs = ('cache', 'writer', 'listener')


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
    print formatEvent(event, includeType=True)

  startLoggingWithObserver(logEvent)


def logToDir(logDir):
  consoleLogFile = DailyLogFile('console.log', logDir)
  customLogFiles = {}

  for name in customLogs:
    customLogFiles[name] = DailyLogFile('%s.log' % name, logDir)

  def observer(event):
    message = formatEvent(event)
    type = event.get('type')
    logfile = customLogFiles.get(type, consoleLogFile)
    logfile.write(message + '\n')

  startLoggingWithObserver(logEvent)


def cache(message, **context):
  context['type'] = 'cache'
  msg(message, **context)


def writer(message, **context):
  context['type'] = 'writer'
  msg(message, **context)


def listener(message, **context):
  context['type'] = 'listener'
  msg(message, **context)
