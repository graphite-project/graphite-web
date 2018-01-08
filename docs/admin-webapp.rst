Administering The Webapp
========================

Depending on the stack you choose to expose the Graphite webapp, its usage varies slightly.

nginx + gunicorn
----------------

As nginx is already ready to proxy requests, we just need to start Gunicorn.

The following will do:

.. code-block:: none

   PYTHONPATH=/opt/graphite/webapp gunicorn wsgi --workers=4 --bind=127.0.0.1:8080 --log-file=/var/log/gunicorn.log --preload --pythonpath=/opt/graphite/webapp/graphite &

It will start Gunicorn and listen on ``localhost:8080``, log to ``/var/log/gunicorn.log`` and use ``/opt/graphite/webapp/graphite`` as the webapp path.

Naturally, you can change these settings so that it fits your setup.
