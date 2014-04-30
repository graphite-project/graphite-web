#!/usr/bin/env python
# coding: utf-8
import os


from setuptools import setup, find_packages
setup_kwargs = dict(zip_safe=0)

storage_dirs = []

for subdir in ('whisper', 'ceres', 'rrd', 'log', 'log/webapp'):
    storage_dirs.append( ('storage/%s' % subdir, []) )



setup(
    name='graphite-query',
    version='0.10.2',
    url='https://github.com/edin1/graphite-query',
    author="edin1, based on Chris Davis's graphite-web"\
        "and Bruno Renié's graphite-api",
    license='Apache Software License 2.0',
    description="Utilities for querying graphite's database",
    install_requires=open("install_requires.txt").read().split(),
    packages=find_packages(),#exclude=['tests']),
    package_data={'graphite' :
        ['local_settings.py.example']},
    data_files= storage_dirs,
    test_suite="tests",
    tests_require=open("tests_require.txt").read().split(),
    classifiers=(
        'Development Status :: 3 - Alpha',
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'License :: OSI Approved :: Apache Software License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.6',
        'Programming Language :: Python :: 2.7',
        'Topic :: Scientific/Engineering :: Information Analysis',
        'Topic :: System :: Monitoring',
    ),
    **setup_kwargs
)
