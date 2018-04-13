#!/usr/bin/env python

from __future__ import with_statement

import os
try:
    from ConfigParser import ConfigParser, DuplicateSectionError  # Python 2
except ImportError:
    from configparser import ConfigParser, DuplicateSectionError  # Python 3

from glob import glob
from collections import defaultdict

# io.StringIO is strictly unicode only. Python 2 StringIO.StringIO accepts
# bytes, so we'll conveniently ignore decoding and reencoding the file there.
try:
    from StringIO import StringIO  # Python 2
except ImportError:
    from io import StringIO  # Python 3

# Graphite historically has an install prefix set in setup.cfg. Being in a
# configuration file, it's not easy to override it or unset it (for installing
# graphite in a virtualenv for instance).
# The prefix is now set by ``setup.py`` and *unset* if an environment variable
# named ``GRAPHITE_NO_PREFIX`` is present.
# While ``setup.cfg`` doesn't contain the prefix anymore, the *unset* step is
# required for installations from a source tarball because running
# ``python setup.py sdist`` will re-add the prefix to the tarball's
# ``setup.cfg``.
with open('setup.cfg', 'r') as f:
    orig_setup_cfg = f.read()
cf = ConfigParser()
cf.readfp(StringIO(orig_setup_cfg), 'setup.cfg')

if os.environ.get('GRAPHITE_NO_PREFIX') or os.environ.get('READTHEDOCS'):
    cf.remove_section('install')
else:
    try:
        cf.add_section('install')
    except DuplicateSectionError:
        pass
    if not cf.has_option('install', 'prefix'):
        cf.set('install', 'prefix', '/opt/graphite')
    if not cf.has_option('install', 'install-lib'):
        cf.set('install', 'install-lib', '%(prefix)s/webapp')

with open('setup.cfg', 'w') as f:
    cf.write(f)

if os.environ.get('USE_SETUPTOOLS'):
  from setuptools import setup
  setup_kwargs = dict(zip_safe=0)

else:
  from distutils.core import setup
  setup_kwargs = dict()


storage_dirs = []

for subdir in ('whisper/dummy.txt', 'ceres/dummy.txt', 'rrd/dummy.txt', 'log/dummy.txt', 'log/webapp/dummy.txt'):
  storage_dirs.append( ('storage/%s' % subdir, []) )

webapp_content = defaultdict(list)

for root, dirs, files in os.walk('webapp/content'):
  for filename in files:
    filepath = os.path.join(root, filename)
    webapp_content[root].append(filepath)

conf_files = [ ('conf', glob('conf/*.example')) ]
examples = [ ('examples', glob('examples/example-*')) ]

try:
    setup(
      name='graphite-web',
      version='1.2.0',
      url='http://graphiteapp.org/',
      author='Chris Davis',
      author_email='chrismd@gmail.com',
      license='Apache Software License 2.0',
      description='Enterprise scalable realtime graphing',
      package_dir={'' : 'webapp'},
      packages=[
        'graphite',
        'graphite.account',
        'graphite.account.migrations',
        'graphite.browser',
        'graphite.composer',
        'graphite.dashboard',
        'graphite.dashboard.migrations',
        'graphite.events',
        'graphite.events.migrations',
        'graphite.finders',
        'graphite.functions',
        'graphite.functions.custom',
        'graphite.metrics',
        'graphite.readers',
        'graphite.render',
        'graphite.tags',
        'graphite.tags.migrations',
        'graphite.url_shortener',
        'graphite.url_shortener.migrations',
        'graphite.version',
        'graphite.whitelist',
        'graphite.worker_pool',
      ],
      package_data={'graphite' :
        ['templates/*', 'local_settings.py.example']},
      scripts=glob('bin/*'),
      data_files=list(webapp_content.items()) + storage_dirs + conf_files + examples,
      install_requires=['Django>=1.8,<2.1', 'django-tagging==0.4.3', 'pytz', 'pyparsing', 'cairocffi', 'urllib3', 'scandir', 'six'],
      classifiers=[
          'Intended Audience :: Developers',
          'Natural Language :: English',
          'License :: OSI Approved :: Apache Software License',
          'Programming Language :: Python',
          'Programming Language :: Python :: 2',
          'Programming Language :: Python :: 2.7',
          'Programming Language :: Python :: 3',
          'Programming Language :: Python :: 3.4',
          'Programming Language :: Python :: 3.5',
          'Programming Language :: Python :: 3.6',
          ],
      **setup_kwargs
    )
finally:
    with open('setup.cfg', 'w') as f:
        f.write(orig_setup_cfg)
