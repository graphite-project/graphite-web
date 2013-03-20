#!/usr/bin/env python

import sys


# Simple python version test
major,minor = sys.version_info[:2]
py_version = sys.version.split()[0]
if major != 2 or minor < 4:
  print "You are using python %s, but version 2.4 or greater is required" % py_version
  raise SystemExit(1)

required = 0
optional = 0


# Test for whisper
try:
  import whisper
except:
  # No? test for ceres
  try:
    import ceres

    # We imported ceres, but not whisper so it's an optional dependency
    print "[OPTIONAL] Unable to import the 'whisper' module. Without it the webapp will be unable to read .wsp files"
    optional +=1
  except:
    print "[REQUIRED] Unable to import the 'whisper' or 'ceres' modules, please download this package from the Graphite project page and install it.\n"
    required += 1


# Test for pycairo
try:
  import cairo
except:
  print "[REQUIRED] Unable to import the 'cairo' module, do you have pycairo installed for python %s?\n" % py_version
  cairo = None
  required += 1


# Test that pycairo has the PNG backend
try:
  if cairo:
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 10, 10)
    del surface
except:
  print "[REQUIRED] Failed to create an ImageSurface with cairo, you probably need to recompile cairo with PNG support\n"
  required += 1

# Test that cairo can find fonts
try:
  if cairo:
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 10, 10)
    context = cairo.Context(surface)
    context.font_extents()
    del surface, context
except:
  print "[REQUIRED] Failed to create text with cairo, this probably means cairo cant find any fonts. Install some system fonts and try again\n"


# Test for django
try:
  import django
except:
  print "[REQUIRED] Unable to import the 'django' module, do you have Django installed for python %s?\n" % py_version
  django = None
  required += 1


# Test for pytz
try:
  import pytz
except:
  print "[REQUIRED] Unable to import the 'pytz' module, do you have pytz module installed for python %s?\n" % py_version
  required += 1


# Test for pyparsing
try:
  import pyparsing
except:
  print "[REQUIRED] Unable to import the 'pyparsing' module, do you have pyparsing module installed for python %s?\n" % py_version
  required += 1


# Test for django-tagging
try:
  import tagging
except:
  print "[REQUIRED] Unable to import the 'tagging' module, do you have django-tagging installed for python %s?\n" % py_version
  required += 1


# Verify django version
if django and django.VERSION[:2] < (1,1):
  print "[REQUIRED] You have django version %s installed, but version 1.1 or greater is required\n" % django.get_version()
  required += 1


# Test for a json module
try:
  import json
except ImportError:
  try:
    import simplejson
  except ImportError:
    print "[REQUIRED] Unable to import either the 'json' or 'simplejson' module, at least one is required.\n"
    required += 1


# Test for zope.interface
try:
  from zope.interface import Interface
except ImportError:
  print "[OPTIONAL] Unable to import Interface from zope.interface. Without it, you will be unable to run carbon on this server.\n"
  optional +=1


# Test for python-memcached
try:
  import memcache
except:
  print "[OPTIONAL] Unable to import the 'memcache' module, do you have python-memcached installed for python %s? This feature is not required but greatly improves performance.\n" % py_version
  optional += 1


# Test for sqlite
try:
  try:
    import sqlite3 #python 2.5+
  except:
    from pysqlite2 import dbapi2 #python 2.4
except:
  print "[OPTIONAL] Unable to import the sqlite module, do you have python-sqlite2 installed for python %s? If you plan on using another database backend that Django supports (such as mysql or postgres) then don't worry about this. However if you do not want to setup the database yourself, you will need to install sqlite2 and python-sqlite2.\n" % py_version
  optional += 1


# Test for python-ldap
try:
  import ldap
except:
  print "[OPTIONAL] Unable to import the 'ldap' module, do you have python-ldap installed for python %s? Without python-ldap, you will not be able to use LDAP authentication in the graphite webapp.\n" % py_version
  optional += 1


# Test for Twisted python
try:
  import twisted
except:
  print "[OPTIONAL] Unable to import the 'twisted' package, do you have Twisted installed for python %s? Without Twisted, you cannot run carbon on this server.\n" % py_version
  optional += 1
else:
  tv = []
  tv = twisted.__version__.split('.')
  if int(tv[0]) < 8 or (int(tv[0]) == 8 and int(tv[1]) < 2):
    print "[OPTIONAL] Your version of Twisted is too old to run carbon. You will not be able to run carbon on this server until you upgrade Twisted >= 8.2.\n"
    optional += 1


# Test for txamqp
try:
  import txamqp
except:
  print "[OPTIONAL] Unable to import the 'txamqp' module, this is required if you want to use AMQP as an input to Carbon. Note that txamqp requires python 2.5 or greater.\n"
  optional += 1


# Test for python-rrdtool
try:
  import rrdtool
except:
  print "[OPTIONAL] Unable to import the 'python-rrdtool' module, this is required for reading RRD.\n"


if required:
  print "%d necessary dependencies not met. Graphite will not function until these dependencies are fulfilled." % required

else:
  print "All necessary dependencies are met."

if optional:
  print "%d optional dependencies not met. Please consider the optional items before proceeding." % optional

else:
  print "All optional dependencies are met."
