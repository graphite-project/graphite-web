import traceback
import whisper
from carbon import log
from carbon.storage import getFilesystemPath



def getMetadata(metric, key):
  if key != 'aggregationMethod':
    return dict(error="Unsupported metadata key \"%s\"" % key)

  wsp_path = getFilesystemPath(metric)
  try:
    value = whisper.info(wsp_path)['aggregationMethod']
    return dict(value=value)
  except:
    log.err()
    return dict(error=traceback.format_exc())


def setMetadata(metric, key, value):
  if key != 'aggregationMethod':
    return dict(error="Unsupported metadata key \"%s\"" % key)

  wsp_path = getFilesystemPath(metric)
  try:
    old_value = whisper.setAggregationMethod(wsp_path, value)
    return dict(old_value=old_value, new_value=value)
  except:
    log.err()
    return dict(error=traceback.format_exc())
