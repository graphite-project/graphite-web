Graphite-web's local_settings.py
================================
Graphite-web uses the convention of importing a ``local_settings.py`` file from the webapp ``settings.py`` module. This is where Graphite-web's runtime configuration is loaded from.


Config File Location
--------------------
``local_settings.py`` is generally located within the main ``graphite`` module where the webapp's code lives. In the :ref:`default installation layout <default-installation-layout>` this is ``/opt/graphite/webapp/graphite/local_settings.py``. Alternative locations can be used by symlinking to this path or by ensuring the module can be found within the Python module search path.


General Settings
----------------
TIME_ZONE
  `Default: America/Chicago`

  Set your local timezone. Timezone is specifed using
  `zoneinfo names <http://en.wikipedia.org/wiki/Zoneinfo#Names_of_time_zones>`_.

DOCUMENTATION_URL
  `Default: http://graphite.readthedocs.org/`

  Overrides the `Documentation` link used in the header of the Graphite Composer.

LOG_RENDERING_PERFORMANCE
  `Default: False`

  Triggers the creation of ``rendering.log`` which logs timings for calls to the :doc:`render_api`.

LOG_CACHE_PERFORMANCE
  `Default: False`

  Triggers the creation of ``cache.log`` which logs timings for remote calls to `carbon-cache` as well as Request Cache (memcached) hits and misses.

LOG_METRIC_ACCESS
  `Default: False`

  Triggers the creation of ``metricaccess.log`` which logs access to `Whisper` and `RRD` data files.

DEBUG = True
  `Default: False`

  Enables generation of detailed Django error pages. See `Django's documentation <https://docs.djangoproject.com/en/dev/ref/settings/#debug>`_ for details.

FLUSHRRDCACHED
  `Default: <unset>`

  If set, executes ``rrdtool flushcached`` before fetching data from RRD files. Set to the address or socket of the rrdcached daemon. Ex: ``unix:/var/run/rrdcached.sock``

MEMCACHE_HOSTS
  `Default: []`

  If set, enables the caching of calculated targets (including applied functions) and rendered images. If running a cluster of Graphite webapps, each webapp should have the exact same values for this setting to prevent unneeded cache misses.

  Set this to the list of memcached hosts. Ex: ``['10.10.10.10:11211', '10.10.10.11:11211', '10.10.10.12:11211']``

DEFAULT_CACHE_DURATION
  `Default: 60`

  Default expiration of cached data and images.


Filesystem Paths
----------------
These settings configure the location of Graphite-web's additional configuration files, static content, and data. These need to be adjusted if Graphite-web is installed outside of the :ref:`default installation layout <default-installation-layout>`.

GRAPHITE_ROOT
  `Default: /opt/graphite`
  The base directory for the Graphite install. This setting is used to shift the Graphite install from the default base directory which keeping the :ref:`default layout <default-installation-layout>`. The paths derived from this setting can be individually overridden as well.

CONF_DIR
  `Default: GRAPHITE_ROOT/conf`
  The location of additional Graphite-web configuration files.

STORAGE_DIR
  `Default: GRAPHITE_ROOT/storage`
  The base directory from which WHISPER_DIR, RRD_DIR, LOG_DIR, and INDEX_FILE default paths are referenced.

STATIC_ROOT
  `Default: See below`
  The location of Graphite-web's static content. This defaults to ``static/`` three parent directories up from ``settings.py``. In the :ref:`default layout <default-installation-layout>` this is ``/opt/graphite/static``.

  This directory doesn't even exists once you've installed graphite. It needs
  to be populated with the following command::

      django-admin.py collectstatic --noinput --settings=graphite.settings

  This collects static files for graphite-web and external apps (namely, the Django admin app) and puts them in a directory that needs to be available under the ``/static/`` URL of your web server. To configure Apache::

      Alias /static/ "/opt/graphite/static"

  For Nginx::

      location /static/ {
          alias /opt/graphite/static/;
      }

  Alternatively, static files can be served directly by the Graphite webapp if you install the ``whitenoise`` Python package.

DASHBOARD_CONF
  `Default: CONF_DIR/dashboard.conf`
  The location of the Graphite-web Dashboard configuration.

GRAPHTEMPLATES_CONF
  `Default: CONF_DIR/graphTemplates.conf`
  The location of the Graphite-web Graph Template configuration.

WHISPER_DIR
  `Default: /opt/graphite/storage/whisper`
  The location of Whisper data files.

RRD_DIR
  `Default: /opt/graphite/storage/rrd`
  The location of RRD data files.

STANDARD_DIRS
  `Default: [WHISPER_DIR, RRD_DIR]`
  The list of directories searched for data files. By default, this is the value of WHISPER_DIR and RRD_DIR (if rrd support is detected). If this setting is defined, the WHISPER_DIR and RRD_DIR settings have no effect.

LOG_DIR
  `Default: STORAGE_DIR/log/webapp`
  The directory to write Graphite-web's log files. This directory must be writable by the user running the Graphite-web webapp.

INDEX_FILE
  `Default: /opt/graphite/storage/index`
  The location of the search index file. This file is generated by the `build-index.sh` script and must be writable by the user running the Graphite-web webapp.


Configure Webserver (Apache)
----------------------------
There is an example ``example-graphite-vhost.conf`` file in the examples directory of the graphite web source code. You can use this to configure apache. Different distributions have different ways of configuring Apache. Please refer to your distribution's documentation on the subject.

For example, Ubuntu uses ``/etc/apache2/sites-available`` and ``sites-enabled/`` to handle this (A symlink from ``sites-enabled/`` to ``sites-available/`` would be used after placing the file in sites-available/).

Others use an Include directive in the ``httpd.conf`` file like this:

.. code-block:: none

    # This goes in httpd.conf
    Include /usr/local/apache2/conf/vhosts.d/*.conf

The configuration files must then all be added to ``/usr/local/apache2/conf/vhosts.d/``.
Still others may not help handle this at all and you must add the configuration to your http.conf file directly.

Graphite will be in the DocumentRoot of your webserver, and will not allow you to access plain-HTML in subdirectories without addition configuration. You may want to edit the ``example-graphite-vhosts.conf`` file to change port numbers or use additional ``"SetHandler None"`` directives to allow access to other directories.

Be sure to reload your Apache configuration by running ``sudo /etc/init.d/apache2 reload`` or ``sudo /etc/init.d/httpd reload``.


Email Configuration
-------------------
These settings configure Django's email functionality which is used for emailing rendered graphs. See the `Django documentation <https://docs.djangoproject.com/en/dev/topics/email/>`__ for further detail on these settings.

EMAIL_BACKEND
  `Default: django.core.mail.backends.smtp.EmailBackend`
  Set to ``django.core.mail.backends.dummy.EmailBackend`` to drop emails on the floor and effectively disable email features.

EMAIL_HOST
  `Default: localhost`

EMAIL_PORT
  `Default: 25`

EMAIL_HOST_USER
  `Default: ''`

EMAIL_HOST_PASSWORD
  `Default: ''`

EMAIL_USE_TLS
  `Default: False`


Authentication Configuration
----------------------------
These settings insert additional backends to the `AUTHENTICATION_BACKENDS <https://docs.djangoproject.com/en/dev/ref/settings/#authentication-backends>`_ and `MIDDLEWARE_CLASSES <https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-MIDDLEWARE_CLASSES>`_ settings. Additional authentication schemes are possible by manipulating these lists directly.

LDAP
^^^^
These settings configure a custom LDAP authentication backend provided by Graphite. Additional settings to the ones below are configurable setting the LDAP module's global options using ``ldap.set_option``. See the `module documentation <http://python-ldap.org/>`_ for more details.

.. code-block:: none

  # SSL Example
  import ldap
  ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_ALLOW)
  ldap.set_option(ldap.OPT_X_TLS_CACERTDIR, "/etc/ssl/ca")
  ldap.set_option(ldap.OPT_X_TLS_CERTFILE, "/etc/ssl/mycert.pem")
  ldap.set_option(ldap.OPT_X_TLS_KEYFILE, "/etc/ssl/mykey.pem")

USE_LDAP_AUTH
  `Default: False`

LDAP_SERVER
  `Default: ''`

  Set the LDAP server here or alternately in ``LDAP_URI``.

LDAP_PORT
  `Default: 389`

  Set the LDAP server port here or alternately in ``LDAP_URI``.

LDAP_URI
  `Default: None`

  Sets the LDAP server URI. E.g. ``ldaps://ldap.mycompany.com:636``

LDAP_SEARCH_BASE
  `Default: ''`

  Sets the LDAP search base. E.g. ``OU=users,DC=mycompany,DC=com``

LDAP_BASE_USER
  `Default: ''`

  Sets the base LDAP user to bind to the server with. E.g. ``CN=some_readonly_account,DC=mycompany,DC=com``

LDAP_BASE_PASS
  `Default: ''`

  Sets the password of the base LDAP user to bind to the server with.

LDAP_USER_QUERY
  `Default: ''`

  Sets the LDAP query to return a user object where ``%s`` substituted with the user id. E.g. ``(username=%s)`` or ``(sAMAccountName=%s)`` (Active Directory).


Other Authentications
^^^^^^^^^^^^^^^^^^^^^
USE_REMOTE_USER_AUTHENTICATION
  `Default: False`

  Enables the use of the Django `RemoteUserBackend` authentication backend. See the `Django documentation <https://docs.djangoproject.com/en/dev/howto/auth-remote-user/>`__ for further details.

REMOTE_USER_BACKEND
  `Default: "django.contrib.auth.middleware.RemoteUserMiddleware"`

  Enables the use of an alternative remote authentication backend.

LOGIN_URL
  `Default: /account/login`

  Modifies the URL linked in the `Login` link in the Composer interface. This is useful for directing users to an external authentication link such as for Remote User authentication or a backend such as `django_openid_auth <https://launchpad.net/django-openid-auth>`_.


Dashboard Authorization Configuration
-------------------------------------
These settings control who is allowed to save and delete dashboards. By default anyone can perform these actions, but by setting DASHBOARD_REQUIRE_AUTHENTICATION, users must at least be logged in to do so. The other two settings allow further restriction of who is able to perform these actions. Users who are not suitably authorized will still be able to use and change dashboards, but will not be able to save changes or delete dashboards.

DASHBOARD_REQUIRE_AUTHENTICATION
  `Default: False`

  If set to True, dashboards can only be saved and deleted by logged in users.

DASHBOARD_REQUIRE_EDIT_GROUP
  `Default: None`

  If set to the name of a user group, dashboards can only be saved and deleted by logged-in users who are members of this group.  Groups can be set in the Django Admin app, or in LDAP.

  Note that DASHBOARD_REQUIRE_AUTHENTICATION must be set to true - if not, this setting is ignored.

DASHBOARD_REQUIRE_PERMISSIONS
  `Default: False`

  If set to True, dashboards can only be saved or deleted by users having the appropriate (change or delete) permission (as set in the Django Admin app). These permissions can be set at the user or group level.  Note that Django's 'add' permission is not used.
  
  Note that DASHBOARD_REQUIRE_AUTHENTICATION must be set to true - if not, this setting is ignored.


Database Configuration
----------------------
The following configures the Django database settings. Graphite uses the database for storing user profiles, dashboards, and for the Events functionality. Graphite uses an SQLite database file located at ``STORAGE_DIR/graphite.db`` by default. If running multiple Graphite-web instances, a database such as PostgreSQL or MySQL is required so that all instances may share the same data source.

.. note ::
  As of Django 1.2, the database configuration is specified by the DATABASES
  dictionary instead of the old ``DATABASE_*`` format. Users must use the new
  specification to have a working database.

See the
`Django documentation <https://docs.djangoproject.com/en/dev/ref/settings/#databases>`_
for full documentation of the DATABASES setting.

.. note ::
  Remember, setting up a new database requires running ``PYTHONPATH=$GRAPHITE_ROOT/webapp django-admin.py syncdb --settings=graphite.settings`` to create the initial schema.

.. note ::
  If you are using a custom database backend (other than SQLite) you must first create a $GRAPHITE_ROOT/webapp/graphite/local_settings.py file that overrides the database related settings from settings.py. Use $GRAPHITE_ROOT/webapp/graphite/local_settings.py.example as a template.

If you are experiencing problems, uncomment the following line in /opt/graphite/webapp/graphite/local_settings.py:

.. code-block:: none
  
  # DEBUG = True

and review your webapp logs. If you're using the default graphite-example-vhost.conf, your logs will be found in /opt/graphite/storage/log/webapp/.

If you encounter problems with access to the database file, you may need to change ownership of the database file to the same user that owns the Apache processes.  If your distribution has apache run as user 'nobody':

.. code-block:: none
  
  sudo chown nobody:nobody /opt/graphite/storage/graphite.db


Cluster Configuration
---------------------
These settings configure the Graphite webapp for clustered use. When ``CLUSTER_SERVERS`` is set, metric browse and render requests will cause the webapp to query other webapps in CLUSTER_SERVERS for matching metrics. Graphite will use only one successfully matching response to render data. This means that metrics may only live on a single server in the cluster unless the data is consistent on both sources (e.g. with shared SAN storage). Duplicate metric data existing in multiple locations will *not* be combined.

CLUSTER_SERVERS
  `Default: []`

  The list of IP addresses and ports of remote Graphite webapps in a cluster. Each of these servers should have local access to metric data to serve. The first server to return a match for a query will be used to serve that data. Ex: ["10.0.2.2:80", "10.0.2.3:80"]

REMOTE_STORE_FETCH_TIMEOUT
  `Default: 6`

  Timeout for remote data fetches in seconds.

REMOTE_STORE_FIND_TIMEOUT
  `Default: 2.5`

  Timeout for remote find requests (metric browsing) in seconds.

REMOTE_STORE_RETRY_DELAY
  `Default: 60`

  Time in seconds to blacklist a webapp after a timed-out request.

REMOTE_FIND_CACHE_DURATION
  `Default: 300`

  Time to cache remote metric find results in seconds.

REMOTE_RENDERING
  `Default: False`

  Enable remote rendering of images and data (JSON, et al.) on remote Graphite webapps. If this is enabled, ``RENDERING_HOSTS`` must also be enabled and configured accordingly.

RENDERING_HOSTS
  `Default: []`

  List of IP addresses and ports of remote Graphite webapps used to perform rendering. Each webapp must have access to the same data as the Graphite webapp which uses this setting either through shared local storage or via ``CLUSTER_SERVERS``. Ex: ["10.0.2.4:80", "10.0.2.5:80"]

REMOTE_RENDER_CONNECT_TIMEOUT
  `Default: 1.0`

  Connection timeout for remote rendering requests in seconds.

CARBONLINK_HOSTS
  `Default: [127.0.0.1:7002]`

  If multiple carbon-caches are running on this machine, each should be listed here so that the Graphite webapp may query the caches for data that has not yet been persisted. Remote carbon-cache instances in a multi-host clustered setup should *not* be listed here. Instance names should be listed as applicable. Ex: ['127.0.0.1:7002:a','127.0.0.1:7102:b', '127.0.0.1:7202:c']

CARBONLINK_TIMEOUT
  `Default: 1.0`

  Timeout for carbon-cache cache queries in seconds.


Additional Django Settings
--------------------------
The ``local_settings.py.example`` shipped with Graphite-web imports ``app_settings.py`` into the namespace to allow further customization of Django. This allows the setting or customization of standard `Django settings <https://docs.djangoproject.com/en/dev/ref/settings/>`_ and the installation and configuration of additional `middleware <https://docs.djangoproject.com/en/dev/topics/http/middleware/>`_.

To manipulate these settings, ensure ``app_settings.py`` is imported as such:

.. code-block:: python

   from graphite.app_settings import *

The most common settings to manipulate are ``INSTALLED_APPS``, ``MIDDLEWARE_CLASSES``, and ``AUTHENTICATION_BACKENDS`` 
