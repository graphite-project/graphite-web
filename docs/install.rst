Installing Graphite
===================

Docker
------

Try Graphite in Docker and have it running in seconds:

.. code-block:: none

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
* Python 2.7 or greater (including experimental Python3 support)
* `cairocffi`_
* `Django`_ 1.8 - 1.11 (for Python3 - 1.11 only)
* `django-tagging`_ 0.4.6 (not `django-taggit` yet)
* `pytz`_
* `scandir`_
* `fontconfig`_ and at least one font package (a system package usually)
* A WSGI server and web server. Popular choices are:

  - `Apache`_ with `mod_wsgi`_

  - `gunicorn`_ with `nginx`_

  - `uWSGI`_ with `nginx`_

Additionally, the Graphite webapp and Carbon require the Whisper database library which
is part of the Graphite project.

There are also several other dependencies required for additional features:

* Render caching: `memcached`_ and `python-memcache`_
* LDAP authentication: `python-ldap`_ (for LDAP authentication support in the webapp)
* AMQP support: `txamqp`_ (version 0.8 is required)
* RRD support: `python-rrdtool`_
* Dependent modules for additional database support (MySQL, PostgreSQL, etc). See `Django database install`_ instructions and the `Django database`_ documentation for details

.. seealso:: On some systems it is necessary to install fonts for Cairo to use. If the
             webapp is running but all graphs return as broken images, this may be why.

             * https://answers.launchpad.net/graphite/+question/38833
             * https://answers.launchpad.net/graphite/+question/133390
             * https://answers.launchpad.net/graphite/+question/127623

Fulfilling Dependencies
-----------------------
Most current Linux distributions have all of the requirements available in the base packages.
RHEL based distributions may require the `EPEL`_ repository for requirements.
Python module dependencies can be install with `pip`_ rather than system packages if desired or if using
a Python version that differs from the system default. Some modules (such as Cairo) may require
library development headers to be available.

.. _default-installation-layout :

Default Installation Layout
---------------------------

Graphite defaults to an installation layout that puts the entire install in its own directory: ``/opt/graphite``

Whisper
^^^^^^^
Whisper is installed Python's system-wide site-packages directory with Whisper's utilities installed
in the bin dir of the system's default prefix (generally ``/usr/bin/``).

Carbon and Graphite-web
^^^^^^^^^^^^^^^^^^^^^^^
Carbon and Graphite-web are installed in ``/opt/graphite/`` with the following layout:

- ``bin/``
- ``conf/``
- ``lib/``

  Carbon ``PYTHONPATH``

- ``storage/``

  - ``log``

    Log directory for Carbon and Graphite-web

  - ``rrd``

    Location for RRD files to be read

  - ``whisper``

    Location for Whisper data files to be stored and read

  - ``ceres``

    Location for Ceres data files to be stored and read

- ``webapp/``

  Graphite-web ``PYTHONPATH``

  - ``graphite/``

    Location of ``local_settings.py``

  - ``content/``

    Graphite-web static content directory


Installing Graphite
-------------------
Several installation options exist:

.. toctree::
   :maxdepth: 2

   install-source
   install-pip
   install-virtualenv
   install-synthesize


Initial Configuration
---------------------

.. toctree::
   :maxdepth: 2
   
   config-database-setup
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

:doc:`Administering Carbon </admin-carbon>`
    Once Carbon is configured, you need to start it up.

:doc:`Feeding In Your Data </feeding-carbon>`
    Once it's up and running, you need to feed it some data.

:doc:`Configuring The Webapp </config-webapp>`
    With data getting into carbon, you probably want to look at graphs of it.
    So now we turn our attention to the webapp.

:doc:`Administering The Webapp </admin-webapp>`
    Once its configured you'll need to get it running.

:doc:`Using the Composer </composer>`
    Now that the webapp is running, you probably want to learn how to use it.


Windows Users
-------------
Unfortunately, native Graphite on Windows is completely unsupported, but you can run Graphite on Windows in `Docker`_ or the :doc:`Installing via Synthesize </install-synthesize>` article will help you set up a Vagrant VM that will run Graphite.  In order to leverage this, you will need to install `Vagrant <https://www.vagrantup.com/>`_.


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
.. _pip: https://pip.pypa.io/
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
