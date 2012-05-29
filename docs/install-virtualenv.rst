Installing in Virtualenv
========================
`Virtualenv`_ provides an isolated Python environment to run Graphite in.

Installing in the Default Location
----------------------------------
To install Graphite in the :ref:`default location <default-installation-layout>`, ``/opt/graphite/``,
create a virtualenv in ``/opt/graphite`` and activate it:

.. code-block:: none

  virtualenv /opt/graphite
  source /opt/graphite/bin/activate

Once the virtualenv is activated, Graphite and Carbon can be installed
:doc:`from source <install-source>` or :doc:`via pip <install-pip>`. Note that dependencies will
need to be installed while the virtualenv is activated unless
`--system-site-packages <http://www.virtualenv.org/en/latest/index.html#the-system-site-packages-option>`_
is specified at virtualenv creation time.

Installing in a Custom Location
-------------------------------
To install from source activate the virtualenv and see the instructions for :ref:`graphite-web <graphite-web-custom-location-source>` and :ref:`carbon <carbon-custom-location-source>`

Running Carbon Within Virtualenv
--------------------------------
Carbon may be run within Virtualenv by `activating virtualenv`_ before Carbon is started

Running Graphite-web Within Virtualenv
--------------------------------------
Running Django's manage.py within virtualenv requires `activating virtualenv`_ before executing
as normal.

The method of running Graphite-web within Virtualenv depends on the WSGI server used:

Apache mod_wsgi
^^^^^^^^^^^^^^^
.. note::

  The version Python used to compile mod_wsgi must match the Python installed in the virtualenv (generally the system Python)

To the Apache `mod_wsgi`_ config, add the root of the virtualenv as ``WSGIPythonHome``, ``/opt/graphite``
in this example:

.. code-block:: none

   WSGIPythonHome /opt/graphite

and add the virtualenv's python site-packages to the ``graphite.wsgi`` file, python 2.6 in ``/opt/graphite``
in this example:

.. code-block:: none

   site.addsitedir('/opt/graphite/lib/python2.6/site-packages')

See the `mod_wsgi documentation on Virtual Environments <http://code.google.com/p/modwsgi/wiki/VirtualEnvironments>` for more details.

Gunicorn
^^^^^^^^
Ensure `Gunicorn`_ is installed in the activated virtualenv and execute as normal. If gunicorn is
installed system-wide, it may be necessary to execute it from the virtualenv's bin path

uWSGI
^^^^^
Execute `uWSGI`_ using the ``-H`` option to specify the virtualenv root. See the `uWSGI documentation on virtualenv <http://projects.unbit.it/uwsgi/wiki/VirtualEnv>`_ for more details.


.. _activating virtualenv: http://www.virtualenv.org/en/latest/index.html#activate-script
.. _Gunicorn: http://gunicorn.org/
.. _mod_wsgi: http://code.google.com/p/modwsgi/
.. _uWSGI: http://projects.unbit.it/uwsgi
.. _Virtualenv: http://virtualenv.org/

