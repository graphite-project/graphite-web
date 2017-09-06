from graphite.render.grammar import grammar


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
