#!/usr/bin/env python

import sys, os
import subprocess
from optparse import OptionParser

option_parser = OptionParser(usage='''
%prog [options] GRAPHITE_ROOT
''')
option_parser.add_option('--port', default=8080, action='store', type=int, help='Port to listen on')
option_parser.add_option('--libs', default=None, help='Path to the directory containing the graphite python package')
option_parser.add_option('--noreload', action='store_true', help='Disable monitoring for changes')

(options, args) = option_parser.parse_args()

if not args:
  option_parser.print_usage()
  sys.exit(1)

graphite_root = args[0]

django_admin = None
for name in ('django-admin', 'django-admin.py'):
  process = subprocess.Popen(['which', name], stdout=subprocess.PIPE)
  output = process.stdout.read().strip()
  if process.wait() == 0:
    django_admin = output
    break

if not django_admin:
  print "Could not find a django-admin script!"
  sys.exit(1)

python_path = os.path.join(graphite_root, 'webapp')

if options.libs:
  libdir = os.path.expanduser(options.libs)
  print 'Adding %s to your PYTHONPATH' % libdir
  os.environ['PYTHONPATH'] = libdir + ':' + os.environ.get('PYTHONPATH','')

print "Running Graphite from %s under django development server\n" % graphite_root

command = [
  django_admin,
  'runserver',
  '--pythonpath', python_path,
  '--settings', 'graphite.settings',
  '0.0.0.0:%d' % options.port
]

if options.noreload:
  command.append('--noreload')

print ' '.join(command)
os.execvp(django_admin, command)
