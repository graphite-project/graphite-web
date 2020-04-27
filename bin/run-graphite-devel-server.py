#!/usr/bin/env python

import os
import sys
from optparse import OptionParser

from django.core import management

option_parser = OptionParser(usage='''
%prog [options] GRAPHITE_ROOT
''')
option_parser.add_option('--port', default=8080, action='store', type=int, help='Port to listen on')
option_parser.add_option('--interface', default='0.0.0.0', action='store', help='Interface to listen on')
option_parser.add_option('--libs', default=None, help='Path to the directory containing the graphite python package')
option_parser.add_option('--noreload', action='store_true', help='Disable monitoring for changes')
option_parser.add_option('--settings', default='graphite.settings', help='configure alternative settings module')

(options, args) = option_parser.parse_args()

if not args:
    option_parser.print_usage()
    sys.exit(1)

graphite_root = args[0]

python_path = os.path.join(graphite_root, 'webapp')

if options.libs:
    libdir = os.path.expanduser(options.libs)
    print('Adding %s to your PYTHONPATH' % libdir)
    os.environ['PYTHONPATH'] = libdir + ':' + os.environ.get('PYTHONPATH','')

print("Running Graphite from %s under django development server\n" % graphite_root)

command = [
  'django-admin.py',
  'runserver',
  '--pythonpath', python_path,
  '--settings', options.settings,
  '%s:%d' % (options.interface, options.port)
]

if options.noreload:
    command.append('--noreload')

print(' '.join(command))

management.execute_from_command_line(command)
