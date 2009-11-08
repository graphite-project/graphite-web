#!/usr/bin/env python

import sys, os
from optparse import OptionParser

option_parser = OptionParser()
option_parser.add_option('--install-root',default='/opt/graphite/',
  help="The base directory of the graphite installation")
option_parser.add_option('--libs',default=None,
  help="The directory where the graphite python package is installed (default is system site-packages)")

(options,args) = option_parser.parse_args()

install_root = options.install_root
if not install_root.endswith('/'):
  install_root += '/'

if not os.path.isdir(install_root):
  print "Graphite does not appear to be installed at %s, do you need to specify a different --install-root?" % install_root
  sys.exit(1)

python_path = [ os.path.join(install_root,'webapp') ]
if options.libs:
  python_path.append( options.libs )

import django
django_root = django.__path__[0]

vhost = open('misc/template-vhost.conf').read()
vhost = vhost.replace('@INSTALL_ROOT@', install_root)
vhost = vhost.replace('@PYTHON_PATH@', str(python_path))
vhost = vhost.replace('@DJANGO_ROOT@', django_root)

fh = open('graphite-vhost.conf','w')
fh.write(vhost)
fh.close()

print "Generated graphite-vhost.conf"
print "Put this file in your apache installation's vhost include directory."
print "NOTE: you must ensure that mod_python is properly configured before using Graphite."
