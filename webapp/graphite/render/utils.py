import re

from graphite.render.grammar import grammar
from graphite.storage import STORE


def extractPathExpressions(requestContext, targets):
  # Returns a list of unique pathExpressions found in the targets list

  pathExpressions = set()

  def extractPathExpression(requestContext, tokens, replacements=None):
    if tokens.template:
      arglist = dict()
      if tokens.template.kwargs:
        arglist.update(dict([(kwarg.argname, evaluateScalarTokens(kwarg.args[0])) for kwarg in tokens.template.kwargs]))
      if tokens.template.args:
        arglist.update(dict([(str(i+1), evaluateScalarTokens(arg)) for i, arg in enumerate(tokens.template.args)]))
      if 'template' in requestContext:
        arglist.update(requestContext['template'])
      return extractPathExpression(requestContext, tokens.template, arglist)
    elif tokens.expression:
      extractPathExpression(requestContext, tokens.expression, replacements)
      if tokens.expression.pipedCalls:
        for token in tokens.expression.pipedCalls:
          extractPathExpression(requestContext, token, replacements)
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
      pathExpressions.add(expression)
    elif tokens.call:
      # if we're prefetching seriesByTag, look up the matching series and prefetch those
      if tokens.call.funcname == 'seriesByTag':
        if STORE.tagdb:
          for series in STORE.tagdb.find_series([t.string[1:-1] for t in tokens.call.args if t.string]):
            pathExpressions.add(series)
      else:
        for a in tokens.call.args:
          extractPathExpression(requestContext, a, replacements)

  for target in targets:
    if not target:
      continue

    if isinstance(target, basestring):
      if not target.strip():
        continue
      target = grammar.parseString(target)
    extractPathExpression(requestContext, target)

  return list(pathExpressions)


def evaluateScalarTokens(tokens):
  if tokens.number:
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
