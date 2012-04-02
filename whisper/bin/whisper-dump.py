#!/usr/bin/python

import os
import struct
import whisper
import mmap
from optparse import OptionParser

option_parser = OptionParser(usage='''%prog path''')
(options, args) = option_parser.parse_args()

if len(args) != 1:
  option_parser.error("require one input file name")
else:
  path = args[0]

def mmap_file(filename):
  fd = os.open(filename, os.O_RDONLY) 
  map = mmap.mmap(fd, 0, prot=mmap.PROT_READ)
  os.close(fd)
  return map

def read_header(map):
  try:
    (aggregationType,maxRetention,xFilesFactor,archiveCount) = struct.unpack(whisper.metadataFormat,map[:whisper.metadataSize])
  except:
    raise CorruptWhisperFile("Unable to unpack header")

  archives = []
  archiveOffset = whisper.metadataSize

  for i in xrange(archiveCount):
    try:
      (offset, secondsPerPoint, points) = struct.unpack(whisper.archiveInfoFormat, map[archiveOffset:archiveOffset+whisper.archiveInfoSize])
    except:
      raise CorruptWhisperFile("Unable to reda archive %d metadata" % i)

    archiveInfo = {
      'offset' : offset,
      'secondsPerPoint' : secondsPerPoint,
      'points' : points,
      'retention' : secondsPerPoint * points,
      'size' : points * whisper.pointSize,
    }
    archives.append(archiveInfo)
    archiveOffset += whisper.archiveInfoSize

  header = {
    'aggregationMethod' : whisper.aggregationTypeToMethod.get(aggregationType, 'average'),
    'maxRetention' : maxRetention,
    'xFilesFactor' : xFilesFactor,
    'archives' : archives,
  }
  return header

def dump_header(header):
  print 'Meta data:'
  print '  aggregation method: %s' % header['aggregationMethod']
  print '  max retention: %d' % header['maxRetention']
  print '  xFilesFactor: %g' % header['xFilesFactor']
  print
  dump_archive_headers(header['archives'])

def dump_archive_headers(archives):
  for i,archive in enumerate(archives):
    print 'Archive %d info:' % i
    print '  offset: %d' % archive['offset']
    print '  seconds per point: %d' % archive['secondsPerPoint']
    print '  points: %d' % archive['points']
    print '  retention: %d' % archive['retention']
    print '  size: %d' % archive['size']
    print

def dump_archives(archives):
  for i,archive in enumerate(archives):
    print 'Archive %d data:' %i
    offset = archive['offset']
    for point in xrange(archive['points']):
      (timestamp, value) = struct.unpack(whisper.pointFormat, map[offset:offset+whisper.pointSize])
      print '%d: %d, %g' % (point, timestamp, value)
      offset += whisper.pointSize
    print

map = mmap_file(path)
header = read_header(map)
dump_header(header)
dump_archives(header['archives'])
