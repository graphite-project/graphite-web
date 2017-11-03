import re

from django.conf import settings
from graphite.render.grammar import grammar
from graphite.render.datalib import fetchData, TimeSeries, prefetchRemoteData

def evaluateTarget(requestContext, targets, noPrefetch=False):
  if not isinstance(targets, list):
    targets = [targets]

  if settings.REMOTE_PREFETCH_DATA and not requestContext.get('localOnly') and not noPrefetch:
    prefetchRemoteData(requestContext, targets)

  seriesList = []

  for target in targets:
    if isinstance(target, basestring):
      if not target.strip():
        continue
      target = grammar.parseString(target)

    result = evaluateTokens(requestContext, target)

    # we have to return a list of TimeSeries objects
    if isinstance(result, TimeSeries):
      seriesList.append(result)
    elif result:
      seriesList.extend(result)

  return seriesList

def evaluateTokens(requestContext, tokens, replacements=None, pipedArg=None):
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
    if tokens.expression.pipedCalls:
      # when the expression has piped calls, we pop the right-most call and pass the remaining
      # expression into it via pipedArg, to get the same result as a nested call
      rightMost = tokens.expression.pipedCalls.pop()
      return evaluateTokens(requestContext, rightMost, replacements, tokens)

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
    rawArgs = tokens.call.args or []
    if pipedArg is not None:
      rawArgs.insert(0, pipedArg)
    args = [evaluateTokens(requestContext, arg, replacements) for arg in rawArgs]
    requestContext['args'] = rawArgs
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

  elif tokens.none:
    return None

  else:
    raise ValueError("unknown token in target evaluator")


# Avoid import circularities
from graphite.render.functions import (SeriesFunctions,
                                       NormalizeEmptyResultError)  # noqa
