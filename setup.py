#!/usr/bin/env python

from __future__ import with_statement

import os
from configparser import ConfigParser, DuplicateSectionError  # Python 3

from glob import glob
from collections import defaultdict
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
cf.read_file(StringIO(orig_setup_cfg), 'setup.cfg')

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
        cf.set('install', 'install_lib', '%(prefix)s/webapp')

with open('setup.cfg', 'w') as f:
    cf.write(f)

if os.environ.get('USE_DISTUTILS'):
    # skipcq: PYL-W0402
    from distutils.core import setup
    setup_kwargs = dict()
else:
    from setuptools import setup
    setup_kwargs = dict(zip_safe=0)

storage_dirs = []

for subdir in ('whisper/dummy.txt', 'ceres/dummy.txt', 'rrd/dummy.txt', 'log/dummy.txt', 'log/webapp/dummy.txt'):
    storage_dirs.append( ('storage/%s' % subdir, []) )

webapp_content = defaultdict(list)

for root, dirs, files in os.walk('webapp/content'):
    for filename in files:
        filepath = os.path.join(root, filename)
        webapp_content[root].append(filepath)

conf_files = [('conf', glob('conf/*.example'))]
examples = [('examples', glob('examples/example-*'))]


def read(fname):
    # skipcq: PTC-W6004
    with open(os.path.join(os.path.dirname(__file__), fname)) as f:
        return f.read()


try:
    setup(
      name='graphite-web',
      version='1.2.0',
      url='http://graphiteapp.org/',
      author='Chris Davis',
      author_email='chrismd@gmail.com',
      license='Apache Software License 2.0',
      description='Enterprise scalable realtime graphing',
      long_description=read('README.md'),
      long_description_content_type='text/markdown',
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
      package_data={'graphite': ['templates/*', 'local_settings.py.example']},
      scripts=glob('bin/*'),
      data_files=list(webapp_content.items()) + storage_dirs + conf_files + examples,
      install_requires=['Django>=4.2,<5', 'django-tagging', 'pytz',
                        'pyparsing', 'cairocffi', 'urllib3', 'six'],
      classifiers=[
          'Intended Audience :: Developers',
          'Natural Language :: English',
          'License :: OSI Approved :: Apache Software License',
          'Programming Language :: Python',
          'Programming Language :: Python :: 3',
          'Programming Language :: Python :: 3.7',
          'Programming Language :: Python :: 3.8',
          'Programming Language :: Python :: 3.9',
          'Programming Language :: Python :: 3.10',
          'Programming Language :: Python :: Implementation :: CPython',
          'Programming Language :: Python :: Implementation :: PyPy',
      ],
      **setup_kwargs
    )
finally:
    with open('setup.cfg', 'w') as f:
        f.write(orig_setup_cfg)
