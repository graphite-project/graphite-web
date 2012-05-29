Installing From Pip
===================
Versioned Graphite releases can be installed via `pip <http://pypi.python.org/pypi/pip>`_. When installing with pip,
Installation of dependencies will automatically be attempted.

Installing in the Default Location
----------------------------------
To install Graphite in the :ref:`default location <default-installation-layout>`, ``/opt/graphite/``,
simply execute as root:

.. code-block:: none

    pip install whisper
    pip install carbon
    pip install graphite-web

.. note::

  On RedHat-based systems using the ``python-pip`` package, the pip executable is named ``pip-python``

Installing Carbon in a Custom Location
--------------------------------------
Installation of Carbon in a custom location with `pip` is similar to doing so from a source install.
Arguments to the underlying ``setup.py`` controlling installation location can be passed through `pip`
with the ``--install-option`` option.

See :ref:`carbon-custom-location-source` for details of locations and available arguments

For example, to install everything in ``/srv/graphite/``:

.. code-block:: none

   pip install carbon --install-option="--prefix=/srv/graphite" --install-option="--install-lib=/srv/graphite/lib"

To install Carbon into the system-wide site-packages directory with scripts in ``/usr/bin`` and storage and
configuration in ``/usr/share/graphite``:

.. code-block:: none

   pip install carbon --install-option="--install-scripts=/usr/bin" --install-option="--install-lib=/usr/lib/python2.6/site-packages" --install-option="--install-data=/var/lib/graphite"

Installing Graphite-web in a Custom Location
--------------------------------------------
Installation of Graphite-web in a custom location with `pip` is similar to doing so from a source install.
Arguments to the underlying ``setup.py`` controlling installation location can be passed through `pip`
with the ``--install-option`` option.

See :ref:`graphite-web-custom-location-source` for details on default locations and available arguments

For example, to install everything in ``/srv/graphite/``:

.. code-block:: none

   pip install graphite-web --install-option="--prefix=/srv/graphite" --install-option="--install-lib=/srv/graphite/webapp"

To install the Graphite-web code into the system-wide site-packages directory with scripts in
``/usr/bin`` and storage configuration, and content in ``/usr/share/graphite``:

.. code-block:: none

   pip install graphite-web --install-option="--install-scripts=/usr/bin" install-option="--install-lib=/usr/lib/python2.6/site-packages" --install-option="--install-data=/var/lib/graphite"

