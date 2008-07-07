#!/bin/bash

if [ "$1" = "" ]
then
	prog=$0
	echo "Usage: `basename $prog` GRAPHITE_ROOT"
	exit 1
fi

GRAPHITE_ROOT=$1

echo "Running Graphite under django development server, using root=$GRAPHITE_ROOT"
echo
echo django-admin.py runserver --pythonpath=$GRAPHITE_ROOT/webapp/ --settings=web.settings 0.0.0.0:8080
django-admin.py runserver --pythonpath=$GRAPHITE_ROOT/webapp/ --settings=web.settings 0.0.0.0:8080
