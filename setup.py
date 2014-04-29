#!/usr/bin/env python
import os


from setuptools import setup, find_packages
setup_kwargs = dict(zip_safe=0)

storage_dirs = []

for subdir in ('whisper', 'ceres', 'rrd', 'log', 'log/webapp'):
    storage_dirs.append( ('storage/%s' % subdir, []) )



setup(
  name='graphite-query',
  version='0.10.0-alpha',
  description='Some utilities extracted from graphite-web',
  install_requires=open("install_requires.txt").read().split(),
  packages=find_packages(),#exclude=['tests']),
  package_data={'graphite' :
    ['local_settings.py.example']},
  data_files= storage_dirs,
  test_suite="tests",
  tests_require=open("tests_require.txt").read().split(),
  **setup_kwargs
)
