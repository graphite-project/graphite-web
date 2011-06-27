#!/bin/bash

if [ "$GRAPHITE_ROOT" = "" ]
then
  GRAPHITE_ROOT="/opt/graphite"
fi

WHISPER_DIR="${GRAPHITE_ROOT}/storage/whisper"

if [ ! -d "$WHISPER_DIR" ]
then
  echo "Fatal Error: $WHISPER_DIR does not exist."
  exit 1
fi

INDEX_FILE="${GRAPHITE_ROOT}/storage/index"
TMP_INDEX="${GRAPHITE_ROOT}/storage/.index.tmp"

rm -f $TMP_INDEX
cd $WHISPER_DIR
echo "[`date`]  building index..."
find -L . -name '*.wsp' | perl -pe 's!^[^/]+/(.+)\.wsp$!$1!; s!/!.!g' > $TMP_INDEX
echo "[`date`]  complete, switching to new index file"
mv -f $TMP_INDEX $INDEX_FILE
