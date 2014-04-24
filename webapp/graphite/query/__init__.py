""" This package (query) is called render in graphite-web """
import pytz
from graphite import settings
from graphite.query.evaluator import evaluateTarget
from graphite.query.attime import parseATTime

def query(params):
    """ Returns a list of graphite.query.datalib.TimeSeries instances

        params is a dictionary whose both keys and values are strings,
        except target, which is a list of strings.

        The params are taken from:
        http://graphite.readthedocs.org/en/latest/render_api.html
        except for the graph/format parameters

        tz: see http://graphite.readthedocs.org/en/latest/render_api.html#tz
        until/from: see http://graphite.readthedocs.org/en/latest/render_api.html#from-until
        target: see http://graphite.readthedocs.org/en/latest/render_api.html#target
    """

    data = []

    tzinfo = pytz.timezone(settings.TIME_ZONE)
    if 'tz' in params:
        try:
          tzinfo = pytz.timezone(params['tz'])
        except pytz.UnknownTimeZoneError:
          pass
    params['tzinfo'] = tzinfo

    if 'until' in params:
        untilTime = parseATTime(params['until'], tzinfo)
    else:
        untilTime = parseATTime('now', tzinfo)
    if 'from' in params:
        fromTime = parseATTime(params['from'], tzinfo)
    else:
        fromTime = parseATTime('-1d', tzinfo)
    startTime = min(fromTime, untilTime)
    endTime = max(fromTime, untilTime)
    assert startTime != endTime, "Invalid empty time range"

    params['startTime'] = startTime
    params['endTime'] = endTime

    for target in params['target']:
        data.extend(evaluateTarget(params, target))

    return data

def eval_qs(self, query_string):
    from urlparse import parse_qs

    params = parse_qs(query_string)

    # In parse_qs every value is a list, so we convert
    # them to strings
    for key, value in params.items():
        if key != "target":
            params[key] = value[0]
    return query(params)
