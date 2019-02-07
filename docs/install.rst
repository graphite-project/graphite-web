Installing Graphite
===================

There are several ways to install Graphite. Docker is the easiest way and is recommended for new
users. If you need to install Graphite directly on your system (not using Docker) then using
`Virtualenv`_ with `pip`_ would be recommended. With Virtualenv all dependencies are installed
isolated so they will not interfere with your system Python. Installation from source should
only be used in specific cases (e.g. installing a development release).

Docker
------

Try Graphite in Docker and have it running in seconds:

.. code-block:: bash

    docker run -d\
     --name graphite\
     --restart=always\
     -p 80:80\
     -p 2003-2004:2003-2004\
     -p 2023-2024:2023-2024\
     -p 8125:8125/udp\
     -p 8126:8126\
     graphiteapp/graphite-statsd

Check `docker repo`_ for details.

This is portable, fast and easy to use. Or use instructions below for installation.


Dependencies
------------
Graphite renders graphs using the Cairo graphics library. This adds dependencies on
several graphics-related libraries not typically found on a server. If you're installing from source
you can use the ``check-dependencies.py`` script to see if the dependencies have
been met or not.

Basic Graphite requirements:

* a UNIX-like Operating System
* Python 2.7 or greater (including Python 3)
* `cairocffi`_
* `Django`_ 1.8 - 2.1
* `django-tagging`_ 0.4.6 (not `django-taggit` yet)
* `pytz`_
* `scandir`_
* `fontconfig`_ and at least one font package (a system package usually)
* A WSGI server and web server. Popular choices are:

  - `Gunicorn`_ with `nginx`_

  - `Apache`_ with `mod_wsgi`_

  - `uWSGI`_ with `nginx`_

Additionally, the Graphite webapp and Carbon require the Whisper database library which
is part of the Graphite project.

There are also several other dependencies required for additional features:

* Render caching: `memcached`_ and `python-memcache`_
* LDAP authentication: `python-ldap`_ (for LDAP authentication support in the webapp)
* AMQP support: `txamqp`_ (version 0.8 is required)
* RRD support: `python-rrdtool`_
* Dependent modules for additional database support (MySQL, PostgreSQL, etc). See
  `Django database install`_ instructions and the `Django database`_ documentation for details
* `pyhash`_ fnv1_ch hashing support

.. seealso:: On some systems it is necessary to install fonts for Cairo to use. If the
             webapp is running but all graphs return as broken images, this may be why.

             * https://answers.launchpad.net/graphite/+question/38833
             * https://answers.launchpad.net/graphite/+question/133390
             * https://answers.launchpad.net/graphite/+question/127623

Fulfilling Dependencies
-----------------------
Most current Linux distributions have all of the requirements available in the base packages.
Python module dependencies can be install with `pip`_ rather than system packages if desired
or if using a Python version that differs from the system default. Some modules (such as Cairo)
may require library development headers to be available.


RHEL/Centos 7
^^^^^^^^^^^^^
For RHEL based distributions enable the `EPEL`_ repository.

.. code-block:: bash

   yum install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
   yum install dejavu-sans-fonts dejavu-serif-fonts python-pip python-virtualenv cairo

Debian
^^^^^^
.. code-block:: bash

   apt-get install python-dev libcairo2-dev libffi-dev build-essential

.. note:: This might be outdated

Ubuntu 18.04
^^^^^^^^^^^^
.. code-block:: bash

   apt-get install python-pip libcairo2

.. _default-installation-layout :

Default Installation Layout
---------------------------

Graphite traditionally installed all components in ``/opt/graphite``, since release 1.2.0
Graphite's installation location depends on your `Python prefix`_. If you are using `Virtualenv`_
the ``prefix`` is set to the root of your virtualenv. For more information on custom prefixes
see `Custom Installation Locations`_. See the release notes for :doc:`upgrading </releases/1_2_0>`

You can find your ``prefix`` by running:

.. code-block:: bash

   python -c 'import sys; print(sys.prefix)'

Directory layout:

- ``PREFIX/`` Usually ``/opt/graphite/``

  - ``conf/`` Carbon configuration files

  - ``storage/``

    - ``log`` Log directory for Carbon and Graphite-web

    - ``rrd`` Location for RRD files to be read

    - ``whisper`` Location for Whisper data files to be stored and read

    - ``ceres`` Location for Ceres data files to be stored and read


.. note:: Graphite-web's config file `local_settings.py` is located in the project
          :doc:`directory </config-local-settings>`

Using Virtualenv
----------------
`Virtualenv`_ provides an isolated Python environment to run Graphite in. It is recommended to
install Graphite in Virtualenv so that dependent libraries will not interfere with other
applications.

Create a virtualenv in ``/opt/graphite`` and activate it:

.. code-block:: bash

    virtualenv /opt/graphite
    source /opt/graphite/bin/activate

Once the virtualenv is activated, Graphite and Carbon can be installed the regular way
:ref:`via pip <install-pip>` or :ref:`from source <install-source>`.

.. note:: Before installing dependencies or running Graphite the virtualenv needs to be
   activated. Deactivating virtualenv can be done by running ``deactivate``.

.. _install-pip :

Installing From Pip
-------------------

Versioned Graphite releases can be installed via `pip`_. When installing with pip,
installation of Python package dependencies will automatically be attempted.

To install Graphite execute:

.. code-block:: bash

    pip install whisper
    pip install carbon
    pip install graphite-web

.. _install-source :

Installing From Source
----------------------

The latest source releases for Graphite-web, Carbon, and Whisper may be fetched from the
GitHub release pages:

* `Whisper releases <https://github.com/graphite-project/whisper/releases>`_
* `Carbon releases <https://github.com/graphite-project/carbon/releases>`_
* `Graphite-web releases <https://github.com/graphite-project/graphite-web/releases>`_

The latest development branches may be cloned from the `GitHub project page`_:

.. code-block:: bash

   git clone https://github.com/graphite-project/whisper.git
   git clone https://github.com/graphite-project/carbon.git
   git clone https://github.com/graphite-project/graphite-web.git


To install with pip (which will automatically install dependent Python libraries):

.. code-block:: bash

   pip install ./whisper/
   pip install ./carbon/
   pip install ./graphite-web/

Or without using pip, run from every directory:

.. code-block:: bash

   python setup.py install --single-version-externally-managed

Initial Configuration
---------------------

.. toctree::
   :maxdepth: 2

   config-webapp-setup
   config-webapp
   config-local-settings
   config-carbon


Help! It didn't work!
---------------------
If you run into any issues with Graphite, please to post a question to our
`Questions forum on Launchpad <https://answers.launchpad.net/graphite>`_
or join us on IRC in #graphite on FreeNode.


Post-Install Tasks
------------------

:doc:`Configuring Carbon </config-carbon>`
    Once you've installed everything you will need to create some basic configuration.
    Initially none of the config files are created by the installer but example files
    are provided. Simply copy the ``.example`` files and customize.

:doc:`Feeding In Your Data </feeding-carbon>`
    Once it's up and running, you need to feed it some data.

:doc:`Configuring The Webapp </config-webapp>`
    With data getting into carbon, you probably want to look at graphs of it.
    So now we turn our attention to the webapp.

Windows Users
-------------
Unfortunately, native Graphite on Windows is unsupported, but you can run Graphite on Windows in `Docker`_.


.. _Apache: https://projects.apache.org/project.html?httpd-http_server
.. _cairocffi: https://pythonhosted.org/cairocffi/
.. _Django: http://www.djangoproject.com/
.. _django-tagging: http://django-tagging.readthedocs.io/
.. _Django database install: https://docs.djangoproject.com/en/dev/topics/install/#get-your-database-running
.. _Django database: https://docs.djangoproject.com/en/dev/ref/databases/
.. _EPEL: http://fedoraproject.org/wiki/EPEL
.. _fontconfig: http://www.freedesktop.org/wiki/Software/fontconfig/
.. _gunicorn: http://gunicorn.org/
.. _memcached: http://memcached.org/
.. _mod_wsgi: https://modwsgi.readthedocs.io/
.. _nginx: http://nginx.org/
.. _NOT Python 3: https://python3wos.appspot.com/
.. _pip: https://pypi.org/project/pip/
.. _python-ldap: https://www.python-ldap.org/
.. _python-memcache: https://www.tummy.com/software/python-memcached/
.. _python-rrdtool: http://oss.oetiker.ch/rrdtool/prog/rrdpython.en.html
.. _python-sqlite2: https://github.com/ghaering/pysqlite
.. _pytz: https://pypi.python.org/pypi/pytz/
.. _scandir: https://pypi.python.org/pypi/scandir
.. _txAMQP: https://launchpad.net/txamqp/
.. _uWSGI: http://uwsgi-docs.readthedocs.io/
.. _Docker: https://www.docker.com/
.. _docker repo: https://github.com/graphite-project/docker-graphite-statsd
.. _Virtualenv: http://virtualenv.org/
.. _GitHub project page: http://github.com/graphite-project
.. _pyhash: https://pypi.org/project/pyhash/
.. _Python prefix: https://docs.python.org/3/library/sys.html#sys.prefix
.. _Custom Installation Locations: https://setuptools.readthedocs.io/en/latest/easy_install.html#custom-installation-locations
