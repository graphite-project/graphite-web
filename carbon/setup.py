#!/usr/bin/env python

import os
from glob import glob
from distutils.core import setup


setup(
  name='carbon',
  version='0.9.5',
  url='https://launchpad.net/graphite',
  author='Chris Davis',
  author_email='chrismd@gmail.com',
  license='Apache Software License 2.0',
  description='Backend data caching and persistence daemon for Graphite',
  package_dir={'' : 'lib'},
  packages=['carbon'],
  scripts=glob('bin/*'),
  data_files=[ ('conf', glob('conf/*')) ],
)
