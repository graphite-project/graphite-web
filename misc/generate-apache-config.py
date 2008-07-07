#!/usr/bin/env python

import sys, os
from optparse import OptionParser

option_parser = OptionParser()
option_parser.add_option('--install-root',default='/usr/local/graphite/',
  help="The base directory of the graphite installation, default: /usr/local/graphite/")

(options,args) = option_parser.parse_args()

install_root = options.install_root
if not install_root.endswith('/'):
  install_root += '/'

if not os.path.isdir(install_root):
  print "Graphite does not appear to be installed at %s, do you need to specify a different --install-root?" % install_root
  sys.exit(1)

os.system("sed -e s!@INSTALL_ROOT@!%s!g misc/template-vhost.conf > graphite-vhost.conf" % install_root)
print "Generated graphite-vhost.conf"
print "Put this file in your apache installation's vhost include directory."
print "NOTE: you must ensure that mod_python is properly configured before using Graphite."
