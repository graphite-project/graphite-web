Working on Graphite-web
-----------------------

Graphite-web accepts contributions on `GitHub
<https://github.com/graphite-project/graphite-web>`_, in the form of issues or
pull requests. If you're comfortable with Python, here is how to get started.

First, keep in mind that Graphite-web supports Python versions **2.6 to 2.7**
and Django versions **1.4 and above**.

Setting up a development environment
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The recommended workflow is to use `virtualenv`_ / `virtualenvwrapper`_ to
isolate projects between each other. This document uses virtualenv as the
lowest common denominator.

.. _virtualenv: http://www.virtualenv.org/
.. _virtualenvwrapper: http://virtualenvwrapper.readthedocs.io/

Create a virtualenv at the root of your graphite-web repository::

    virtualenv env
    source env/bin/activate

Install the required dependencies::

    pip install -r requirements.txt

Create the default storage directories::

    mkdir -p storage/{ceres,whisper,log/webapp}

Then you should be able to run the graphite development server::

    cd webapp
    ./manage.py runserver

Running the tests
^^^^^^^^^^^^^^^^^

To run the tests for the Python and Django versions of your virtualenv::

    cd webapp
    ./manage.py test --settings=tests.settings

If you want to run the tests for all combinations of Python and Django
versions, you can use the `tox`_ tool.

.. _tox: http://tox.readthedocs.io/

::

    pip install tox
    tox

This will run the tests for all configurations declared in the ``tox.ini``
file at the root of the repository.

You can see all the configurations available by running::

    tox -l

You can run a single configuration with::

    tox -e <configuration>

Note that you need the corresponding python version on your system. Most
systems only provide one or two different python versions, it is up to you to
install other versions.

Writing tests
^^^^^^^^^^^^^

Pull requests for new features or bugfixes should come with tests to
demonstrate that your feature or fix actually works. Tests are located in the
``webapp/tests`` directory.

When writing a new test, look at the existing files to see if your test would
fit in one. Otherwise simply create a new file named ``test_<whatever>.py``
with the following content:

.. code-block:: python

    from django.test import TestCase

    class WhateverTest(TestCase):
        def test_something(self):
            self.assertEqual(1, 2 / 2)

You can read `Django's testing docs
<https://docs.djangoproject.com/en/stable/topics/testing/>`_ for more
information on ``django.test.TestCase`` and how tests work with Django.
