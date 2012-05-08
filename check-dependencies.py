#!/usr/bin/env python

import sys


# Simple python version test
major,minor = sys.version_info[:2]
py_version = sys.version.split()[0]
if major != 2 or minor < 4:
  print "You are using python %s, but version 2.4 or greater is required" % py_version
  raise SystemExit(1)

fatal = 0
warning = 0


# Test for whisper
try:
  import whisper
except:
  print "[FATAL] Unable to import the 'whisper' module, please download this package from the Graphite project page and install it."
  fatal += 1


# Test for pycairo
try:
  import cairo
except:
  print "[FATAL] Unable to import the 'cairo' module, do you have pycairo installed for python %s?" % py_version
  cairo = None
  fatal += 1


# Test that pycairo has the PNG backend
try:
  if cairo:
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 10, 10)
    del surface
except:
  print "[FATAL] Failed to create an ImageSurface with cairo, you probably need to recompile cairo with PNG support"
  fatal += 1

# Test that cairo can find fonts
try:
  if cairo:
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 10, 10)
    context = cairo.Context(surface)
    context.font_extents()
    del surface, context
except:
  print "[FATAL] Failed to create text with cairo, this probably means cairo cant find any fonts. Install some system fonts and try again"

# Test for django
try:
  import django
except:
  print "[FATAL] Unable to import the 'django' module, do you have Django installed for python %s?" % py_version
  django = None
  fatal += 1


# Test for django-tagging
try:
  import tagging
except:
  print "[FATAL] Unable to import the 'tagging' module, do you have django-tagging installed for python %s?" % py_version
  fatal += 1


# Verify django version
if django and django.VERSION[:2] < (1,1):
  print "[FATAL] You have django version %s installed, but version 1.1 or greater is required" % django.get_version()
  fatal += 1


# Test for a json module
try:
  import json
except ImportError:
  try:
    import simplejson
  except ImportError:
    print "[FATAL] Unable to import either the 'json' or 'simplejson' module, at least one is required."
    fatal += 1


# Test for zope.interface
try:
  from zope.interface import Interface
except ImportError:
  print "[WARNING] Unable to import Interface from zope.interface."
  print "Without it, you will be unable to run carbon on this server."
  warning +=1


# Test for python-memcached
try:
  import memcache
except:
  print "[WARNING]"
  print "Unable to import the 'memcache' module, do you have python-memcached installed for python %s?" % py_version
  print "This feature is not required but greatly improves performance.\n"
  warning += 1


# Test for sqlite
try:
  try:
    import sqlite3 #python 2.5+
  except:
    from pysqlite2 import dbapi2 #python 2.4
except:
  print "[WARNING]"
  print "Unable to import the sqlite module, do you have python-sqlite2 installed for python %s?" % py_version
  print "If you plan on using another database backend that Django supports (such as mysql or postgres)"
  print "then don't worry about this. However if you do not want to setup the database yourself, you will"
  print "need to install sqlite2 and python-sqlite2.\n"
  warning += 1


# Test for python-ldap
try:
  import ldap
except:
  print "[WARNING]"
  print "Unable to import the 'ldap' module, do you have python-ldap installed for python %s?" % py_version
  print "Without python-ldap, you will not be able to use LDAP authentication in the graphite webapp.\n"
  warning += 1


# Test for Twisted python
try:
  import twisted
except:
  print "[WARNING]"
  print "Unable to import the 'twisted' package, do you have Twisted installed for python %s?" % py_version
  print "Without Twisted, you cannot run carbon on this server."
  warning += 1
else:
  tv = []
  tv = twisted.__version__.split('.')
  if int(tv[0]) < 8 or (int(tv[0]) == 8 and int(tv[1]) < 2):
    print "[WARNING]"
    print "Your version of Twisted is too old to run carbon."
    print "You will not be able to run carbon on this server until you upgrade Twisted >= 8.2."
    warning += 1

# Test for txamqp
try:
  import txamqp
except:
  print "[WARNING]"
  print "Unable to import the 'txamqp' module, this is required if you want to use AMQP."
  print "Note that txamqp requires python 2.5 or greater."
  warning += 1


if fatal:
  print "%d necessary dependencies not met. Graphite will not function until these dependencies are fulfilled." % fatal

else:
  print "All necessary dependencies are met."

if warning:
  print "%d optional dependencies not met. Please consider the warning messages before proceeding." % warning

else:
  print "All optional dependencies are met."
