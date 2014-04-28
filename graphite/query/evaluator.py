import datetime
import time
from graphite import settings
from graphite.query.grammar import grammar
from graphite.query.datalib import fetchData, TimeSeries


def evaluateTarget(requestContext, target):
    tokens = grammar.parseString(target)
    result = evaluateTokens(requestContext, tokens)

    if type(result) is TimeSeries:
        return [result] #we have to return a list of TimeSeries objects

    else:
        return result


def evaluateTokens(requestContext, tokens):
    if tokens.expression:
        return evaluateTokens(requestContext, tokens.expression)

    elif tokens.pathExpression:
        return fetchData(requestContext, tokens.pathExpression)

    elif tokens.call:
        func = SeriesFunctions[tokens.call.funcname]
        args = [evaluateTokens(requestContext, arg) for arg in tokens.call.args]
        kwargs = dict([(kwarg.argname, evaluateTokens(requestContext, kwarg.args[0]))
                       for kwarg in tokens.call.kwargs])
        return func(requestContext, *args, **kwargs)

    elif tokens.number:
        if tokens.number.integer:
            return int(tokens.number.integer)
        elif tokens.number.float:
            return float(tokens.number.float)
        elif tokens.number.scientific:
            return float(tokens.number.scientific[0])

    elif tokens.string:
        return tokens.string[1:-1]

    elif tokens.boolean:
        return tokens.boolean[0] == 'true'


#Avoid import circularities
from graphite.query.functions import SeriesFunctions
