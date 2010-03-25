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


# Test for django
try:
  import django
except:
  print "[FATAL] Unable to import the 'django' module, do you have Django installed for python %s?" % py_version
  django = None
  fatal += 1


# Verify django version
if django and django.VERSION[0] < 1:
  version = '.'.join([str(v) for v in django.VERSION if v is not None])
  print "[FATAL] You have django version %s installed, but version 1.0 or greater is required" % version
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


# Test for mod_python
try:
  import mod_python
except:
  print "[WARNING] Unable to import the 'mod_python' module, do you have mod_python installed for python %s?" % py_version
  print "This means you will only be able to run graphite in the development server mode, which is not"
  print "recommended for production use."
  warning += 1


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
