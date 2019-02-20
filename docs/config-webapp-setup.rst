Webapp Setup
============

Before Graphite-web can be started the database needs to be initialized and the static files need to be collected.

Database Setup
--------------

You must tell Django to create the database tables used by the graphite webapp. This is very straight forward, especially if you are using the default SQLite setup.

The following configures the Django database settings. Graphite uses the database for storing user profiles, dashboards, and for the Events functionality. Graphite uses an SQLite database file located at ``STORAGE_DIR/graphite.db`` by default. If running multiple Graphite-web instances, a database such as PostgreSQL or MySQL is required so that all instances may share the same data source.

See the
`Django documentation <https://docs.djangoproject.com/en/dev/ref/settings/#databases>`_
for full documentation of the DATABASES setting.

.. note ::
  If you are using a custom database backend (other than SQLite) you must first create a $GRAPHITE_ROOT/webapp/graphite/local_settings.py file that overrides the database related settings from settings.py. Use $GRAPHITE_ROOT/webapp/graphite/local_settings.py.example as a template.

To set up a new database and create the initial schema, run:

.. code-block:: none

  django-admin.py migrate --settings=graphite.settings

.. note::

   If you get a ``Could not import settings 'graphite.settings'`` error message add your ``PYTHONPATH`` in front of the command:
   ``PYTHONPATH=$GRAPHITE_ROOT/webapp django-admin.py migrate --settings=graphite.settings``

.. note ::
  Graphite-Web 1.0 and earlier had some models without migrations, and with Django 1.9 or later, the ``--run-syncdb`` option was needed for migrate to create tables for these models. (Django 1.8 and earlier did not have this option, but always exhibited this behavior.) In Graphite-Web 1.1 and later all models have migrations, so ``--run-syncdb`` is no longer needed. If upgrading a database created by Graphite-Web 1.0 or earlier, you need to use the ``--fake-initial`` option for migrate: it considers an initial migration to already be applied if the tables it creates already exist.


If you are experiencing problems, uncomment the following line in /opt/graphite/webapp/graphite/local_settings.py:

.. code-block:: none

  # DEBUG = True

and review your webapp logs. If you're using the default graphite-example-vhost.conf, your logs will be found in /opt/graphite/storage/log/webapp/.

If you're using the default SQLite database, your webserver will need permissions to read and write to the database file. So, for example, if your webapp is running in Apache as the 'nobody' user, you will need to fix the permissions like this:

.. code-block:: none

  sudo chown nobody:nobody /opt/graphite/storage/graphite.db
