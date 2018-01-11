Graphite-web's local_settings.py
================================
Graphite-web uses the convention of importing a ``local_settings.py`` file from the webapp ``settings.py`` module. This is where Graphite-web's runtime configuration is loaded from.


Config File Location
--------------------
``local_settings.py`` is generally located within the main ``graphite`` module where the webapp's code lives. In the :ref:`default installation layout <default-installation-layout>` this is ``/opt/graphite/webapp/graphite/local_settings.py``. Alternative locations can be used by symlinking to this path or by ensuring the module can be found within the Python module search path.


General Settings
----------------
URL_PREFIX
  `Default: /`

  Set the URL_PREFIX when deploying graphite-web to a non-root location.

SECRET_KEY
  `Default: UNSAFE_DEFAULT`

  This key is used for salting of hashes used in auth tokens, CRSF middleware, cookie storage, etc. This should be set identically among all nodes if used behind a load balancer.

ALLOWED_HOSTS
  `Default: *`

  In Django 1.5+ set the list of hosts from where your graphite instances is accessible.
  See: https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-ALLOWED_HOSTS

TIME_ZONE
  `Default: America/Chicago`

  Set your local timezone. Timezone is specified using `zoneinfo names <http://en.wikipedia.org/wiki/Zoneinfo#Names_of_time_zones>`_.

DATE_FORMAT
  `Default: %m/%d`

  Set the default short date format. See strftime(3) for supported sequences.

DOCUMENTATION_URL
  `Default: http://graphite.readthedocs.io/`

  Overrides the `Documentation` link used in the header of the Graphite Composer.

LOG_RENDERING_PERFORMANCE
  `Default: False`

  Triggers the creation of ``rendering.log`` which logs timings for calls to the :doc:`render_api`.

LOG_CACHE_PERFORMANCE
  `Default: False`

  Triggers the creation of ``cache.log`` which logs timings for remote calls to `carbon-cache` as well as Request Cache (memcached) hits and misses.

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

MEMCACHE_KEY_PREFIX
  `Default: graphite`

  Memcached prefix for graphite keys.

MEMCACHE_OPTIONS
  `Default: {}`

  Accepted options depend on the Memcached implementation and the Django version.
  Until Django 1.10, options are used only for pylibmc.
  Starting from 1.11, options are used for both python-memcached and pylibmc.

DEFAULT_CACHE_DURATION
  `Default: 60`

  Default expiration of cached data and images.

DEFAULT_CACHE_POLICY
  `Default: []`

  Metric data and graphs are cached for one minute by default. If defined, DEFAULT_CACHE_POLICY is a list of tuples of minimum query time ranges mapped to the cache duration for the results. This allows for larger queries to be cached for longer periods of times. All times are in seconds. An example configuration::

    DEFAULT_CACHE_POLICY = [(0, 60), # default is 60 seconds
                            (7200, 120), # >= 2 hour queries are cached 2 minutes
                            (21600, 180)] # >= 6 hour queries are cached 3 minutes


  This will cache any queries between 0 seconds and 2 hours for 1 minute, any queries between 2 and 6 hours for 2 minutes, and anything greater than 6 hours for 3 minutes. If the policy is empty or undefined, everything will be cached for DEFAULT_CACHE_DURATION.

AUTO_REFRESH_INTERVAL
  `Default: 60`

  Interval for the Auto-Refresh feature in the Composer, measured in seconds.

MAX_TAG_LENGTH
  `Default: 50`

  Graphite uses Django Tagging to support tags in Events. By default each tag is limited to 50 characters.

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
  The base directory from which WHISPER_DIR, RRD_DIR, CERES_DIR, LOG_DIR, and INDEX_FILE default paths are referenced.

STATIC_ROOT
  `Default: See below`
  The location of Graphite-web's static content. This defaults to ``static/`` three parent directories up from ``settings.py``. In the :ref:`default layout <default-installation-layout>` this is ``/opt/graphite/static``.

  This directory doesn't even exist once you've installed graphite. It needs to be populated with the following command::

      PYTHONPATH=$GRAPHITE_ROOT/webapp django-admin.py collectstatic --noinput --settings=graphite.settings

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

CERES_DIR
  `Default: /opt/graphite/storage/ceres`
  The location of Ceres data files.

RRD_DIR
  `Default: /opt/graphite/storage/rrd`
  The location of RRD data files.

STANDARD_DIRS
  `Default: [WHISPER_DIR, RRD_DIR]`
  The list of directories searched for data files. By default, this is the value of WHISPER_DIR and RRD_DIR (if rrd support is detected). If this setting is defined, the WHISPER_DIR, CERES_DIR, and RRD_DIR settings have no effect.

LOG_DIR
  `Default: STORAGE_DIR/log/webapp`
  The directory to write Graphite-web's log files. This directory must be writable by the user running the Graphite-web webapp.

INDEX_FILE
  `Default: /opt/graphite/storage/index`
  The location of the search index file. This file is generated by the `build-index.sh` script and must be writable by the user running the Graphite-web webapp.

STORAGE_FINDERS
  `Default: ()`
  It is possible to use an alternate storage layer than the default, Whisper, in order to accommodate specific needs.
  See: http://graphite.readthedocs.io/en/latest/storage-backends.html

FETCH_TIMEOUT
  `Default: 6`

  Timeout for data fetches in seconds.

FIND_TIMEOUT
  `Default: 3`

  Timeout for find requests (metric browsing) in seconds.

TAGDB
  `Default: 'graphite.tags.localdatabase.LocalDatabaseTagDB'`
  Tag database driver to use, other options include `graphite.tags.redis.RedisTagDB`

TAGDB_REDIS_HOST
  `Default: 'localhost'`
  Redis host to use with `TAGDB = 'graphite.tags.redis.RedisTagDB'`

TAGDB_REDIS_PORT
  `Default: 6379`
  Redis port to use with `TAGDB = 'graphite.tags.redis.RedisTagDB'`

TAGDB_REDIS_DB
  `Default: 0`
  Redis database to use with `TAGDB = 'graphite.tags.redis.RedisTagDB'`

Configure Webserver (Apache)
----------------------------
There is an example ``example-graphite-vhost.conf`` file in the examples directory of the graphite web source code. You can use this to configure apache. Different distributions have different ways of configuring Apache. Please refer to your distribution's documentation on the subject.

For example, Ubuntu uses ``/etc/apache2/sites-available`` and ``sites-enabled/`` to handle this (A symlink from ``sites-enabled/`` to ``sites-available/`` would be used after placing the file in sites-available/).

Others use an Include directive in the ``httpd.conf`` file like this:

.. code-block:: none

    # This goes in httpd.conf
    Include /usr/local/apache2/conf/vhosts.d/*.conf

The configuration files must then all be added to ``/usr/local/apache2/conf/vhosts.d/``. Still others may not help handle this at all and you must add the configuration to your http.conf file directly.

Graphite will be in the DocumentRoot of your webserver, and will not allow you to access plain-HTML in subdirectories without addition configuration. You may want to edit the ``example-graphite-vhost.conf`` file to change port numbers or use additional ``"SetHandler None"`` directives to allow access to other directories.

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
These settings insert additional backends to the `AUTHENTICATION_BACKENDS <https://docs.djangoproject.com/en/dev/ref/settings/#authentication-backends>`_ and `MIDDLEWARE settings <https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-MIDDLEWARE>`_. Additional authentication schemes are possible by manipulating these lists directly.

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

LDAP_USER_DN_TEMPLATE:
  `Default: ''`

  Instead of using a hardcoded username and password for the account that binds to the LDAP server you could use the credentials of the user that tries to log in to Graphite. This is the template that creates the full DN to bind with.



Other Authentications
^^^^^^^^^^^^^^^^^^^^^
USE_REMOTE_USER_AUTHENTICATION
  `Default: False`

  Enables the use of the Django `RemoteUserBackend` authentication backend. See the `Django documentation <https://docs.djangoproject.com/en/dev/howto/auth-remote-user/>`__ for further details.

REMOTE_USER_BACKEND
  `Default: "django.contrib.auth.middleware.RemoteUserBackend"`

  Enables the use of an alternative remote authentication backend.

REMOTE_USER_MIDDLEWARE
  `Default: "django.contrib.auth.middleware.RemoteUserMiddleware"`

  Enables the use of an alternative remote authentication middleware.

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

  If set to the name of a user group, dashboards can only be saved and deleted by logged-in users who are members of this group. Groups can be set in the Django Admin app, or in LDAP.

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

See the `Django documentation <https://docs.djangoproject.com/en/dev/ref/settings/#databases>`_ for full documentation of the DATABASES setting.

.. note ::
  Remember, setting up a new database requires running ``PYTHONPATH=$GRAPHITE_ROOT/webapp django-admin.py migrate --settings=graphite.settings --run-syncdb`` to create the initial schema.

.. note ::
  If you are using a custom database backend (other than SQLite) you must first create a $GRAPHITE_ROOT/webapp/graphite/local_settings.py file that overrides the database related settings from settings.py. Use $GRAPHITE_ROOT/webapp/graphite/local_settings.py.example as a template.

If you are experiencing problems, uncomment the following line in /opt/graphite/webapp/graphite/local_settings.py:

.. code-block:: none

  # DEBUG = True

and review your webapp logs. If you're using the default graphite-example-vhost.conf, your logs will be found in /opt/graphite/storage/log/webapp/.

If you're using the default SQLite database, your webserver will need permissions to read and write to the database file. So, for example, if your webapp is running in Apache as the 'nobody' user, you will need to fix the permissions like this:

.. code-block:: none

  sudo chown nobody:nobody /opt/graphite/storage/graphite.db


Cluster Configuration
---------------------
These settings configure the Graphite webapp for clustered use. When ``CLUSTER_SERVERS`` is set, metric browse and render requests will cause the webapp to query other webapps in CLUSTER_SERVERS for matching metrics. Graphite can either merge responses or choose the best response if more than one cluster server returns the same series.

CLUSTER_SERVERS
  `Default: []`

  The list of IP addresses and ports of remote Graphite webapps in a cluster. Each of these servers should have local access to metric data to serve. Ex: ["10.0.2.2:80", "http://10.0.2.3:80?format=pickle&local=1"]

  Cluster server definitions can optionally include a protocol (http:// or https://) and/or additional config parameters.

  The `format` parameter can be set to `pickle` (the default) or `msgpack` to control the encoding used for intra-cluster find and render requests.

  The `local` parameter can be set to `1` (the default) or `0` to control whether cluster servers should only return results from local finders, or fan the request out to their remote finders.

USE_WORKER_POOL
  `Default: True`

  Creates a pool of worker threads to which tasks can be dispatched. This makes sense if there are multiple CLUSTER_SERVERS and/or STORAGE_FINDERS because then the communication with them can be parallelized.
  The number of threads is equal to: min(number of finders, POOL_MAX_WORKERS)

  Be careful when increasing the number of threads, in particular if your start multiple graphite-web processes (with uwsgi or similar) as this will increase memory consumption (and number of connections to memcached).

POOL_MAX_WORKERS
  `Default: 10`

   The maximum number of worker threads that should be created.

REMOTE_RETRY_DELAY
  `Default: 60`

  Time in seconds to blacklist a webapp after a timed-out request.

FIND_CACHE_DURATION
  `Default: 300`

  Time to cache remote metric find results in seconds.

MAX_FETCH_RETRIES
  `Default: 2`

  Number of retries for a specific remote data fetch.

FIND_TOLERANCE
  `Default: FIND_TOLERANCE = 2 * FIND_CACHE_DURATION`

  If the query doesn't fall entirely within the FIND_TOLERANCE window we disregard the window. This prevents unnecessary remote fetches
  caused when carbon's cache skews node.intervals, giving the appearance remote systems have data we don't have locally, which we probably do.

REMOTE_STORE_MERGE_RESULTS
  `Default: True`

  During a rebalance of a consistent hash cluster, after a partition event on a replication > 1 cluster or in other cases we might receive multiple TimeSeries data for a metric key.
  Merge them together rather than choosing the "most complete" one (pre-0.9.14 behaviour).

REMOTE_STORE_USE_POST
  `Default: False`

  This setting enables POST queries instead of GET for remote requests.

REMOTE_STORE_FORWARD_HEADERS
  `Default: []`

  Provide a list of HTTP headers that you want forwarded on from this host when making a request to a remote webapp server in CLUSTER_SERVERS.

REMOTE_EXCLUDE_LOCAL
  `Default: False`

  Try to detect when a cluster server is localhost and don't forward queries

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

CARBONLINK_HASHING_TYPE
  `Default: carbon_ch`

  `Possible values: carbon_ch, fnv1a_ch`

  The default `carbon_ch` is Graphite's traditional consistent-hashing implementation. Alternatively, you can use `fnv1a_ch`, which supports the Fowler–Noll–Vo hash function (FNV-1a) hash implementation offered by the `carbon-c-relay relay <https://github.com/grobian/carbon-c-relay>`_ project.

CARBON_METRIC_PREFIX:
  `Default: carbon`

  Prefix for internal carbon statistics.

INTRACLUSTER_HTTPS
  `Default: False`

  This setting controls whether https is used to communicate between cluster members that don't have an explicit protocol specified.


Additional Django Settings
--------------------------
The ``local_settings.py.example`` shipped with Graphite-web imports ``app_settings.py`` into the namespace to allow further customization of Django. This allows the setting or customization of standard `Django settings <https://docs.djangoproject.com/en/dev/ref/settings/>`_ and the installation and configuration of additional `middleware <https://docs.djangoproject.com/en/dev/topics/http/middleware/>`_.

To manipulate these settings, ensure ``app_settings.py`` is imported as such:

.. code-block:: python

   from graphite.app_settings import *

The most common settings to manipulate are ``INSTALLED_APPS``, ``MIDDLEWARE``, and ``AUTHENTICATION_BACKENDS``.

