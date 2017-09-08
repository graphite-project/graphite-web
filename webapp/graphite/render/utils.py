from graphite.render.grammar import grammar
from graphite.storage import STORE


def extractPathExpressions(targets):
  # Returns a list of unique pathExpressions found in the targets list

  pathExpressions = set()

  def extractPathExpression(tokens):
    if tokens.expression:
      return extractPathExpression(tokens.expression)
    elif tokens.pathExpression:
      pathExpressions.add(tokens.pathExpression)
    elif tokens.call:
      # if we're prefetching seriesByTag, look up the matching series and prefetch those
      if tokens.call.funcname == 'seriesByTag':
        if STORE.tagdb:
          for series in STORE.tagdb.find_series([t.string[1:-1] for t in tokens.call.args if t.string]):
            pathExpressions.add(series)
      else:
        for a in tokens.call.args:
          extractPathExpression(a)

  for target in targets:
    tokens = grammar.parseString(target)
    extractPathExpression(tokens)

  return list(pathExpressions)
