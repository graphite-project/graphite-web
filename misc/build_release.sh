#!/bin/bash

bzr up
version="$1"
if [ "$version" = "" ]
then
	echo "You must specify a version"
	exit 1
fi
echo "Building Graphite release $version"

echo "Creating directory structure"
build_dir="build"
base_dir="$build_dir/graphite-$version"
app_dir="$base_dir/app"
rc_dir="$base_dir/rc"
tmp_dir="$base_dir/tmp"
rm -fr $build_dir
mkdir -p $app_dir
mkdir -p $rc_dir
mkdir -p $tmp_dir

echo "Copying source"
cp -r web/ $app_dir
cp -r content/ $app_dir
cp -r storage/ $app_dir
cp -r carbon-agent/ $app_dir
cp whisper/whisper.py $app_dir
cp carbon-agent/init-script $rc_dir/carbon-agent
cp template-vhost.conf $tmp_dir
cp -r examples/ $base_dir
cp INSTALL LICENSE README install.py $base_dir

echo "Compressing"
cd build
tar czf ../graphite-${version}.tgz *
cd ..

echo "Done"
ls -lh graphite-${version}.tgz
