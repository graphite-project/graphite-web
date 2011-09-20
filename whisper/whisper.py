#!/usr/bin/env python
# Copyright 2008 Orbitz WorldWide
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
#
# This module is an implementation of the Whisper database API
# Here is the basic layout of a whisper data file
#
# File = Header,Data
#	Header = Metadata,ArchiveInfo+
#		Metadata = aggregationType,maxRetention,xFilesFactor,archiveCount
#		ArchiveInfo = Offset,SecondsPerPoint,Points
#	Data = Archive+
#		Archive = Point+
#			Point = timestamp,value

import os, struct, time

try:
  import fcntl
  CAN_LOCK = True
except ImportError:
  CAN_LOCK = False

LOCK = False
CACHE_HEADERS = False
AUTOFLUSH = False
__headerCache = {}

longFormat = "!L"
longSize = struct.calcsize(longFormat)
floatFormat = "!f"
floatSize = struct.calcsize(floatFormat)
valueFormat = "!d"
valueSize = struct.calcsize(valueFormat)
pointFormat = "!Ld"
pointSize = struct.calcsize(pointFormat)
metadataFormat = "!2LfL"
metadataSize = struct.calcsize(metadataFormat)
archiveInfoFormat = "!3L"
archiveInfoSize = struct.calcsize(archiveInfoFormat)

aggregationTypeToMethod = dict({
  1: 'average',
  2: 'sum',
  3: 'last',
  4: 'max',
  5: 'min'
})
aggregationMethodToType = dict([[v,k] for k,v in aggregationTypeToMethod.items()])
aggregationMethods = aggregationTypeToMethod.values()

debug = startBlock = endBlock = lambda *a,**k: None

UnitMultipliers = {
  's' : 1,
  'm' : 60,
  'h' : 60 * 60,
  'd' : 60 * 60 * 24,
  'y' : 60 * 60 * 24 * 365,
}


def parseRetentionDef(retentionDef):
  (precision, points) = retentionDef.strip().split(':')

  if precision.isdigit():
    precisionUnit = 's'
    precision = int(precision)
  else:
    precisionUnit = precision[-1]
    precision = int( precision[:-1] )

  if points.isdigit():
    pointsUnit = None
    points = int(points)
  else:
    pointsUnit = points[-1]
    points = int( points[:-1] )

  if precisionUnit not in UnitMultipliers:
    raise ValueError("Invalid unit: '%s'" % precisionUnit)

  if pointsUnit not in UnitMultipliers and pointsUnit is not None:
    raise ValueError("Invalid unit: '%s'" % pointsUnit)

  precision = precision * UnitMultipliers[precisionUnit]

  if pointsUnit:
    points = points * UnitMultipliers[pointsUnit] / precision

  return (precision, points)

class WhisperException(Exception):
    """Base class for whisper exceptions."""


class InvalidConfiguration(WhisperException):
    """Invalid configuration."""


class InvalidAggregationMethod(WhisperException):
    """Invalid aggregation method."""


class InvalidTimeInterval(WhisperException):
    """Invalid time interval."""


class TimestampNotCovered(WhisperException):
    """Timestamp not covered by any archives in this database."""

class CorruptWhisperFile(WhisperException):
  def __init__(self, error, path):
    Exception.__init__(self, error)
    self.error = error
    self.path = path

  def __repr__(self):
    return "<CorruptWhisperFile[%s] %s>" % (self.path, self.error)

  def __str__(self):
    return "%s (%s)" % (self.error, self.path)

def enableDebug():
  global open, debug, startBlock, endBlock
  class open(file):
    def __init__(self,*args,**kwargs):
      file.__init__(self,*args,**kwargs)
      self.writeCount = 0
      self.readCount = 0

    def write(self,data):
      self.writeCount += 1
      debug('WRITE %d bytes #%d' % (len(data),self.writeCount))
      return file.write(self,data)

    def read(self,bytes):
      self.readCount += 1
      debug('READ %d bytes #%d' % (bytes,self.readCount))
      return file.read(self,bytes)

  def debug(message):
    print 'DEBUG :: %s' % message

  __timingBlocks = {}

  def startBlock(name):
    __timingBlocks[name] = time.time()

  def endBlock(name):
    debug("%s took %.5f seconds" % (name,time.time() - __timingBlocks.pop(name)))


def __readHeader(fh):
  info = __headerCache.get(fh.name)
  if info:
    return info

  originalOffset = fh.tell()
  fh.seek(0)
  packedMetadata = fh.read(metadataSize)

  try:
    (aggregationType,maxRetention,xff,archiveCount) = struct.unpack(metadataFormat,packedMetadata)
  except:
    raise CorruptWhisperFile("Unable to read header", fh.name)

  archives = []

  for i in xrange(archiveCount):
    packedArchiveInfo = fh.read(archiveInfoSize)
    try:
      (offset,secondsPerPoint,points) = struct.unpack(archiveInfoFormat,packedArchiveInfo)
    except:
      raise CorruptWhisperFile("Unable to read archive %d metadata" % i, fh.name)

    archiveInfo = {
      'offset' : offset,
      'secondsPerPoint' : secondsPerPoint,
      'points' : points,
      'retention' : secondsPerPoint * points,
      'size' : points * pointSize,
    }
    archives.append(archiveInfo)

  fh.seek(originalOffset)
  info = {
    'aggregationMethod' : aggregationTypeToMethod.get(aggregationType, 'average'),
    'maxRetention' : maxRetention,
    'xFilesFactor' : xff,
    'archives' : archives,
  }
  if CACHE_HEADERS:
    __headerCache[fh.name] = info

  return info


def setAggregationMethod(path, aggregationMethod):
  """setAggregationMethod(path,aggregationMethod)

path is a string
aggregationMethod specifies the method to use when propogating data (see ``whisper.aggregationMethods``)
"""
  fh = open(path,'r+b')
  if LOCK:
    fcntl.flock( fh.fileno(), fcntl.LOCK_EX )

  packedMetadata = fh.read(metadataSize)

  try:
    (aggregationType,maxRetention,xff,archiveCount) = struct.unpack(metadataFormat,packedMetadata)
  except:
    raise CorruptWhisperFile("Unable to read header", fh.name)

  try:
    newAggregationType = struct.pack( longFormat, aggregationMethodToType[aggregationMethod] )
  except KeyError:
    raise InvalidAggregationMethod("Unrecognized aggregation method: %s" %
          aggregationMethod)

  fh.seek(0)
  fh.write(newAggregationType)

  if AUTOFLUSH:
    fh.flush()
    os.fsync(fh.fileno())

  if CACHE_HEADERS and fh.name in __headerCache:
    del __headerCache[fh.name]

  fh.close()

  return aggregationTypeToMethod.get(aggregationType, 'average')


def validateArchiveList(archiveList):
  """ Validates an archiveList.
  An ArchiveList must:
  1. Have at least one archive config. Example: (60, 86400) 
  2. No archive may be a duplicate of another. 
  3. Higher precision archives' precision must evenly divide all lower precision archives' precision.
  4. Lower precision archives must cover larger time intervals than higher precision archives.

  Returns True or False
  """

  try:
    if not archiveList:
      raise InvalidConfiguration("You must specify at least one archive configuration!")

    archiveList.sort(key=lambda a: a[0]) #sort by precision (secondsPerPoint)

    for i,archive in enumerate(archiveList):
      if i == len(archiveList) - 1:
        break

      next = archiveList[i+1]
      if not (archive[0] < next[0]):
        raise InvalidConfiguration("You cannot configure two archives "
          "with the same precision %s,%s" % (archive,next))

      if (next[0] % archive[0]) != 0:
        raise InvalidConfiguration("Higher precision archives' precision "
          "must evenly divide all lower precision archives' precision %s,%s" \
          % (archive[0],next[0]))

      retention = archive[0] * archive[1]
      nextRetention = next[0] * next[1]

      if not (nextRetention > retention):
        raise InvalidConfiguration("Lower precision archives must cover "
          "larger time intervals than higher precision archives %s,%s" \
          % (archive,next))
  
  except:
    return False
  return True

def create(path,archiveList,xFilesFactor=None,aggregationMethod=None):
  """create(path,archiveList,xFilesFactor=0.5,aggregationMethod='average')

path is a string
archiveList is a list of archives, each of which is of the form (secondsPerPoint,numberOfPoints)
xFilesFactor specifies the fraction of data points in a propagation interval that must have known values for a propagation to occur
aggregationMethod specifies the function to use when propogating data (see ``whisper.aggregationMethods``)
"""
  # Set default params
  if xFilesFactor is None:
    xFilesFactor = 0.5
  if aggregationMethod is None:
    aggregationMethod = 'average'

  #Validate archive configurations...
  validArchive = validateArchiveList(archiveList)
  if not validArchive:
    raise InvalidConfiguration("There was a problem creating %s due to an invalid schema config." % path) 

  #Looks good, now we create the file and write the header
  if os.path.exists(path):
    raise InvalidConfiguration("File %s already exists!" % path)

  fh = open(path,'wb')
  if LOCK:
    fcntl.flock( fh.fileno(), fcntl.LOCK_EX )

  aggregationType = struct.pack( longFormat, aggregationMethodToType.get(aggregationMethod, 1) )
  oldest = sorted([secondsPerPoint * points for secondsPerPoint,points in archiveList])[-1]
  maxRetention = struct.pack( longFormat, oldest )
  xFilesFactor = struct.pack( floatFormat, float(xFilesFactor) )
  archiveCount = struct.pack(longFormat, len(archiveList))
  packedMetadata = aggregationType + maxRetention + xFilesFactor + archiveCount
  fh.write(packedMetadata)
  headerSize = metadataSize + (archiveInfoSize * len(archiveList))
  archiveOffsetPointer = headerSize

  for secondsPerPoint,points in archiveList:
    archiveInfo = struct.pack(archiveInfoFormat, archiveOffsetPointer, secondsPerPoint, points)
    fh.write(archiveInfo)
    archiveOffsetPointer += (points * pointSize)

  zeroes = '\x00' * (archiveOffsetPointer - headerSize)
  fh.write(zeroes)

  if AUTOFLUSH:
    fh.flush()
    os.fsync(fh.fileno())

  fh.close()

def __aggregate(aggregationMethod, knownValues):
  if aggregationMethod == 'average':
    return float(sum(knownValues)) / float(len(knownValues))
  elif aggregationMethod == 'sum':
    return float(sum(knownValues))
  elif aggregationMethod == 'last':
    return knownValues[len(knownValues)-1]
  elif aggregationMethod == 'max':
    return max(knownValues)
  elif aggregationMethod == 'min':
    return min(knownValues)
  else:
    raise InvalidAggregationMethod("Unrecognized aggregation method %s" %
            aggregationMethod)


def __propagate(fh,header,timestamp,higher,lower):
  aggregationMethod = header['aggregationMethod']
  xff = header['xFilesFactor']

  lowerIntervalStart = timestamp - (timestamp % lower['secondsPerPoint'])
  lowerIntervalEnd = lowerIntervalStart + lower['secondsPerPoint']

  fh.seek(higher['offset'])
  packedPoint = fh.read(pointSize)
  (higherBaseInterval,higherBaseValue) = struct.unpack(pointFormat,packedPoint)

  if higherBaseInterval == 0:
    higherFirstOffset = higher['offset']
  else:
    timeDistance = lowerIntervalStart - higherBaseInterval
    pointDistance = timeDistance / higher['secondsPerPoint']
    byteDistance = pointDistance * pointSize
    higherFirstOffset = higher['offset'] + (byteDistance % higher['size'])

  higherPoints = lower['secondsPerPoint'] / higher['secondsPerPoint']
  higherSize = higherPoints * pointSize
  relativeFirstOffset = higherFirstOffset - higher['offset']
  relativeLastOffset = (relativeFirstOffset + higherSize) % higher['size']
  higherLastOffset = relativeLastOffset + higher['offset']
  fh.seek(higherFirstOffset)

  if higherFirstOffset < higherLastOffset: #we don't wrap the archive
    seriesString = fh.read(higherLastOffset - higherFirstOffset)
  else: #We do wrap the archive
    higherEnd = higher['offset'] + higher['size']
    seriesString = fh.read(higherEnd - higherFirstOffset)
    fh.seek(higher['offset'])
    seriesString += fh.read(higherLastOffset - higher['offset'])

  #Now we unpack the series data we just read
  byteOrder,pointTypes = pointFormat[0],pointFormat[1:]
  points = len(seriesString) / pointSize
  seriesFormat = byteOrder + (pointTypes * points)
  unpackedSeries = struct.unpack(seriesFormat, seriesString)

  #And finally we construct a list of values
  neighborValues = [None] * points
  currentInterval = lowerIntervalStart
  step = higher['secondsPerPoint']

  for i in xrange(0,len(unpackedSeries),2):
    pointTime = unpackedSeries[i]
    if pointTime == currentInterval:
      neighborValues[i/2] = unpackedSeries[i+1]
    currentInterval += step

  #Propagate aggregateValue to propagate from neighborValues if we have enough known points
  knownValues = [v for v in neighborValues if v is not None]
  if not knownValues:
    return False

  knownPercent = float(len(knownValues)) / float(len(neighborValues))
  if knownPercent >= xff: #we have enough data to propagate a value!
    aggregateValue = __aggregate(aggregationMethod, knownValues)
    myPackedPoint = struct.pack(pointFormat,lowerIntervalStart,aggregateValue)
    fh.seek(lower['offset'])
    packedPoint = fh.read(pointSize)
    (lowerBaseInterval,lowerBaseValue) = struct.unpack(pointFormat,packedPoint)

    if lowerBaseInterval == 0: #First propagated update to this lower archive
      fh.seek(lower['offset'])
      fh.write(myPackedPoint)
    else: #Not our first propagated update to this lower archive
      timeDistance = lowerIntervalStart - lowerBaseInterval
      pointDistance = timeDistance / lower['secondsPerPoint']
      byteDistance = pointDistance * pointSize
      lowerOffset = lower['offset'] + (byteDistance % lower['size'])
      fh.seek(lowerOffset)
      fh.write(myPackedPoint)

    return True

  else:
    return False


def update(path,value,timestamp=None):
  """update(path,value,timestamp=None)

path is a string
value is a float
timestamp is either an int or float
"""
  value = float(value)
  fh = open(path,'r+b')
  return file_update(fh, value, timestamp)


def file_update(fh, value, timestamp):
  if LOCK:
    fcntl.flock( fh.fileno(), fcntl.LOCK_EX )

  header = __readHeader(fh)
  now = int( time.time() )
  if timestamp is None:
    timestamp = now

  timestamp = int(timestamp)
  diff = now - timestamp
  if not ((diff < header['maxRetention']) and diff >= 0):
    raise TimestampNotCovered("Timestamp not covered by any archives in "
      "this database.")

  for i,archive in enumerate(header['archives']): #Find the highest-precision archive that covers timestamp
    if archive['retention'] < diff: continue
    lowerArchives = header['archives'][i+1:] #We'll pass on the update to these lower precision archives later
    break

  #First we update the highest-precision archive
  myInterval = timestamp - (timestamp % archive['secondsPerPoint'])
  myPackedPoint = struct.pack(pointFormat,myInterval,value)
  fh.seek(archive['offset'])
  packedPoint = fh.read(pointSize)
  (baseInterval,baseValue) = struct.unpack(pointFormat,packedPoint)

  if baseInterval == 0: #This file's first update
    fh.seek(archive['offset'])
    fh.write(myPackedPoint)
    baseInterval,baseValue = myInterval,value
  else: #Not our first update
    timeDistance = myInterval - baseInterval
    pointDistance = timeDistance / archive['secondsPerPoint']
    byteDistance = pointDistance * pointSize
    myOffset = archive['offset'] + (byteDistance % archive['size'])
    fh.seek(myOffset)
    fh.write(myPackedPoint)

  #Now we propagate the update to lower-precision archives
  higher = archive
  for lower in lowerArchives:
    if not __propagate(fh, header, myInterval, higher, lower):
      break
    higher = lower

  if AUTOFLUSH:
    fh.flush()
    os.fsync(fh.fileno())

  fh.close()


def update_many(path,points):
  """update_many(path,points)

path is a string
points is a list of (timestamp,value) points
"""
  if not points: return
  points = [ (int(t),float(v)) for (t,v) in points]
  points.sort(key=lambda p: p[0],reverse=True) #order points by timestamp, newest first
  fh = open(path,'r+b')
  return file_update_many(fh, points)


def file_update_many(fh, points):
  if LOCK:
    fcntl.flock( fh.fileno(), fcntl.LOCK_EX )

  header = __readHeader(fh)
  now = int( time.time() )
  archives = iter( header['archives'] )
  currentArchive = archives.next()
  currentPoints = []

  for point in points:
    age = now - point[0]

    while currentArchive['retention'] < age: #we can't fit any more points in this archive
      if currentPoints: #commit all the points we've found that it can fit
        currentPoints.reverse() #put points in chronological order
        __archive_update_many(fh,header,currentArchive,currentPoints)
        currentPoints = []
      try:
        currentArchive = archives.next()
      except StopIteration:
        currentArchive = None
        break

    if not currentArchive:
      break #drop remaining points that don't fit in the database

    currentPoints.append(point)

  if currentArchive and currentPoints: #don't forget to commit after we've checked all the archives
    currentPoints.reverse()
    __archive_update_many(fh,header,currentArchive,currentPoints)

  if AUTOFLUSH:
    fh.flush()
    os.fsync(fh.fileno())

  fh.close()


def __archive_update_many(fh,header,archive,points):
  step = archive['secondsPerPoint']
  alignedPoints = [ (timestamp - (timestamp % step), value)
                    for (timestamp,value) in points ]
  #Create a packed string for each contiguous sequence of points
  packedStrings = []
  previousInterval = None
  currentString = ""
  for (interval,value) in alignedPoints:
    if (not previousInterval) or (interval == previousInterval + step):
      currentString += struct.pack(pointFormat,interval,value)
      previousInterval = interval
    else:
      numberOfPoints = len(currentString) / pointSize
      startInterval = previousInterval - (step * (numberOfPoints-1))
      packedStrings.append( (startInterval,currentString) )
      currentString = struct.pack(pointFormat,interval,value)
      previousInterval = interval
  if currentString:
    numberOfPoints = len(currentString) / pointSize
    startInterval = previousInterval - (step * (numberOfPoints-1))
    packedStrings.append( (startInterval,currentString) )

  #Read base point and determine where our writes will start
  fh.seek(archive['offset'])
  packedBasePoint = fh.read(pointSize)
  (baseInterval,baseValue) = struct.unpack(pointFormat,packedBasePoint)
  if baseInterval == 0: #This file's first update
    baseInterval = packedStrings[0][0] #use our first string as the base, so we start at the start

  #Write all of our packed strings in locations determined by the baseInterval
  for (interval,packedString) in packedStrings:
    timeDistance = interval - baseInterval
    pointDistance = timeDistance / step
    byteDistance = pointDistance * pointSize
    myOffset = archive['offset'] + (byteDistance % archive['size'])
    fh.seek(myOffset)
    archiveEnd = archive['offset'] + archive['size']
    bytesBeyond = (myOffset + len(packedString)) - archiveEnd

    if bytesBeyond > 0:
      fh.write( packedString[:-bytesBeyond] )
      assert fh.tell() == archiveEnd, "archiveEnd=%d fh.tell=%d bytesBeyond=%d len(packedString)=%d" % (archiveEnd,fh.tell(),bytesBeyond,len(packedString))
      fh.seek( archive['offset'] )
      fh.write( packedString[-bytesBeyond:] ) #safe because it can't exceed the archive (retention checking logic above)
    else:
      fh.write(packedString)

  #Now we propagate the updates to lower-precision archives
  higher = archive
  lowerArchives = [arc for arc in header['archives'] if arc['secondsPerPoint'] > archive['secondsPerPoint']]

  for lower in lowerArchives:
    fit = lambda i: i - (i % lower['secondsPerPoint'])
    lowerIntervals = [fit(p[0]) for p in alignedPoints]
    uniqueLowerIntervals = set(lowerIntervals)
    propagateFurther = False
    for interval in uniqueLowerIntervals:
      if __propagate(fh, header, interval, higher, lower):
        propagateFurther = True

    if not propagateFurther:
      break
    higher = lower


def info(path):
  """info(path)

path is a string
"""
  fh = open(path,'rb')
  info = __readHeader(fh)
  fh.close()
  return info


def fetch(path,fromTime,untilTime=None):
  """fetch(path,fromTime,untilTime=None)

path is a string
fromTime is an epoch time
untilTime is also an epoch time, but defaults to now
"""
  fh = open(path,'rb')
  return file_fetch(fh, fromTime, untilTime)


def file_fetch(fh, fromTime, untilTime):
  header = __readHeader(fh)
  now = int( time.time() )
  if untilTime is None:
    untilTime = now
  fromTime = int(fromTime)
  untilTime = int(untilTime)

  oldestTime = now - header['maxRetention']
  if fromTime < oldestTime:
    fromTime = oldestTime

  if not (fromTime < untilTime):
    raise InvalidTimeInterval("Invalid time interval")
  if untilTime > now:
    untilTime = now
  if untilTime < fromTime:
    untilTime = now

  diff = now - fromTime
  for archive in header['archives']:
    if archive['retention'] >= diff:
      break

  fromInterval = int( fromTime - (fromTime % archive['secondsPerPoint']) ) + archive['secondsPerPoint']
  untilInterval = int( untilTime - (untilTime % archive['secondsPerPoint']) ) + archive['secondsPerPoint']
  fh.seek(archive['offset'])
  packedPoint = fh.read(pointSize)
  (baseInterval,baseValue) = struct.unpack(pointFormat,packedPoint)

  if baseInterval == 0:
    step = archive['secondsPerPoint']
    points = (untilInterval - fromInterval) / step
    timeInfo = (fromInterval,untilInterval,step)
    valueList = [None] * points
    return (timeInfo,valueList)

  #Determine fromOffset
  timeDistance = fromInterval - baseInterval
  pointDistance = timeDistance / archive['secondsPerPoint']
  byteDistance = pointDistance * pointSize
  fromOffset = archive['offset'] + (byteDistance % archive['size'])

  #Determine untilOffset
  timeDistance = untilInterval - baseInterval
  pointDistance = timeDistance / archive['secondsPerPoint']
  byteDistance = pointDistance * pointSize
  untilOffset = archive['offset'] + (byteDistance % archive['size'])

  #Read all the points in the interval
  fh.seek(fromOffset)
  if fromOffset < untilOffset: #If we don't wrap around the archive
    seriesString = fh.read(untilOffset - fromOffset)
  else: #We do wrap around the archive, so we need two reads
    archiveEnd = archive['offset'] + archive['size']
    seriesString = fh.read(archiveEnd - fromOffset)
    fh.seek(archive['offset'])
    seriesString += fh.read(untilOffset - archive['offset'])

  #Now we unpack the series data we just read (anything faster than unpack?)
  byteOrder,pointTypes = pointFormat[0],pointFormat[1:]
  points = len(seriesString) / pointSize
  seriesFormat = byteOrder + (pointTypes * points)
  unpackedSeries = struct.unpack(seriesFormat, seriesString)

  #And finally we construct a list of values (optimize this!)
  valueList = [None] * points #pre-allocate entire list for speed
  currentInterval = fromInterval
  step = archive['secondsPerPoint']

  for i in xrange(0,len(unpackedSeries),2):
    pointTime = unpackedSeries[i]
    if pointTime == currentInterval:
      pointValue = unpackedSeries[i+1]
      valueList[i/2] = pointValue #in-place reassignment is faster than append()
    currentInterval += step

  fh.close()
  timeInfo = (fromInterval,untilInterval,step)
  return (timeInfo,valueList)
