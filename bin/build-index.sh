#!/bin/bash

if [ "$GRAPHITE_ROOT" = "" ]
then
  GRAPHITE_ROOT="/opt/graphite"
fi

if [ "$GRAPHITE_STORAGE_DIR" = "" ]
then
  GRAPHITE_STORAGE_DIR="${GRAPHITE_ROOT}/storage"
fi


WHISPER_DIR="${GRAPHITE_STORAGE_DIR}/whisper"

if [ ! -d "$WHISPER_DIR" ]
then
  echo "Fatal Error: $WHISPER_DIR does not exist."
  exit 1
fi

INDEX_FILE="${GRAPHITE_STORAGE_DIR}/index"
TMP_INDEX="${GRAPHITE_STORAGE_DIR}/.index.tmp"

rm -f $TMP_INDEX
cd $WHISPER_DIR
touch $INDEX_FILE
echo "[`date`]  building index..."
find -L . -name '*.wsp' | perl -pe 's!^[^/]+/(.+)\.wsp$!$1!; s!/!.!g' > $TMP_INDEX
echo "[`date`]  complete, switching to new index file"
mv -f $TMP_INDEX $INDEX_FILE
