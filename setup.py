#!/usr/bin/env python

import os
from glob import glob
from distutils.core import setup


storage_dirs = []

for subdir in ('whisper', 'lists', 'rrd', 'log', 'log/webapp'):
  storage_dirs.append( ('storage/%s' % subdir, []) )

webapp_content = {}

for root, dirs, files in os.walk('webapp/content'):
  for filename in files:
    filepath = os.path.join(root, filename)

    if root not in webapp_content:
      webapp_content[root] = []

    webapp_content[root].append(filepath)


setup(
  name='graphite-web',
  version='0.9.5',
  url='https://launchpad.net/graphite',
  author='Chris Davis',
  author_email='chrismd@gmail.com',
  license='Apache Software License 2.0',
  description='Enterprise scalable realtime graphing',
  package_dir={'' : 'webapp'},
  packages=['graphite', 'graphite.account', 'graphite.browser', 'graphite.cli', 'graphite.composer', 'graphite.render', 'graphite.whitelist', 'graphite.metrics'],
  package_data={'graphite' : ['templates/*', 'local_settings.py.example', 'render/graphTemplates.conf']},
  scripts=glob('bin/*'),
  data_files=webapp_content.items() + storage_dirs,
)
