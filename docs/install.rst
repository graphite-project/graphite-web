Installing Graphite
===================

Dependencies
------------
Graphite renders graphs using the Cairo graphics library. This adds dependencies on
several graphics-related libraries not typically found on a server. If you're installing from source
you can use the ``check-dependencies.py`` script to see if the dependencies have
been met or not.

Basic Graphite requirements:

* Python 2.4 or greater (2.6+ recommended)
* `Pycairo`_
* `Django`_ 1.0 or greater
* `django-tagging`_ 0.3.1 or greater
* `Twisted`_ 8.0 or greater (10.0+ recommended)
* `zope-interface`_ (often included in Twisted package dependency)
* `fontconfig`_ and at least one font package (a system package usually)
* A WSGI server and web server. Popular choices are:
  - `Apache`_ with `mod_wsgi`_ and `mod_python`_
  - `gunicorn`_ with `nginx`_
  - `uWSGI`_ with `nginx`_

Python 2.4 and 2.5 have extra requirements:

* `simplejson`_
* `python-sqlite2`_ or another Django-supported database module

Additionally, the Graphite webapp and Carbon require the whisper database library which
is part of the Graphite project.

There are also several other dependencies required for additional features:

* Render caching: `memcached`_ and `python-memcache`_
* LDAP authentication: `python-ldap`_ (for LDAP authentication support in the webapp)
* AMQP support: `txamqp`_
* RRD support: `python-rrdtool`_

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

Installing From Source
----------------------
You can download the latest source tarballs for Graphite-web, Carbon, and Whisper
from the Graphite project page, https://launchpad.net/graphite or clone the latest version using
Bazaar: ``bzr branch lp:graphite``

To install, simply extract the source and run ``python setup.py install`` as root in the project
directories for Whisper, Carbon, and Graphite-web (the root of the repository in the case of a
source tree checkout).

This will install Whisper as a site-package, while Carbon and Graphite will be
installed in ``/opt/graphite/``.


Help! It didn't work!
---------------------
If you run into any issues with Graphite, feel free to post a question to our
`Questions forum on Launchpad <https://answers.launchpad.net/graphite>`_
or join us on IRC in #graphite on FreeNode


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

.. _Apache: http://projects.apache.org/projects/http_server.html
.. _Django: http://www.djangoproject.com/
.. _django-tagging: http://code.google.com/p/django-tagging/
.. _EPEL: http://fedoraproject.org/wiki/EPEL/
.. _fontconfig: http://www.freedesktop.org/wiki/Software/fontconfig/
.. _gunicorn: http://gunicorn.org/
.. _memcached: http://memcached.org/
.. _mod_python: http://www.modpython.org/
.. _mod_wsgi: http://code.google.com/p/modwsgi/
.. _nginx: http://nginx.org/
.. _pip: http://www.pip-installer.org/
.. _Pycairo: http://www.cairographics.org/pycairo/
.. _python-ldap: http://www.python-ldap.org/
.. _python-memcache: http://www.tummy.com/Community/software/python-memcached/
.. _python-rrdtool: http://oss.oetiker.ch/rrdtool/prog/rrdpython.en.html
.. _python-sqlite2: http://code.google.com/p/pysqlite/
.. _simplejson: http://pypi.python.org/pypi/simplejson/
.. _Twisted: http://twistedmatrix.com/
.. _txAMQP: https://launchpad.net/txamqp/
.. _uWSGI: http://projects.unbit.it/uwsgi/
.. _zope.interface: http://pypi.python.org/pypi/zope.interface/
