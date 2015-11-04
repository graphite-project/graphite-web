import datetime
import time
from django.conf import settings
from graphite.render.grammar import grammar
from graphite.render.datalib import fetchData, TimeSeries


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
    func = SeriesFunctions[tokens.call.func]
    args = [evaluateTokens(requestContext, arg) for arg in tokens.call.args]
    try:
      return func(requestContext, *args)
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
    return str(tokens.string)[1:-1]

  elif tokens.boolean:
    return tokens.boolean[0] == 'true'


def extractPathExpressions(targets):
  # Returns a list of unique pathExpressions found in the targets list

  pathExpressions = []

  def extractPathExpression(tokens):
    if tokens.expression:
      return extractPathExpression(tokens.expression)
    elif tokens.pathExpression:
      pathExpressions.append(tokens.pathExpression)
    elif tokens.call:
      [extractPathExpression(arg) for arg in tokens.call.args]

  for target in targets:
    tokens = grammar.parseString(target)
    extractPathExpression(tokens)

  s = set(pathExpressions)
  pathExpressions = list(s)
  return pathExpressions


#Avoid import circularities
from graphite.render.functions import SeriesFunctions,NormalizeEmptyResultError
