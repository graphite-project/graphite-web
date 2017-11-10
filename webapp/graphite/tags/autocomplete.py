"""Default implementation of auto-completion functions.

These are not in base.py to make sure it is possible to import
base.py without bringing all the Graphite dependencies.
"""
import bisect

from django.conf import settings


def auto_complete_tags(tagdb, exprs, tagPrefix=None, limit=None):
    """
    Return auto-complete suggestions for tags based on the matches for the specified expressions, optionally filtered by tag prefix
    """
    from graphite.storage import STORE

    if limit is None:
        limit = settings.TAGDB_AUTOCOMPLETE_LIMIT
    else:
        limit = int(limit)

    if not exprs:
        return [tagInfo['tag'] for tagInfo in
                tagdb.list_tags(tagFilter=('^(' + tagPrefix + ')' if tagPrefix else None))[:limit]]

    result = []

    searched_tags = set([tagdb.parse_tagspec(expr)[0] for expr in exprs])

    for path in STORE.find_series(exprs):
        tags = tagdb.parse(path).tags
        for tag in tags:
            if tag in searched_tags:
                continue
            if tagPrefix and not tag.startswith(tagPrefix):
                continue
            if tag in result:
                continue
            if len(result) == 0 or tag >= result[-1]:
                if len(result) >= limit:
                    continue
                result.append(tag)
            else:
                bisect.insort_left(result, tag)
            if len(result) > limit:
                del result[-1]

    return result


def auto_complete_values(tagdb, exprs, tag, valuePrefix=None, limit=None):
    """
    Return auto-complete suggestions for tags and values based on the matches for the specified expressions, optionally filtered by tag and/or value prefix
    """
    from graphite.storage import STORE

    if limit is None:
        limit = settings.TAGDB_AUTOCOMPLETE_LIMIT
    else:
        limit = int(limit)

    if not exprs:
        return [v['value'] for v in
                tagdb.list_values(tag, valueFilter=('^(' + valuePrefix + ')' if valuePrefix else None))[:limit]]

    result = []

    for path in STORE.find_series(exprs):
        tags = tagdb.parse(path).tags
        if tag not in tags:
            continue
        value = tags[tag]
        if valuePrefix and not value.startswith(valuePrefix):
            continue
        if value in result:
            continue
        if len(result) == 0 or value >= result[-1]:
            if len(result) >= limit:
                continue
            result.append(value)
        else:
            bisect.insort_left(result, value)
        if len(result) > limit:
            del result[-1]

    return result
