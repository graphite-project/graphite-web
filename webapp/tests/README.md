# Graphite-Web Test Framework

## Overview

These Graphite-Web unit tests are for the Django portions of the graphite-web code base.  They utilize the Django test framework and run via `manage.py test`.

For pull-requests, the tests run inside of Travis-ci using Python tox (https://pypi.python.org/pypi/tox) to invoke the tests across all the environments defined in tox.ini.

The current tox.ini configuration uses Python coverage (http://coverage.readthedocs.io/en/latest/) to invoke `manage.py` and capture the code coverage levels.

## Installation, Configuration and Usage


### Example Tox invocations to run unit tests manually

Invoke `tox` in the root of the tree and all tests across all environments will be run serially.

To run only a specific test suite run (aka. run the file tests/test_finders.py):
`tox -- tests.test_finders`

To run only a specific class in a test suite run:

`tox -- tests.test_metrics.MetricsTester`

To run only a specific test within a test suite's class run:

`tox -- tests.test_metrics.MetricsTester.test_index_json`

The environment can be pass in the above examples.
`tox -e py27-django19-pyparsing2 -- tests.test_metrics.MetricsTester.test_index_json`

### Generating html coverage report

Run `coverage html` from the webapp directory.  Afterwards, the webapp/htmlcov/index.html file can be loaded in a browser and the coverage map for the tested code can be evaluated.

### Setting up an environment to test in
There may need to be additional system packages or python dependencies installed in order for tox to successfully install the required packages for the tests.


## License

Graphite-Web is licensed under version 2.0 of the Apache License. See the [LICENSE](https://github.com/graphite-project/graphite-web/blob/master/LICENSE) file for details.
