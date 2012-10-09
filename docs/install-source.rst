Installing From Source
======================
The latest source tarballs for Graphite-web, Carbon, and Whisper may be fetched from the Graphite
project `download page`_ or the latest development branches may be cloned from the `Github project page`_:

* Graphite-web: ``git clone https://github.com/graphite-project/graphite-web.git``
* Carbon: ``git clone https://github.com/graphite-project/carbon.git``
* Whisper: ``git clone https://github.com/graphite-project/whisper.git``


Installing in the Default Location
----------------------------------
To install Graphite in the :ref:`default location <default-installation-layout>`, ``/opt/graphite/``, simply execute
``python setup.py install`` as root in each of the project directories for Graphite-web, Carbon, and Whisper.

.. _carbon-custom-location-source:

Installing Carbon in a Custom Location
--------------------------------------
Carbon's ``setup.py`` installer is configured to use a ``prefix`` of ``/opt/graphite`` and an
``install-lib`` of ``/opt/graphite/lib``. Carbon's lifecycle wrapper scripts and utilities
are installed in ``bin``, configuration within ``conf``, and stored data in ``storage`` all within ``prefix``.
These may be overridden by passing parameters to the ``setup.py install`` command.

The following parameters influence the install location:

- ``--prefix``

  Location to place the ``bin/`` and ``storage/`` and ``conf/`` directories (defaults to ``/opt/graphite/``)

- ``--install-lib``

  Location to install Python modules (default: ``/opt/graphite/lib``)

- ``--install-data``

  Location to place the ``storage`` and ``conf`` directories (default: value of ``prefix``)

- ``--install-scripts``

  Location to place the scripts (default: ``bin/`` inside of ``prefix``)


For example, to install everything in ``/srv/graphite/``:

.. code-block:: none

   python setup.py install --prefix=/srv/graphite --install-lib=/srv/graphite/lib

To install Carbon into the system-wide site-packages directory with scripts in ``/usr/bin`` and storage and
configuration in ``/usr/share/graphite``:

.. code-block:: none

   python setup.py install --install-scripts=/usr/bin --install-lib=/usr/lib/python2.6/site-packages --install-data=/var/lib/graphite

.. _graphite-web-custom-location-source:

Installing Graphite-web in a Custom Location
--------------------------------------------
Graphite-web's ``setup.py`` installer is configured to use a ``prefix`` of ``/opt/graphite`` and an ``install-lib`` of ``/opt/graphite/webapp``. Utilities are installed in ``bin``, and configuration in ``conf`` within the ``prefix``. These may be overridden by passing parameters to ``setup.py install``

The following parameters influence the install location:

- ``--prefix``

  Location to place the ``bin/`` and ``conf/`` directories (defaults to ``/opt/graphite/``)

- ``--install-lib``

  Location to install Python modules (default: ``/opt/graphite/webapp``)

- ``--install-data``

  Location to place the ``webapp/content`` and ``conf`` directories (default: value of ``prefix``)

- ``--install-scripts``

  Location to place scripts (default: ``bin/`` inside of ``prefix``)


For example, to install everything in ``/srv/graphite/``:

.. code-block:: none

   python setup.py install --prefix=/srv/graphite --install-lib=/srv/graphite/webapp

To install the Graphite-web code into the system-wide site-packages directory with scripts in ``/usr/bin`` and storage configuration, and content in ``/usr/share/graphite``:

.. code-block:: none

   python setup.py install --install-scripts=/usr/bin --install-lib=/usr/lib/python2.6/site-packages --install-data=/var/lib/graphite

.. _Github project page: http://github.com/graphite-project
.. _download page: https://launchpad.net/graphite/+download
