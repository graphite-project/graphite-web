import re
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
    arglist = dict()
    if tokens.template.kwargs:
      arglist.update(dict([(kwarg.argname, evaluateTokens(requestContext, kwarg.args[0])) for kwarg in tokens.template.kwargs]))
    if tokens.template.args:
      arglist.update(dict([(str(i+1), evaluateTokens(requestContext, arg)) for i, arg in enumerate(tokens.template.args)]))
    if 'template' in requestContext:
      arglist.update(requestContext['template'])
    return evaluateTokens(requestContext, tokens.template, arglist)

  elif tokens.expression:
    return evaluateTokens(requestContext, tokens.expression, replacements)

  elif tokens.pathExpression:
    expression = tokens.pathExpression
    if replacements:
      for name in replacements:
        if expression == '$'+name:
          val = replacements[name]
          if not isinstance(val, str) and not isinstance(val, basestring):
            return val
          elif re.match('^-?[\d.]+$', val):
            return float(val)
          else:
            return val
        else:
          expression = expression.replace('$'+name, str(replacements[name]))
    return fetchData(requestContext, expression)

  elif tokens.call:
    if tokens.call.funcname == 'template':
      # if template propagates down here, it means the grammar didn't match the invocation
      # as tokens.template. this generally happens if you try to pass non-numeric/string args
      raise ValueError("invalid template() syntax, only string/numeric arguments are allowed")

    func = SeriesFunctions[tokens.call.funcname]
    args = [evaluateTokens(requestContext, arg, replacements) for arg in tokens.call.args]
    requestContext['args'] = tokens.call.args
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
    raise ValueError("unknown token in target evaluator")


def extractPathExpressions(targets):
  # Returns a list of unique pathExpressions found in the targets list

  pathExpressions = set()

  def extractPathExpression(tokens):
    if tokens.expression:
      return extractPathExpression(tokens.expression)
    elif tokens.pathExpression:
      pathExpressions.add(tokens.pathExpression)
    elif tokens.call:
      for a in tokens.call.args:
        extractPathExpression(a)

  for target in targets:
    tokens = grammar.parseString(target)
    extractPathExpression(tokens)

  return list(pathExpressions)


# Avoid import circularities
from graphite.render.functions import (SeriesFunctions,
                                       NormalizeEmptyResultError)  # noqa
