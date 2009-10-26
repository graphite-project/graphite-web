#!/bin/bash

GRAPHITE_ROOT="/opt/graphite"

INDEX_FILE="$GRAPHITE_ROOT/storage/index"
TEMP_INDEX_FILE="$GRAPHITE_ROOT/storage/.index.tmp"

find $GRAPHITE_ROOT/storage/whisper/ -name '*.wsp' | sed -e "s!$GRAPHITE_ROOT/storage/whisper/!!; s!/!.!g; s/\.wsp$//;" > $TEMP_INDEX_FILE

mv -f $TEMP_INDEX_FILE $INDEX_FILE
