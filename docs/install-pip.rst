Installing From Pip
===================

Versioned Graphite releases can be installed via `pip <http://pypi.python.org/pypi/pip>`_. When installing with pip, installation of Python package dependencies will automatically be attempted.

.. note::

  In order to install Graphite-Web and Carbon, you must first install some development headers.  In Debian-based distributions, this will require ``apt-get install python-dev libcairo2-dev libffi-dev build-essential``, and in Red Hat-based distributions you will run ``yum install python-devel cairo-devel libffi-devel``.

Installing in the Default Location
----------------------------------
To install Graphite in the :ref:`default location <default-installation-layout>`, ``/opt/graphite/``,
simply execute as root:

.. code-block:: none

    export PYTHONPATH="/opt/graphite/lib/:/opt/graphite/webapp/"
    pip install --no-binary=:all: https://github.com/graphite-project/whisper/tarball/master
    pip install --no-binary=:all: https://github.com/graphite-project/carbon/tarball/master
    pip install --no-binary=:all: https://github.com/graphite-project/graphite-web/tarball/master

.. note::

  If your version of ``pip`` is < 7.0.0 then no need to use ``--no-binary=:all:`` parameter

.. note::

  On RedHat-based systems using the ``python-pip`` package, the pip executable is named ``pip-python``

Installing Carbon in a Custom Location
--------------------------------------
Installation of Carbon in a custom location with `pip` is similar to doing so from a source install. Arguments to the underlying ``setup.py`` controlling installation location can be passed through `pip` with the ``--install-option`` option.

See :ref:`carbon-custom-location-source` for details of locations and available arguments

For example, to install everything in ``/srv/graphite/``:

.. code-block:: none

   pip install https://github.com/graphite-project/carbon/tarball/master --install-option="--prefix=/srv/graphite" --install-option="--install-lib=/srv/graphite/lib"

To install Carbon into the system-wide site-packages directory with scripts in ``/usr/bin`` and storage and
configuration in ``/usr/share/graphite``:

.. code-block:: none

   pip install https://github.com/graphite-project/carbon/tarball/master --install-option="--install-scripts=/usr/bin" --install-option="--install-lib=/usr/lib/python2.6/site-packages" --install-option="--install-data=/var/lib/graphite"

Installing Graphite-web in a Custom Location
--------------------------------------------
Installation of Graphite-web in a custom location with `pip` is similar to doing so from a source install.
Arguments to the underlying ``setup.py`` controlling installation location can be passed through `pip`
with the ``--install-option`` option.

See :ref:`graphite-web-custom-location-source` for details on default locations and available arguments

For example, to install everything in ``/srv/graphite/``:

.. code-block:: none

   pip install https://github.com/graphite-project/graphite-web/tarball/master --install-option="--prefix=/srv/graphite" --install-option="--install-lib=/srv/graphite/webapp"

To install the Graphite-web code into the system-wide site-packages directory with scripts in
``/usr/bin`` and storage configuration, and content in ``/usr/share/graphite``:

.. code-block:: none

   pip install https://github.com/graphite-project/graphite-web/tarball/master --install-option="--install-scripts=/usr/bin" --install-option="--install-lib=/usr/lib/python2.6/site-packages" --install-option="--install-data=/var/lib/graphite"

Installing Ceres
----------------
Ceres is an alternative storage backend that some choose to use in place of the default Whisper backend.

.. code-block:: none

    pip install https://github.com/graphite-project/ceres/tarball/master

