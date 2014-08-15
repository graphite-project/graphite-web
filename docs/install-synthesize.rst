Installing From Synthesize
==========================

`Synthesize <https://github.com/obfuscurity/synthesize/>`_ is a script dedicated to making Graphite easy to install.  As of this writing, it is only intended to run on Ubuntu Linux 14.04 LTS.

As noted in the `README <https://github.com/obfuscurity/synthesize/blob/master/README.md>`_, you are recommended against running Synthesize directly on your system, but rather in a VM for sandboxing purposes.

To facilitate this, Synthesize includes a `Vagrantfile <https://github.com/obfuscurity/synthesize/blob/master/Vagrantfile>`_.  In order to use this, you will, of course, need to install `Vagrant <http://www.vagrantup.com>`_.

Once the ``vagrant up`` has completed, you should be able to send stats to localhost:8125 (via StatsD) or localhost:22003 (direct to Graphite). Graphite web interface should be asccessible on `https://localhost:8443 <https://localhost:8443>`_.
