#!/usr/bin/env python

from glob import glob
from collections import defaultdict
from setuptools import setup
import os


storage_dirs = []

for subdir in ('whisper/dummy.txt', 'ceres/dummy.txt', 'rrd/dummy.txt',
               'log/dummy.txt', 'log/webapp/dummy.txt'):
    storage_dirs.append( ('storage/%s' % subdir, []) )

webapp_content = defaultdict(list)

for root, dirs, files in os.walk('webapp/content'):
    for filename in files:
        filepath = os.path.join(root, filename)
        webapp_content[root].append(filepath)

conf_files = [('conf', glob('conf/*.example'))]
examples = [('examples', glob('examples/example-*'))]


def read(fname):
    with open(os.path.join(os.path.dirname(__file__), fname)) as f:
        return f.read()


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
    install_requires=['Django>=1.8,<2.1', 'django-tagging==0.4.3', 'pytz',
                      'pyparsing', 'cairocffi', 'urllib3', 'scandir', 'six'],
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
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: Implementation :: CPython',
        'Programming Language :: Python :: Implementation :: PyPy',
    ],
    zip_safe=False
)
