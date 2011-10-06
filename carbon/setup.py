#!/usr/bin/env python

import os
from glob import glob

if os.environ.get('USE_SETUPTOOLS'):
  from setuptools import setup
  setup_kwargs = dict(zip_safe=0)

else:
  from distutils.core import setup
  setup_kwargs = dict()


storage_dirs = [ ('storage/whisper',[]), ('storage/lists',[]),
                 ('storage/log',[]), ('storage/rrd',[]) ]
conf_files = [ ('conf', glob('conf/*.example')) ]

setup(
  name='carbon',
  version='0.9.9',
  url='https://launchpad.net/graphite',
  author='Chris Davis',
  author_email='chrismd@gmail.com',
  license='Apache Software License 2.0',
  description='Backend data caching and persistence daemon for Graphite',
  packages=['carbon', 'carbon.aggregator', 'twisted.plugins'],
  package_dir={'' : 'lib'},
  scripts=glob('bin/*'),
  package_data={ 'carbon' : ['*.xml'] },
  data_files=storage_dirs + conf_files,
  install_requires=['twisted', 'txamqp'],
  **setup_kwargs
)
