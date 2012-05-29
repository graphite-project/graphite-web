#!/usr/bin/env python

import os
from glob import glob

if os.environ.get('USE_SETUPTOOLS'):
  from setuptools import setup
  setup_kwargs = dict(zip_safe=0)

else:
  from distutils.core import setup
  setup_kwargs = dict()


storage_dirs = []

for subdir in ('whisper', 'ceres', 'rrd', 'log', 'log/webapp'):
  storage_dirs.append( ('storage/%s' % subdir, []) )

webapp_content = {}

for root, dirs, files in os.walk('webapp/content'):
  for filename in files:
    filepath = os.path.join(root, filename)

    if root not in webapp_content:
      webapp_content[root] = []

    webapp_content[root].append(filepath)


conf_files = [ ('conf', glob('conf/*.example')) ]
examples = [ ('examples', glob('examples/example-*')) ]

setup(
  name='graphite-web',
  version='0.10.0-alpha',
  url='https://launchpad.net/graphite',
  author='Chris Davis',
  author_email='chrismd@gmail.com',
  license='Apache Software License 2.0',
  description='Enterprise scalable realtime graphing',
  package_dir={'' : 'webapp'},
  packages=[
    'graphite',
    'graphite.account',
    'graphite.browser',
    'graphite.cli',
    'graphite.composer',
    'graphite.render',
    'graphite.whitelist',
    'graphite.metrics',
    'graphite.dashboard',
    'graphite.graphlot',
    'graphite.events',
    'graphite.version',
    'graphite.thirdparty',
    'graphite.thirdparty.pytz',
  ],
  package_data={'graphite' :
    ['templates/*', 'local_settings.py.example']},
  scripts=glob('bin/*'),
  data_files=webapp_content.items() + storage_dirs + conf_files + examples,
  **setup_kwargs
)
