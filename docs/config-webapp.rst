Configuring The Webapp
======================

There are multiple ways to expose the Graphite webapp. The following stack configurations exist:

* Apache + mod_wsgi
* nginx + gunicorn
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

Running the webapp with mod_wsgi as URL-prefixed application (Apache)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When using the new ``URL_PREFIX`` parameter in ``local_settings.py`` the
``WSGIScriptAlias`` setting must look like the following (e.g. URL_PREFIX="/graphite")::

      WSGIScriptAlias /graphite /srv/graphite-web/conf/graphite.wsgi/graphite

The /graphite is needed for Django to create the correct URLs
