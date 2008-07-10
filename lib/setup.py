#!/usr/bin/env python

from distutils.core import setup
from glob import glob

setup(
  name='graphite',
  packages=['graphite'],
  scripts=glob('scripts/*.py')
)
