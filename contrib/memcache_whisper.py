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
#		Metadata = lastUpdate,maxRetention,xFilesFactor,archiveCount
#		ArchiveInfo = Offset,SecondsPerPoint,Points
#	Data = Archive+
#		Archive = Point+
#			Point = timestamp,value

"""
NOTE: This is a modified version of whisper.py
For details on the modification, read https://bugs.launchpad.net/graphite/+bug/245835
"""

import os, struct, time
try:
  import fcntl
  CAN_LOCK = True
except ImportError:
  CAN_LOCK = False

LOCK = False
CACHE_HEADERS = False
__headerCache = {}

longFormat = "!L"
longSize = struct.calcsize(longFormat)
floatFormat = "!f"
floatSize = struct.calcsize(floatFormat)
timestampFormat = "!L"
timestampSize = struct.calcsize(timestampFormat)
valueFormat = "!d"
valueSize = struct.calcsize(valueFormat)
pointFormat = "!Ld"
pointSize = struct.calcsize(pointFormat)
metadataFormat = "!2LfL"
metadataSize = struct.calcsize(metadataFormat)
archiveInfoFormat = "!3L"
archiveInfoSize = struct.calcsize(archiveInfoFormat)

debug = startBlock = endBlock = lambda *a,**k: None

def exists(path):
  return os.path.exists(path)

def drop(path):
  os.remove(path)

def enableMemcache(servers = ['127.0.0.1:11211'], min_compress_len = 0):
  from StringIO import StringIO
  import memcache
  global open, exists, drop

  MC = memcache.Client(servers)

  class open(StringIO):
    def __init__(self,*args,**kwargs):
      self.name = args[0]
      self.mode = args[1]
      if self.mode == "r+b" or self.mode == "rb":
        StringIO.__init__(self, MC.get(self.name))
      else:
        StringIO.__init__(self)

    def close(self):
      if self.mode == "r+b" or self.mode == "wb":
        MC.set(self.name, self.getvalue(), min_compress_len = min_compress_len)
      StringIO.close(self)
      
  def exists(path):
    return MC.get(path) != None

  def drop(path):
    MC.delete(path)

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
    print('DEBUG :: %s' % message)

  __timingBlocks = {}

  def startBlock(name):
    __timingBlocks[name] = time.time()

  def endBlock(name):
    debug("%s took %.5f seconds" % (name,time.time() - __timingBlocks.pop(name)))


def __readHeader(fh):
  info = __headerCache.get(fh.name)
  if info: return info
  #startBlock('__readHeader')
  originalOffset = fh.tell()
  fh.seek(0)
  packedMetadata = fh.read(metadataSize)
  (lastUpdate,maxRetention,xff,archiveCount) = struct.unpack(metadataFormat,packedMetadata)
  archives = []
  for i in xrange(archiveCount):
    packedArchiveInfo = fh.read(archiveInfoSize)
    (offset,secondsPerPoint,points) = struct.unpack(archiveInfoFormat,packedArchiveInfo)
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
    'lastUpdate' : lastUpdate,
    'maxRetention' : maxRetention,
    'xFilesFactor' : xff,
    'archives' : archives,
  }
  if CACHE_HEADERS:
    __headerCache[fh.name] = info
  #endBlock('__readHeader')
  return info


def __changeLastUpdate(fh):
  return #XXX Make this a NOP, use os.stat(filename).st_mtime instead
  startBlock('__changeLastUpdate()')
  originalOffset = fh.tell()
  fh.seek(0) #Based on assumption that first field is lastUpdate
  now = int( time.time() )
  packedTime = struct.pack(timestampFormat,now)
  fh.write(packedTime)
  fh.seek(originalOffset)
  endBlock('__changeLastUpdate()')


def create(path,archiveList,xFilesFactor=0.5):
  """create(path,archiveList,xFilesFactor=0.5)

path is a string
archiveList is a list of archives, each of which is of the form (secondsPerPoint,numberOfPoints)
xFilesFactor specifies the fraction of data points in a propagation interval that must have known values for a propagation to occur
"""
  #Validate archive configurations...
  assert archiveList, "You must specify at least one archive configuration!"
  archiveList.sort(key=lambda a: a[0]) #sort by precision (secondsPerPoint)
  for i,archive in enumerate(archiveList):
    if i == len(archiveList) - 1: break
    next = archiveList[i+1]
    assert archive[0] < next[0],\
    "You cannot configure two archives with the same precision %s,%s" % (archive,next)
    assert (next[0] % archive[0]) == 0,\
    "Higher precision archives' precision must evenly divide all lower precision archives' precision %s,%s" % (archive[0],next[0])
    retention = archive[0] * archive[1]
    nextRetention = next[0] * next[1]
    assert nextRetention > retention,\
    "Lower precision archives must cover larger time intervals than higher precision archives %s,%s" % (archive,next)
  #Looks good, now we create the file and write the header
  assert not exists(path), "File %s already exists!" % path
  fh = open(path,'wb')
  if LOCK: fcntl.flock( fh.fileno(), fcntl.LOCK_EX )
  lastUpdate = struct.pack( timestampFormat, int(time.time()) )
  oldest = sorted([secondsPerPoint * points for secondsPerPoint,points in archiveList])[-1]
  maxRetention = struct.pack( longFormat, oldest )
  xFilesFactor = struct.pack( floatFormat, float(xFilesFactor) )
  archiveCount = struct.pack(longFormat, len(archiveList))
  packedMetadata = lastUpdate + maxRetention + xFilesFactor + archiveCount
  fh.write(packedMetadata)
  headerSize = metadataSize + (archiveInfoSize * len(archiveList))
  archiveOffsetPointer = headerSize
  for secondsPerPoint,points in archiveList:
    archiveInfo = struct.pack(archiveInfoFormat, archiveOffsetPointer, secondsPerPoint, points)
    fh.write(archiveInfo)
    archiveOffsetPointer += (points * pointSize)
  zeroes = '\x00' * (archiveOffsetPointer - headerSize)
  fh.write(zeroes)
  fh.close()


def __propagate(fh,timestamp,xff,higher,lower):
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
  higherLastOffset = higherFirstOffset + (higherSize % higher['size'])
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
  knownPercent = float(len(knownValues)) / float(len(neighborValues))
  if knownPercent >= xff: #we have enough data to propagate a value!
    aggregateValue = float(sum(knownValues)) / float(len(knownValues)) #TODO another CF besides average?
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
  #startBlock('complete update')
  value = float(value)
  fh = open(path,'r+b')
  if LOCK: fcntl.flock( fh.fileno(), fcntl.LOCK_EX )
  header = __readHeader(fh)
  now = int( time.time() )
  if timestamp is None: timestamp = now
  timestamp = int(timestamp)
  diff = now - timestamp
  assert diff < header['maxRetention'] and diff >= 0, "Timestamp not covered by any archives in this database"
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
  #startBlock('update propagation')
  higher = archive
  for lower in lowerArchives:
    if not __propagate(fh,myInterval,header['xFilesFactor'],higher,lower): break
    higher = lower
  #endBlock('update propagation')
  __changeLastUpdate(fh)
  fh.close()
  #endBlock('complete update')


def update_many(path,points):
  """update_many(path,points)

path is a string
points is a list of (timestamp,value) points
"""
  #startBlock('complete update_many path=%s points=%d' % (path,len(points)))
  if not points: return
  points = [ (int(t),float(v)) for (t,v) in points]
  points.sort(key=lambda p: p[0],reverse=True) #order points by timestamp, newest first
  fh = open(path,'r+b')
  if LOCK: fcntl.flock( fh.fileno(), fcntl.LOCK_EX )
  header = __readHeader(fh)
  now = int( time.time() )
  archives = iter( header['archives'] )
  currentArchive = next(archives)
  #debug('  update_many currentArchive=%s' % str(currentArchive))
  currentPoints = []
  for point in points:
    age = now - point[0]
    #debug('  update_many iterating points, point=%s age=%d' % (str(point),age))
    while currentArchive['retention'] < age: #we can't fit any more points in this archive
      #debug('  update_many this point is too old to fit here, currentPoints=%d' % len(currentPoints))
      if currentPoints: #commit all the points we've found that it can fit
        currentPoints.reverse() #put points in chronological order
        __archive_update_many(fh,header,currentArchive,currentPoints)
        currentPoints = []
      try:
        currentArchive = next(archives)
        #debug('  update_many using next archive %s' % str(currentArchive))
      except StopIteration:
        #debug('  update_many no more archives!')
        currentArchive = None
        break
    if not currentArchive: break #drop remaining points that don't fit in the database
    #debug('  update_many adding point=%s' % str(point))
    currentPoints.append(point)
  #debug('  update_many done iterating points')
  if currentArchive and currentPoints: #don't forget to commit after we've checked all the archives
    currentPoints.reverse()
    __archive_update_many(fh,header,currentArchive,currentPoints)
  __changeLastUpdate(fh)
  fh.close()
  #endBlock('complete update_many path=%s points=%d' % (path,len(points)))


def __archive_update_many(fh,header,archive,points):
  step = archive['secondsPerPoint']
  #startBlock('__archive_update_many file=%s archive=%s points=%d' % (fh.name,step,len(points)))
  alignedPoints = [ (timestamp - (timestamp % step), value)
                    for (timestamp,value) in points ]
  #Create a packed string for each contiguous sequence of points
  #startBlock('__archive_update_many string packing')
  packedStrings = []
  previousInterval = None
  currentString = ""
  for (interval,value) in alignedPoints:
    #debug('__archive_update_many  iterating alignedPoint at %s' % interval)
    if (not previousInterval) or (interval == previousInterval + step):
      #debug('__archive_update_many  was expected, packing onto currentString')
      currentString += struct.pack(pointFormat,interval,value)
      previousInterval = interval
    else:
      numberOfPoints = len(currentString) / pointSize
      startInterval = previousInterval - (step * (numberOfPoints-1))
      #debug('__archive_update_many  was NOT expected, appending to packedStrings startInterval=%s currentString=%d bytes' % (startInterval,len(currentString)))
      packedStrings.append( (startInterval,currentString) )
      currentString = struct.pack(pointFormat,interval,value)
      previousInterval = interval
  if currentString:
    #startInterval = previousInterval - (step * len(currentString) / pointSize) + step
    numberOfPoints = len(currentString) / pointSize
    startInterval = previousInterval - (step * (numberOfPoints-1))
    #debug('__archive_update_many  done iterating alignedPoints, remainder currentString of %d bytes, startInterval=%s' % (len(currentString),startInterval))
    packedStrings.append( (startInterval,currentString) )
  #endBlock('__archive_update_many string packing')

  #Read base point and determine where our writes will start
  fh.seek(archive['offset'])
  packedBasePoint = fh.read(pointSize)
  (baseInterval,baseValue) = struct.unpack(pointFormat,packedBasePoint)
  if baseInterval == 0: #This file's first update
    #debug('__archive_update_many  first update')
    baseInterval = packedStrings[0][0] #use our first string as the base, so we start at the start
  #debug('__archive_update_many  baseInterval is %s' % baseInterval)

  #Write all of our packed strings in locations determined by the baseInterval
  #startBlock('__archive_update_many write() operations')
  for (interval,packedString) in packedStrings:
    timeDistance = interval - baseInterval
    pointDistance = timeDistance / step
    byteDistance = pointDistance * pointSize
    myOffset = archive['offset'] + (byteDistance % archive['size'])
    fh.seek(myOffset)
    archiveEnd = archive['offset'] + archive['size']
    bytesBeyond = (myOffset + len(packedString)) - archiveEnd
    #debug('  __archive_update_many myOffset=%d packedString=%d archiveEnd=%d bytesBeyond=%d' % (myOffset,len(packedString),archiveEnd,bytesBeyond))
    if bytesBeyond > 0:
      fh.write( packedString[:-bytesBeyond] )
      #debug('We wrapped an archive!')
      assert fh.tell() == archiveEnd, "archiveEnd=%d fh.tell=%d bytesBeyond=%d len(packedString)=%d" % (archiveEnd,fh.tell(),bytesBeyond,len(packedString))
      fh.seek( archive['offset'] )
      fh.write( packedString[-bytesBeyond:] ) #safe because it can't exceed the archive (retention checking logic above)
    else:
      fh.write(packedString)
  #endBlock('__archive_update_many write() operations')

  #Now we propagate the updates to lower-precision archives
  #startBlock('__archive_update_many propagation')
  higher = archive
  lowerArchives = [arc for arc in header['archives'] if arc['secondsPerPoint'] > archive['secondsPerPoint']]
  #debug('__archive_update_many I have %d lower archives' % len(lowerArchives))
  for lower in lowerArchives:
    fit = lambda i: i - (i % lower['secondsPerPoint'])
    lowerIntervals = [fit(p[0]) for p in alignedPoints]
    uniqueLowerIntervals = set(lowerIntervals)
    #debug('  __archive_update_many points=%d unique=%d' % (len(alignedPoints),len(uniqueLowerIntervals)))
    propagateFurther = False
    for interval in uniqueLowerIntervals:
      #debug('  __archive_update_many propagating from %d to %d, interval=%d' % (higher['secondsPerPoint'],lower['secondsPerPoint'],interval))
      if __propagate(fh,interval,header['xFilesFactor'],higher,lower):
        propagateFurther = True
        #debug('  __archive_update_many Successful propagation!')
    #debug('  __archive_update_many propagateFurther=%s' % propagateFurther)
    if not propagateFurther: break
    higher = lower
  #endBlock('__archive_update_many propagation')
  #endBlock('__archive_update_many file=%s archive=%s points=%d' % (fh.name,step,len(points)))


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
  header = __readHeader(fh)
  now = int( time.time() )
  if untilTime is None or untilTime > now:
    untilTime = now
  if fromTime < (now - header['maxRetention']):
    fromTime = now - header['maxRetention']
  assert fromTime < untilTime, "Invalid time interval"
  diff = now - fromTime
  for archive in header['archives']:
    if archive['retention'] >= diff: break
  fromInterval = int( fromTime - (fromTime % archive['secondsPerPoint']) )
  untilInterval = int( untilTime - (untilTime % archive['secondsPerPoint']) )
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
