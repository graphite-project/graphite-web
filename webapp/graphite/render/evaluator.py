from graphite.render.grammar import grammar
from graphite.render.datalib import fetchData, TimeSeries


def evaluateTarget(requestContext, target):
  tokens = grammar.parseString(target)
  result = evaluateTokens(requestContext, tokens)

  if type(result) is TimeSeries:
    return [result] #we have to return a list of TimeSeries objects

  else:
    return result


def evaluateTokens(requestContext, tokens, replacements=None):
  if tokens.template:
    arglist = [(kwarg.argname, evaluateTokens(requestContext, kwarg.args[0])) for kwarg in tokens.template.kwargs]
    return evaluateTokens(requestContext, tokens.template, arglist)

  elif tokens.expression:
    return evaluateTokens(requestContext, tokens.expression, replacements)

  elif tokens.pathExpression:
    expression = tokens.pathExpression
    if replacements:
      for kwarg in replacements:
        expression = expression.replace(kwarg[0], kwarg[1])
    return fetchData(requestContext, expression)

  elif tokens.call:
    func = SeriesFunctions[tokens.call.funcname]
    args = [evaluateTokens(requestContext, arg, replacements) for arg in tokens.call.args]
    kwargs = dict([(kwarg.argname, evaluateTokens(requestContext, kwarg.args[0], replacements))
                   for kwarg in tokens.call.kwargs])
    try:
      return func(requestContext, *args, **kwargs)
    except NormalizeEmptyResultError:
      return []

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

  else:
    raise ValueError("unknown token in target evaulator")


# Avoid import circularities
from graphite.render.functions import (SeriesFunctions,
                                       NormalizeEmptyResultError)  # noqa
