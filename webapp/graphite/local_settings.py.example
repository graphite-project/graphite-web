# Edit this file to override the default graphite settings, do not edit settings.py!!!

# Turn on debugging and restart apache if you ever see an "Internal Server Error" page
#DEBUG = True

# Set your local timezone (django will *try* to figure this out automatically)
# If your graphs appear to be offset by a couple hours then this probably
# needs to be explicitly set to your local timezone.
#TIME_ZONE = 'America/Los_Angeles'

# Uncomment these to enable more performance-related logging
#LOG_RENDERING_PERFORMANCE = True
#LOG_CACHE_PERFORMANCE = True

# Override this if you need to provide documentation specific to your graphite deployment
#DOCUMENTATION_URL = "http://wiki.mycompany.com/graphite"

# Enable email-related features
#SMTP_SERVER = "mail.mycompany.com"


#####################################
# LDAP Authentication Configuration #
#####################################
# LDAP / ActiveDirectory authentication setup
#USE_LDAP_AUTH = True
#LDAP_SERVER = "ldap.mycompany.com"
#LDAP_PORT = 389
#	OR
#LDAP_URI = "ldaps://ldap.mycompany.com:636"
#LDAP_SEARCH_BASE = "OU=users,DC=mycompany,DC=com"
#LDAP_BASE_USER = "CN=some_readonly_account,DC=mycompany,DC=com"
#LDAP_BASE_PASS = "readonly_account_password"
#LDAP_USER_QUERY = "(username=%s)"  #For Active Directory use "(sAMAccountName=%s)"
#
# If you want to further customize the ldap connection options you should
# directly use ldap.set_option to set the ldap module's global options.
# For example:
#
#import ldap
#ldap.set_option(ldap.OPT_X_TLS_REQUIRE_CERT, ldap.OPT_X_TLS_ALLOW)
#ldap.set_option(ldap.OPT_X_TLS_CACERTDIR, "/etc/ssl/ca")
#ldap.set_option(ldap.OPT_X_TLS_CERTFILE, "/etc/ssl/mycert.pem")
#ldap.set_option(ldap.OPT_X_TLS_KEYFILE, "/etc/ssl/mykey.pem")
# See http://www.python-ldap.org/ for further details on these options.


##########################
# Database Configuration #
##########################
# By default sqlite is used. If you cluster multiple webapps you will need
# to setup an external database (like mysql) and configure all the webapps
# to use the same database. Note that this database is only used to store
# django models like saved graphs, dashboards, user preferences, etc. Metric
# data is not stored here.
#
# DON'T FORGET TO RUN 'manage.py syncdb' AFTER SETTING UP A NEW DB!
#
#DATABASE_ENGINE = 'mysql' # or 'postgres'
#DATABASE_NAME = 'graphite'
#DATABASE_USER = 'graphite'
#DATABASE_PASSWORD = 'graphite-is-awesome'
#DATABASE_HOST = 'mysql.mycompany.com'
#DATABASE_PORT = '3306'


#########################
# Cluster Configuration #
#########################
# (To avoid excessive DNS lookups you want to stick to using IP addresses only in this entire section)
#
# This should list the IP address (and optionally port) of each webapp in your cluster.
# Strings are of the form "ip[:port]"
# Usually this will be the same as MEMCACHE_HOSTS except for the port numbers.
#
#CLUSTER_SERVERS = []

# This lists all the memcached servers that will be used by this webapp.
# If you have a cluster of webapps you want to make sure all of them
# have the *exact* same value for this setting. That will maximize cache
# efficiency. Setting MEMCACHE_HOSTS to be empty will turn off use of
# memcached entirely.
#
# You should not use the loopback address 127.0.0.1 here because every webapp in
# the cluster should use the exact same value and should list every member in the
# cluster.
#MEMCACHE_HOSTS = ['10.10.10.10:11211', '10.10.10.11:11211', '10.10.10.12:11211']

# If you are running multiple carbon-caches on this machine (typically behind a relay using
# consistent hashing), you'll need to list the ip address, cache query port, and instance name of each carbon-cache
# instance on the local machine (NOT every carbon-cache in the entire cluster). The default cache query port is 7002
# and a common scheme is to use 7102 for instance b, 7202 for instance c, etc.
#
# You *should* use 127.0.0.1 here.
#CARBONLINK_HOSTS = ["127.0.0.1:7002:a", "127.0.0.1:7102:b", "127.0.0.1:7202:c"]
