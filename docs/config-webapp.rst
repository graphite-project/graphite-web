Configuring The Webapp
======================

There are multiple ways to expose the Graphite webapp. The following stack configurations exist:

* nginx + gunicorn
* Apache + mod_wsgi
* nginx + uWSGI

Depending on the configuration you choose, the webapp configuration is slightly different.

nginx + gunicorn
----------------

In this setup, nginx will proxy requests for Gunicorn, which will itself listen locally on port 8080 and serve the webapp (Django application).

Install Gunicorn
^^^^^^^^^^^^^^^^

If you use a virtualenv, you can use ``pip``:

.. code-block:: none

   pip install gunicorn

Otherwise, you can use packages for your distribution.

On Debian-based systems, run:

.. code-block:: none

   sudo apt install gunicorn

Install nginx
^^^^^^^^^^^^^

On Debian-based systems, run:

.. code-block:: none

   sudo apt install nginx

Configure nginx
^^^^^^^^^^^^^^^

We will use dedicated log files for nginx when serving Graphite:

.. code-block:: none

    sudo touch /var/log/nginx/graphite.access.log
    sudo touch /var/log/nginx/graphite.error.log
    sudo chmod 640 /var/log/nginx/graphite.*
    sudo chown www-data:www-data /var/log/nginx/graphite.*

Write the following configuration in ``/etc/nginx/sites-available/graphite``:

.. code-block:: none

    upstream graphite {
        server 127.0.0.1:8080 fail_timeout=0;
    }

    server {
        listen 80 default_server;

        server_name HOSTNAME;

        root /opt/graphite/webapp;

        access_log /var/log/nginx/graphite.access.log;
        error_log  /var/log/nginx/graphite.error.log;

        location = /favicon.ico {
            return 204;
        }

        # serve static content from the "content" directory
        location /static {
            alias /opt/graphite/webapp/content;
            expires max;
        }

        location / {
            try_files $uri @graphite;
        }

        location @graphite {
            proxy_pass_header Server;
            proxy_set_header Host $http_host;
            proxy_redirect off;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Scheme $scheme;
            proxy_connect_timeout 10;
            proxy_read_timeout 10;
            proxy_pass http://graphite;
        }
    }

.. note::

  Don't forget to change the ``server_name`` to match your actual hostname. You may also adapt other settings to your use case, such as ``root``.

Enable this configuration for nginx:

.. code-block:: none

   sudo ln -s /etc/nginx/sites-available/graphite /etc/nginx/sites-enabled
   sudo rm -f /etc/nginx/sites-enabled/default

Reload nginx to use the new configuration:

.. code-block:: none

   sudo service nginx reload

Apache + mod_wsgi
-----------------

First, you need to install mod_wsgi.

See the `mod_wsgi InstallationInstructions`_ for installation instructions.

.. _mod_wsgi InstallationInstructions: https://code.google.com/p/modwsgi/wiki/InstallationInstructions

Then create the graphite.wsgi. (You can find example of graphite.wsgi file on the `conf`_ directory of source ditribution):

.. _conf: https://github.com/graphite-project/graphite-web/blob/master/conf/graphite.wsgi.example

.. code-block:: bash

    # /opt/graphite/conf/graphite.wsgi

    import sys
    sys.path.append('/opt/graphite/webapp')
    from graphite.wsgi import application

Finally, configure the apache vhost. (You can find example of Graphite vhost configuration in the `contrib`_ directory of source ditribution):

.. _contrib: https://github.com/graphite-project/graphite-web/blob/master/examples/example-graphite-vhost.conf

.. code-block:: apache

    # /etc/httpd/conf.d/graphite-vhost.conf

    LoadModule wsgi_module modules/mod_wsgi.so

    WSGISocketPrefix /var/run/wsgi

    Listen 80
    <VirtualHost *:80>

        ServerName graphite
        DocumentRoot "/opt/graphite/webapp"
        ErrorLog /opt/graphite/storage/log/webapp/error.log
        CustomLog /opt/graphite/storage/log/webapp/access.log common

        WSGIDaemonProcess graphite-web processes=5 threads=5 display-name='%{GROUP}' inactivity-timeout=120
        WSGIProcessGroup graphite-web
        WSGIApplicationGroup %{GLOBAL}
        WSGIImportScript /opt/graphite/conf/graphite.wsgi process-group=graphite-web application-group=%{GLOBAL}

        WSGIScriptAlias / /opt/graphite/conf/graphite.wsgi

        Alias /static/ /opt/graphite/static/

        <Directory /opt/graphite/static/>
                <IfVersion < 2.4>
                        Order deny,allow
                        Allow from all
                </IfVersion>
                <IfVersion >= 2.4>
                        Require all granted
                </IfVersion>
        </Directory>

        <Directory /opt/graphite/conf/>
                <IfVersion < 2.4>
                        Order deny,allow
                        Allow from all
                </IfVersion>
                <IfVersion >= 2.4>
                        Require all granted
                </IfVersion>
        </Directory>
    </VirtualHost>

Adapt the mod_wsgi configuration to your requirements.

See the `mod_wsgi QuickConfigurationGuide`_ for an overview of configurations and `mod_wsgi ConfigurationDirectives`_ to see all configuration directives

.. _mod_wsgi QuickConfigurationGuide: https://code.google.com/p/modwsgi/wiki/QuickConfigurationGuide

.. _mod_wsgi ConfigurationDirectives: https://code.google.com/p/modwsgi/wiki/ConfigurationDirectives

Restart apache::

    $ service httpd restart


Running the webapp with mod_wsgi as URL-prefixed application (Apache)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When using the new ``URL_PREFIX`` parameter in ``local_settings.py`` the
``WSGIScriptAlias`` setting must look like the following (e.g. URL_PREFIX="/graphite")::

      WSGIScriptAlias /graphite /opt/graphite/conf/graphite.wsgi/graphite

The /graphite is needed for Django to create the correct URLs


Nginx + uWSGI
-------------

First, you need to install uWSGI with Python support. On Debian, install ``uwsgi-plugin-python``.

Then create the uWSGI file for Graphite-web in
``/etc/uwsgi/apps-available/graphite.ini``:

.. code-block:: ini

    [uwsgi]
    processes = 2
    socket = localhost:8080
    gid = www-data
    uid = www-data
    virtualenv = /opt/graphite
    chdir = /opt/graphite/conf
    module = wsgi:application

Then create the file ``wsgi.py``:

.. code-block:: bash

    # /opt/graphite/conf/wsgi.py

    import sys
    sys.path.append('/opt/graphite/webapp')
    from graphite.wsgi import application

Enable ``graphite.ini`` and restart uWSGI:

.. code-block:: bash

    $ ln -s /etc/uwsgi/apps-available/graphite.ini /etc/uwsgi/apps-enabled
    $ service uwsgi restart

Finally, configure the nginx vhost:

.. code-block:: nginx

    # /etc/nginx/sites-available/graphite.conf

    server {
        listen 80;

        location /static/ {
            alias /opt/graphite/webapp/content/;
        }

        location / {
            include uwsgi_params;
            uwsgi_pass localhost:8080;
        }
    }

Enable the vhost and restart nginx:

.. code-block:: bash

    $ ln -s /etc/nginx/sites-available/graphite.conf /etc/nginx/sites-enabled
    $ service nginx restart


Acnowlegments
------------_

Portions of that manual are based on `Graphite-API deployment manual`_.

.. _Graphite-API deployment manual: https://github.com/brutasse/graphite-api/blob/master/docs/deployment.rst
