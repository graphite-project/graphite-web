Configuring The Webapp
======================

Running the webapp with mod_wsgi as URL-prefixed application (Apache)
---------------------------------------------------------------------


When using the new ``URL_PREFIX`` parameter in ``local_settings.py`` the 
``WSGIScriptAlias`` setting must look like the following (e.g. URL_PREFIX="/graphite")::

      WSGIScriptAlias /graphite /srv/graphite-web/conf/graphite.wsgi/graphite

The /graphite is needed for Django to create the correct URLs
