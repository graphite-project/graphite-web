#!/bin/bash

rm -f rpm/*.rpm
svn up
rev=`svn info|grep Revision|cut -d\  -f2`
echo "Building Graphite RPM (revision $rev)"

BUILD_DIR=/tmp/graphite-build
INSTALL_DIR=/usr/local/graphite

URL=`svn info|grep URL:|cut -d\  -f2`
DIR=${BUILD_DIR}${INSTALL_DIR}
rm -fr $BUILD_DIR
mkdir -p $DIR

#Treat $DIR as root of filesystem and just place files where they need to be
echo " retrieving source from subversion"
svn export ${URL}/web $DIR/web >/dev/null
svn export ${URL}/content $DIR/content >/dev/null
svn export ${URL}/storage $DIR/storage >/dev/null
svn export ${URL}/carbon-agent $DIR/carbon-agent >/dev/null

#add carbon-agent init script
mkdir -p $BUILD_DIR/etc/rc.d/init.d/
mv $DIR/carbon-agent/init-script $BUILD_DIR/etc/rc.d/init.d/carbon-agent

echo " compressing"
cd $BUILD_DIR
tar czf /tmp/graphite.tgz *
cd - &>/dev/null
cp /tmp/graphite.tgz .
ls -lh graphite.tgz
