import re
import six

from graphite.errors import NormalizeEmptyResultError
from graphite.functions import SeriesFunction
from graphite.render.grammar import grammar
from graphite.render.datalib import fetchData, TimeSeries, prefetchData


def evaluateTarget(requestContext, targets):
  if not isinstance(targets, list):
    targets = [targets]

  pathExpressions = extractPathExpressions(requestContext, targets)
  prefetchData(requestContext, pathExpressions)

  seriesList = []

  for target in targets:
    if not target:
      continue

    if isinstance(target, six.string_types):
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
      arglist.update(dict([(kwarg.argname, evaluateScalarTokens(kwarg.args[0])) for kwarg in tokens.template.kwargs]))
    if tokens.template.args:
      arglist.update(dict([(str(i+1), evaluateScalarTokens(arg)) for i, arg in enumerate(tokens.template.args)]))
    if 'template' in requestContext:
      arglist.update(requestContext['template'])
    return evaluateTokens(requestContext, tokens.template, arglist)

  if tokens.expression:
    if tokens.expression.pipedCalls:
      # when the expression has piped calls, we pop the right-most call and pass the remaining
      # expression into it via pipedArg, to get the same result as a nested call
      rightMost = tokens.expression.pipedCalls.pop()
      return evaluateTokens(requestContext, rightMost, replacements, tokens)

    return evaluateTokens(requestContext, tokens.expression, replacements)

  if tokens.pathExpression:
    expression = tokens.pathExpression
    if replacements:
      for name in replacements:
        if expression == '$'+name:
          val = replacements[name]
          if not isinstance(val, six.string_types):
            return val
          elif re.match('^-?[\d.]+$', val):
            return float(val)
          else:
            return val
        else:
          expression = expression.replace('$'+name, str(replacements[name]))
    return fetchData(requestContext, expression)

  if tokens.call:
    if tokens.call.funcname == 'template':
      # if template propagates down here, it means the grammar didn't match the invocation
      # as tokens.template. this generally happens if you try to pass non-numeric/string args
      raise ValueError("invalid template() syntax, only string/numeric arguments are allowed")

    if tokens.call.funcname == 'seriesByTag':
      return fetchData(requestContext, tokens.call.raw)

    func = SeriesFunction(tokens.call.funcname)
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

  return evaluateScalarTokens(tokens)


def evaluateScalarTokens(tokens):
  if tokens.number:
    if tokens.number.integer:
      return int(tokens.number.integer)
    if tokens.number.float:
      return float(tokens.number.float)
    if tokens.number.scientific:
      return float(tokens.number.scientific[0])

    raise ValueError("unknown numeric type in target evaluator")

  if tokens.string:
    return tokens.string[1:-1]

  if tokens.boolean:
    return tokens.boolean[0] == 'true'

  if tokens.none:
    return None

  raise ValueError("unknown token in target evaluator")


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
      extractPathExpression(requestContext, tokens.template, arglist)
    elif tokens.expression:
      extractPathExpression(requestContext, tokens.expression, replacements)
      if tokens.expression.pipedCalls:
        for token in tokens.expression.pipedCalls:
          extractPathExpression(requestContext, token, replacements)
    elif tokens.pathExpression:
      expression = tokens.pathExpression
      if replacements:
        for name in replacements:
          if expression != '$'+name:
            expression = expression.replace('$'+name, str(replacements[name]))
      pathExpressions.add(expression)
    elif tokens.call:
      # if we're prefetching seriesByTag, pass the entire call back as a path expression
      if tokens.call.funcname == 'seriesByTag':
        pathExpressions.add(tokens.call.raw)
      else:
        for a in tokens.call.args:
          extractPathExpression(requestContext, a, replacements)

  for target in targets:
    if not target:
      continue

    if isinstance(target, six.string_types):
      if not target.strip():
        continue
      target = grammar.parseString(target)
    extractPathExpression(requestContext, target)

  return list(pathExpressions)
