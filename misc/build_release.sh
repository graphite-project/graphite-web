#!/bin/bash

bzr up
version="$1"
if [ "$version" = "" ]
then
	echo "You must specify a version"
	exit 1
fi
if [ ! -f LICENSE ]
then
	echo "You must run this script from the top-level directory that contains the LICENSE file."
	exit 1
fi

echo "Building Graphite release $version"

rm -fr build/
mkdir build/
cd build/
base_dir="graphite-$version"

echo "Checking out a pristine copy of trunk"
bzr checkout lp:graphite $base_dir


echo "Compressing"
tar czf ../graphite-${version}.tgz *
cd ..

echo "Done"
ls -lh graphite-${version}.tgz
