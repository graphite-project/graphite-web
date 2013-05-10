#!/bin/bash

GRAPHITE_ROOT="${GRAPHITE_ROOT:-/opt/graphite}"
# We're using bash so we might as well use default variable features
GRAPHITE_STORAGE_DIR="${GRAPHITE_STORAGE_DIR:-${GRAPHITE_ROOT}/storage}"
WHISPER_DIR="${GRAPHITE_STORAGE_DIR}/whisper"
CERES_DIR="${GRAPHITE_STORAGE_DIR}/ceres"
INDEX_FILE="${GRAPHITE_STORAGE_DIR}/index"
TMP_INDEX="${GRAPHITE_STORAGE_DIR}/.index.tmp"

if [ ! -d "$WHISPER_DIR" ] || [ ! -d "$CERES_DIR" ]; then
    echo "Fatal Error: neither $WHISPER_DIR nor $CERES_DIR exist." >&2
    exit 1
elif [ -z "$(which perl 2>/dev/null)" ]; then
    echo "Fatal Error: perl is required to run this." >&2
    exit 1
fi

rm -f $TMP_INDEX
touch $INDEX_FILE
echo "[$(date)]  building index..."

if [ -d "$WHISPER_DIR" ]; then
    cd $WHISPER_DIR
    find -L . -name '*.wsp' | perl -pe 's!^[^/]+/(.+)\.wsp$!$1!; s!/!.!g' > $TMP_INDEX
fi
if [ -d "$CERES_DIR" ]; then
    cd $CERES_DIR
    find -L . -name '.ceres-node' | perl -pe 's!^[^/]+/(.+)/\.ceres-node$!$1!; s!/!.!g;' >> $TMP_INDEX
fi

echo "[$(date)]  complete, switching to new index file"
mv -f $TMP_INDEX $INDEX_FILE
