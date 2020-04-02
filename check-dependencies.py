#!/usr/bin/env python

import sys

if sys.version_info <= (2,7):
    # SystemExit defaults to returning 1 when printing a string to stderr
    raise SystemExit("You are using python %s, but version 2.7 or greater is "
                     "required" % sys.version_info)

required = 0
optional = 0


# Test for whisper
try:
    import whisper
except ImportError:
    # No? test for ceres
    try:
        import ceres
        # We imported ceres, but not whisper so it's an optional dependency
        sys.stderr.write("[OPTIONAL] Unable to import the 'whisper' module. "
                         "Without it the webapp will be unable to read .wsp files\n")
        optional += 1
    except ImportError:
        sys.stderr.write("[REQUIRED] Unable to import the 'whisper' or 'ceres' modules, "
                         "please download this package from the Graphite project page and install it.\n")
        required += 1


# Test for cairocffi or pycairo
try:
    import cairocffi as cairo
except ImportError:
    sys.stderr.write("[REQUIRED] Unable to import the 'cairocffi' module, attempting to fall back to pycairo\n")
    try:
        import cairo
    except ImportError:
        sys.stderr.write("[REQUIRED] Unable to import the 'cairo' module, "
                         "do you have pycairo installed for python %s?\n" % sys.version_info.major)
        cairo = None
        required += 1


# Test that pycairo has the PNG backend
try:
    if cairo:
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 10, 10)
        del surface
except Exception:
    sys.stderr.write("[REQUIRED] Failed to create an ImageSurface with cairo, "
                     "you probably need to recompile cairo with PNG support\n")
    required += 1


# Test that cairo can find fonts
try:
    if cairo:
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, 10, 10)
        context = cairo.Context(surface)
        context.font_extents()
        del surface, context
except Exception:
    sys.stderr.write("[REQUIRED] Failed to create text with cairo, "
                     "this probably means cairo cant find any fonts. "
                     "Install some system fonts and try again\n")


# Test for django
try:
    import django
except ImportError:
    sys.stderr.write("[REQUIRED] Unable to import the 'django' module, "
                     "do you have Django installed for python %s?\n" % sys.version_info.major)
    django = None
    required += 1


# Test for pytz
try:
    import pytz
except ImportError:
    sys.stderr.write("[REQUIRED] Unable to import the 'pytz' module, "
                     "do you have pytz module installed for python %s?\n" % sys.version_info.major)
    required += 1


# Test for pyparsing
try:
    import pyparsing
except ImportError:
    sys.stderr.write("[REQUIRED] Unable to import the 'pyparsing' module, "
                     "do you have pyparsing module installed for python %s?\n" % sys.version_info.major)
    required += 1


# Test for django-tagging
try:
    import tagging
except ImportError:
    sys.stderr.write("[REQUIRED] Unable to import the 'tagging' module, "
                     "do you have django-tagging installed for python %s?\n" % sys.version_info.major)
    required += 1


if django and django.VERSION[:2] < (1,8):
    sys.stderr.write("[REQUIRED] You have django version %s installed, "
                     "but version 1.8 or greater is required\n" % django.get_version())
    required += 1


# Test for python-memcached
try:
    import memcache
except ImportError:
    sys.stderr.write("[OPTIONAL] Unable to import the 'memcache' module, "
                     "do you have python-memcached installed for python %s? "
                     "This feature is not required but greatly improves performance.\n" % sys.version_info.major)
    optional += 1


# Test for python-ldap
try:
    import ldap
except ImportError:
    sys.stderr.write("[OPTIONAL] Unable to import the 'ldap' module, "
                     "do you have python-ldap installed for python %s? "
                     "Without python-ldap, you will not be able to use "
                     "LDAP authentication in the graphite webapp.\n" % sys.version_info.major)
    optional += 1


# Test for txamqp
try:
    import txamqp
except ImportError:
    sys.stderr.write("[OPTIONAL] Unable to import the 'txamqp' module, "
                     "this is required if you want to use AMQP as an input to Carbon. "
                     "Note that txamqp requires python 2.5 or greater.\n")
    optional += 1


# Test for python-rrdtool
try:
    import rrdtool
except ImportError:
    sys.stderr.write("[OPTIONAL] Unable to import the 'python-rrdtool' module, this is required for reading RRD.\n")
    optional += 1


# Test for whitenoise
try:
    import whitenoise
except ImportError:
    sys.stderr.write("[OPTIONAL] Unable to import the 'whitenoise' module. This is useful for serving static files.\n")
    optional += 1


# Test for pyhash
try:
    import pyhash
except ImportError:
    sys.stderr.write("[OPTIONAL] Unable to import the 'pyhash' module. This is useful for fnv1_ch hashing support.\n")
    optional += 1


if optional:
    sys.stderr.write("%d optional dependencies not met. Please consider the optional items before proceeding.\n" % optional)
else:
    print("All optional dependencies are met.")

if required:
    sys.stderr.write("%d necessary dependencies not met. Graphite will not function until these dependencies are fulfilled.\n" % required)
    sys.exit(1)
else:
    print("All necessary dependencies are met.")


# suppress unused-import warnings
__all__ = [
    'whisper',
    'ceres',
    'cairo',
    'django',
    'pytz',
    'pyparsing',
    'tagging',
    'memcache',
    'ldap',
    'txamqp',
    'rrdtool',
    'whitenoise',
    'pyhash',
]
