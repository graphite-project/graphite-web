import whisper
from carbon.storage import getFilesystemPath



def getMetadata(metric, key):
  if key != 'aggregationMethod':
    raise ValueError("Unsupported metadata key \"%s\"" % key)
  wsp_path = getFilesystemPath(metric)
  return whisper.info(wsp_path)['aggregationMethod']


def setMetadata(metric, key, value):
  if key != 'aggregationMethod':
    raise ValueError("Unsupported metadata key \"%s\"" % key)
  wsp_path = getFilesystemPath(metric)
  whisper.setAggregationMethod(wsp_path, value)
