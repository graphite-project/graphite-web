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
	echo "For example: misc/build_release.sh \$version"
	exit 1
fi

echo "Building Graphite release $version"

echo "Creating directory structure"

build_dir="build"
base_dir="$build_dir/graphite-$version"
webapp_dir="$base_dir/webapp"
rc_dir="$base_dir/rc"
tmp_dir="$base_dir/tmp"
rm -fr $build_dir
mkdir -p $webapp_dir
mkdir -p $rc_dir
mkdir -p $tmp_dir

echo "Copying source"
cp -r webapp/ $webapp_dir
cp -r storage/ $webapp_dir
cp -r carbon/ $webapp_dir
mv $webapp_dir/carbon/init-script.sh $rc_dir/carbon-agent.sh
cp template-vhost.conf $tmp_dir
cp -r examples/ $base_dir
cp INSTALL LICENSE README misc/install.py $base_dir

echo "Compressing"
cd build
tar czf ../graphite-${version}.tgz *
cd ..

echo "Done"
ls -lh graphite-${version}.tgz
