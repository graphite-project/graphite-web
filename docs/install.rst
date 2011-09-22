Installing Graphite
===================


Dependencies
------------
Since Graphite renders graphs using Cairo, it depends on several graphics-related
libraries not typically found on a server. If you're installing from source
you can use the ``check-dependencies.py`` script to see if the dependencies have
been met or not.

In general, Graphite requires:

* Python 2.4 or greater (2.6+ recommended)
* `Pycairo <http://www.cairographics.org/pycairo/>`_
* `Django <http://www.djangoproject.com/>`_ 1.0 or greater
* `django-tagging <http://code.google.com/p/django-tagging/>`_ 0.3.1
* A json module, if you're using Python2.6 this comes standard. With 2.4 you should
  install `simplejson <http://pypi.python.org/pypi/simplejson/>`_
* A Django-supported database module (sqlite comes standard with Python 2.6)
* `Twisted <http://twistedmatrix.com/>`_ 8.0 or greater (10.0+ recommended)


Also both the Graphite webapp and Carbon require the whisper database library.

There are also several optional dependencies, some of which are necessary for
high performance.

* Apache with mod_wsgi or mod_python (mod_wsgi preferred)
* memcached and `python-memcache <http://www.tummy.com/Community/software/python-memcached/>`_
* `python-ldap <http://www.python-ldap.org/>`_ (for LDAP authentication support in the webapp)
* `txamqp <https://launchpad.net/txamqp>`_ (for AMQP support in Carbon)

.. seealso:: On some systems it is necessary to install some fonts, if you get the
             webapp running and only see broken images instead of graphs, this is probably why.

             * https://answers.launchpad.net/graphite/+question/38833
             * https://answers.launchpad.net/graphite/+question/133390
             * https://answers.launchpad.net/graphite/+question/127623

Tips For Fulfilling Dependencies
--------------------------------
Usually the hardest dependency to fulfill is Pycairo because it requires Cairo,
which in turn requires fontconfig, etc... Often your distribution's package
manager will be able to install cairo and all of its dependencies for you, but
in order to build Pycairo (which is often *not* covered by the package manager)
you'll need the *cairo-devel* package so C headers are available.


Binary Packages
---------------
We are currently working on getting RPMs and DEB packages ready for Graphite.
As of this writing, Whisper is available in Ubuntu. To install it you can simply::

  apt-get install python-whisper

The Graphite webapp and Carbon do not yet have binary packages available.


Installing From Source
----------------------
You can download the latest source tarballs for grahite, carbon, and whisper
from the Graphite project page, https://launchpad.net/graphite

To install, simply extract the tarball and install like any other python package.

.. code-block:: bash

  # First we install whisper, as both Carbon and Graphite require it
  tar zxf whisper-0.9.8.tgz
  cd whisper-0.9.8/
  sudo python2.6 setup.py install
  cd ..
  # Now we install carbon
  tar zxf carbon-0.9.8.tgz
  cd carbon-0.9.8/
  sudo python2.6 setup.py install
  cd ..
  # Finally, the graphite webapp
  tar zxf graphite-web-0.9.8.tgz
  cd graphite-web-0.9.8/
  ./check-dependencies.py
  # once all dependencies are met...
  sudo python2.6 setup.py install

This will install whisper as a site-package, while Carbon and Graphite will be
installed in ``/opt/graphite/``.


Help! It didn't work!
---------------------
If you run into any issues with Graphite, feel free to post a question to our
`Questions forum on Launchpad <https://answers.launchpad.net/graphite>`_


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

That covers the basics, the next thing you should probably read about is
:doc:`The URL API </url-api>`.
