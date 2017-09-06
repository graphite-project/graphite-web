Webapp Database Setup
=====================
You must tell Django to create the database tables used by the graphite webapp. This is very straight forward, especially if you are using the default SQLite setup.

The following configures the Django database settings. Graphite uses the database for storing user profiles, dashboards, and for the Events functionality. Graphite uses an SQLite database file located at ``STORAGE_DIR/graphite.db`` by default. If running multiple Graphite-web instances, a database such as PostgreSQL or MySQL is required so that all instances may share the same data source.

.. note ::
  As of Django 1.2, the database configuration is specified by the DATABASES
  dictionary instead of the old ``DATABASE_*`` format. Users must use the new
  specification to have a working database.

See the
`Django documentation <https://docs.djangoproject.com/en/dev/ref/settings/#databases>`_
for full documentation of the DATABASES setting.

.. note ::
  If you are using a custom database backend (other than SQLite) you must first create a $GRAPHITE_ROOT/webapp/graphite/local_settings.py file that overrides the database related settings from settings.py. Use $GRAPHITE_ROOT/webapp/graphite/local_settings.py.example as a template.

To set up a new database and create the initial schema, run:

.. code-block:: none

  PYTHONPATH=$GRAPHITE_ROOT/webapp django-admin.py migrate --settings=graphite.settings --run-syncdb

If you are experiencing problems, uncomment the following line in /opt/graphite/webapp/graphite/local_settings.py:

.. code-block:: none
  
  # DEBUG = True

and review your webapp logs. If you're using the default graphite-example-vhost.conf, your logs will be found in /opt/graphite/storage/log/webapp/.

If you're using the default SQLite database, your webserver will need permissions to read and write to the database file. So, for example, if your webapp is running in Apache as the 'nobody' user, you will need to fix the permissions like this:

.. code-block:: none
  
  sudo chown nobody:nobody /opt/graphite/storage/graphite.db
