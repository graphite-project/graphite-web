#!/bin/bash -x

rm -f rpm/graphite-carbon*.rpm
svn up
rev=`svn info|grep Revision|cut -d\  -f2`
echo "Building Graphite-Carbon RPM (revision $rev)"

BUILD_DIR=/tmp/carbon-build
INSTALL_DIR=/usr/local/graphite/carbon/carbon-relay

URL=`svn info|grep URL:|cut -d\  -f2`
DIR=${BUILD_DIR}${INSTALL_DIR}
rm -fr $BUILD_DIR
mkdir -p $DIR

#Treat $DIR as root of filesystem and just place files where they need to be
echo " retrieving source from subversion"
svn --force export ${URL}/carbon/carbon-relay $DIR >/dev/null

#add init script
mkdir -p $BUILD_DIR/etc/rc.d/init.d/
mv $DIR/init-script $BUILD_DIR/etc/rc.d/init.d/carbon-relay

echo " compressing"
cd $BUILD_DIR
sudo tar czf /usr/src/rpm/SOURCES/graphite-carbon.tgz *
cd - >/dev/null
sed -e "s/@REV@/$rev/" carbon-specfile.tmpl > graphite-carbon.spec
sudo mv graphite-carbon.spec /usr/src/rpm/SPECS/

echo " running rpmbuild"
sudo rm -fr /usr/src/rpm/BUILD/*
sudo rpmbuild -bb --clean /usr/src/rpm/SPECS/graphite-carbon.spec || echo "Build failed with code $?"
mkdir -p rpm
sudo mv /usr/src/rpm/RPMS/i386/graphite-carbon*.rpm rpm/
sudo chown $USER rpm/*
ls -lh rpm
