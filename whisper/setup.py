import sys
from os.path import join
from glob import glob
from distutils.core import setup


'''
Ok I officially need to separately package carbon from graphite.
This means I need to extract whisper as a standalone module.

lib/whisper.py

Change webapp imports and carbon/writer's import

Aha, whisper will be separate too (bin/whisper-*.py)

Also going to finally rename 'web' project.
It *should* be called 'graphite', but then I have to rename the current 'graphite' to 'graphite.something'
Both come with the webapp. In fact 'graphite.something' is no longer a lib on its own really, it is solely used by the webapp.

The next question becomes do carbon-cache and carbon-relay need to be separated? I would say no, the relay is clearly a subset of the cache
with only a few small additional pure modules. There is minimal conflict (instrumentation) and that is easily handled.
At some point they might even conceivably get merged into a single application.

So how should I organize the setup.py scripts?
	whisper-setup.py
	carbon-setup.py
	graphite-setup.py
	INSTALL text explaining each
'''

major, minor = sys.version_info[:2]

if major != 2 or minor < 6: #XXX Carbon actually does because of ConfigParser(dict_type), webapp only requires 2.6
  print "Graphite requires python 2.6 or greater"


modules = []
packages = []

# if setup.cfg says 'packages = graphite, carbon'

'''
Graphite webapp requires:
  cairo (with ImageSurface aka PNG support)
  django 1.0+
'''

try:
  import pyparsing
except ImportError:
  modules.append('pyparsing')


setup(
  name = 'Graphite',
  version = '0.9.5',
  description = 'Enterprise scalable realtime graphing',
  author = 'Chris Davis',
  autor_email = 'chrismd@gmail.com',
  url = 'https://launchpad.net/graphite',
  classifiers = [
    'License :: OSI Approved :: Apache Software License',
  ],
  package_dir = {'' : 'lib'},
  packages = packages,
  requires = requires,
  scripts = glob( join('bin','*') ),
)
