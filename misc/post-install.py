#!/usr/bin/env python

import sys, os, pwd, traceback
from optparse import OptionParser

def die(msg):
  print msg
  raise SystemExit(1)

option_parser = OptionParser()
option_parser.add_option('--install-root',default='/usr/local/graphite/',
  help="The base directory of the graphite installation, default: /usr/local/graphite/")

(options,args) = option_parser.parse_args()

install_root = options.install_root
if not install_root.endswith('/'):
  install_root += '/'

if not os.path.isdir(install_root):
  die("Graphite does not appear to be installed at %s, do you need to specify a different --install-root?" % install_root)

print 'Using graphite install root: %s' % install_root

#Find out what user the webapp & carbon will run as
while True:
  username = raw_input("What user does Apache run as?").strip()
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
for path in ('storage', 'storage/graphite.db', 'storage/whisper', 'storage/log', 'carbon/log', 'carbon/pid'):
  fullpath = os.path.join(install_root, path)
  if os.path.exists(fullpath):
    print "Changing ownership of %s to uid=%d gid=%d" % (fullpath,uid,gid)
    os.chown(fullpath,uid,gid)

#Setup carbon user
run_as_user = os.path.join(install_root, 'carbon', 'run_as_user')
print 'Creating file: %s' % run_as_user
print 'Carbon will run as %s' % username
fh = open(run_as_user,'w')
fh.write(username)
fh.close()

#Generate apache config
command = "./generate-apache-config.py --install-root=%s" % install_root
print "Running command: %s" % command
os.system(command)

print "Post-installation script complete, now modify the generated apache config to your needs then install it and restart apache."
