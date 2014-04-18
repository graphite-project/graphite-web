#!/usr/bin/env python

from __future__ import with_statement

import os

if os.environ.get('USE_SETUPTOOLS'):
  from setuptools import setup
  setup_kwargs = dict(zip_safe=0)

else:
  from distutils.core import setup
  setup_kwargs = dict()


storage_dirs = []

for subdir in ('whisper', 'ceres', 'rrd', 'log', 'log/webapp'):
  storage_dirs.append( ('storage/%s' % subdir, []) )



setup(
  name='graphite-util',
  version='0.10.0-alpha',
  url='https://github.com/edin1/graphite',
  # author='edin1',
  # author_email='edin1.business@gmail.com',
  license='Apache Software License 2.0',
  description='Some utilities extracted from graphite-web',
  package_dir={'' : 'webapp'},
  packages=[
    'django',
    'graphite',
    'graphite.finders',
    'graphite.render',
  ],
  package_data={'graphite' :
    ['local_settings.py.example']},
  data_files= storage_dirs,
  **setup_kwargs
)
