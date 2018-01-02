# Graphite-Web Test Framework

## Overview

These Graphite-Web unit tests are for the Django portions of the graphite-web code base.  They utilize the Django test framework and run via `manage.py test`.

For pull-requests, the tests run inside of Travis-ci using Python tox (https://pypi.python.org/pypi/tox) to invoke the tests across all the environments defined in tox.ini.

The current tox.ini configuration uses Python coverage (http://coverage.readthedocs.io/en/latest/) to invoke `manage.py` and capture the code coverage levels.

## Installation, Configuration and Usage

### Example Tox invocations to run unit tests manually

Invoke `tox` in the root of the tree and all tests across all environments will be run serially.  There are currently 122 environment combinations (`tox -l` lists them all), so running tox without specifying an environment will take a while to run.

A set of minimum environments to run tests against are:
`py27-django111-pyparsing2`
`py35-django111-pyparsing2`
`lint`

Passing multiple environments to tox can be done by separating with commas:
`tox -e py27-django111-pyparsing2,py35-django111-pyparsing2,lint`

To run only a specific test suite run (aka. run the file tests/test_finders.py):
`tox -e py27-django111-pyparsing2,py35-django111-pyparsing2,lint -- tests.test_finders`

To run only a specific class in a test suite run (aka. run the MetricsTester class inside of test/test_metrics.py):

`tox -e py27-django111-pyparsing2,py35-django111-pyparsing2,lint -- tests.test_metrics.MetricsTester`

To run only a specific test within a test suite's class run:

`tox -e py27-django111-pyparsing2,py35-django111-pyparsing2,lint -- tests.test_metrics.MetricsTester.test_index_json`

### Minimum tests to verify

### Generating html coverage report

Run `coverage html` from the webapp directory.  Afterwards, the webapp/htmlcov/index.html file can be loaded in a browser and the coverage map for the tested code can be evaluated.

### Setting up an environment to test

There may need to be additional system packages or python dependencies installed in order for tox to successfully install the required packages for the tests.  Also, there may be system services running locally that are needed for the unit tests to complete successfully.

## License

Graphite-Web is licensed under version 2.0 of the Apache License. See the [LICENSE](https://github.com/graphite-project/graphite-web/blob/master/LICENSE) file for details.
