#!/bin/bash

if [ "$1" = "" ]
then
	prog=$0
	echo "Usage: `basename $prog` GRAPHITE_ROOT"
	exit 1
fi

GRAPHITE_ROOT=$1

django_admin=$(which django-admin.py)
if [ "$django_admin" = "" ]
then
	django_admin=$(which django-admin)
	if [ "$django_admin" = "" ]
	then
		echo "Could not find a django-admin script"
		exit 1
	fi
fi

echo "Running Graphite under django development server, using root=$GRAPHITE_ROOT"
echo
echo $django_admin runserver --pythonpath=$GRAPHITE_ROOT/webapp/ --settings=web.settings 0.0.0.0:8080
$django_admin runserver --pythonpath=$GRAPHITE_ROOT/webapp/ --settings=web.settings 0.0.0.0:8080
