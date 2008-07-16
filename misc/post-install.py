#!/usr/bin/env python

import sys, os, pwd, traceback
from optparse import OptionParser

def die(msg):
  print msg
  raise SystemExit(1)

option_parser = OptionParser()
option_parser.add_option('--install-root',default='/usr/local/graphite/',
  help="The base directory of the graphite installation")
option_parser.add_option('--libs',default=None,
  help="The directory where the graphite python package is installed (default is system site-packages)")

(options,args) = option_parser.parse_args()

install_root = options.install_root
if not install_root.endswith('/'):
  install_root += '/'

if not os.path.isdir(install_root):
  die("Graphite does not appear to be installed at %s, do you need to specify a different --install-root?" % install_root)

print '\nUsing graphite install root: %s\n' % install_root

#Find out what user the webapp & carbon will run as
print "Permissions must be setup such that apache can write to certain files and directories."
print "If you do not know what user Apache runs as, you can hit Ctrl-C and re-run this script later.\n"
while True:
  try:
    username = raw_input("What user does Apache run as? ").strip()
  except KeyboardInterrupt:
    print "\nBye."
    sys.exit(0)
  if not username: continue
  try:
    userinfo = pwd.getpwnam(username)
  except:
    print "The user '%s' does not exist" % username
    continue
  break

uid, gid = userinfo.pw_uid, userinfo.pw_gid

#Setup django db
print "Synchronizing Django database models"
web_dir = os.path.join(install_root, 'webapp', 'web')
cwd = os.getcwd()
os.chdir(web_dir)
os.system("%s manage.py syncdb" % sys.executable)
os.chdir(cwd)

#Set filesystem ownerships
print
for path in ('storage', 'storage/graphite.db', 'storage/whisper', 'storage/log', 'carbon/log', 'carbon/pid'):
  fullpath = os.path.join(install_root, path)
  if os.path.exists(fullpath):
    print "Changing ownership of %s to uid=%d gid=%d" % (fullpath,uid,gid)
    os.chown(fullpath,uid,gid)

#Setup carbon user
run_as_user = os.path.join(install_root, 'carbon', 'run_as_user')
print
print 'Creating file: %s' % run_as_user
print 'Carbon will run as %s\n' % username
fh = open(run_as_user,'w')
fh.write(username)
fh.close()

#Generate apache config
if options.libs:
  libs_option = "--libs=%s" % options.libs
else:
  libs_option = ""

command = "./generate-apache-config.py --install-root=%s %s" % (install_root, libs_option)
print "Running command: %s\n" % command
os.system(command)

print "\nPost-installation script complete, now modify the generated apache config to your needs then install it and restart apache.\n"
