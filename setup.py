#!/usr/bin/env python

import os
import ConfigParser
from glob import glob


try:
        from io import BytesIO
except ImportError:
        from StringIO import StringIO as BytesIO

# adding [install] section
with open('setup.cfg', 'r') as f:
    orig_setup_cfg = f.read()
cf = ConfigParser.ConfigParser()
cf.readfp(BytesIO(orig_setup_cfg), 'setup.cfg')

if os.environ.get('READTHEDOCS'):
    cf.remove_section('install')
else:
    try:
        cf.add_section('install')
    except ConfigParser.DuplicateSectionError:
        pass
    cf.set('install', 'prefix', '/opt/graphite')
    cf.set('install', 'install-lib', '%(prefix)s/webapp')

with open('setup.cfg', 'wb') as f:
    cf.write(f)

if os.environ.get('USE_SETUPTOOLS'):
  from setuptools import setup
  setup_kwargs = dict(zip_safe=0)

else:
  from distutils.core import setup
  setup_kwargs = dict()


storage_dirs = []

for subdir in ('whisper', 'rrd', 'log', 'log/webapp'):
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

try:
    setup(
      name='graphite-web',
      version='0.9.15',
      url='http://graphite.readthedocs.org',
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
        'graphite.url_shortener',
        'graphite.whitelist',
        'graphite.metrics',
        'graphite.dashboard',
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
finally:
    with open('setup.cfg', 'w') as f:
        f.write(orig_setup_cfg)
