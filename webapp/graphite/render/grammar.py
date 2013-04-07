from pyparsing import *

ParserElement.enablePackrat()
grammar = Forward()

expression = Forward()

# Literals
intNumber = Combine(
  Optional('-') + Word(nums)
)('integer')

floatNumber = Combine(
  Optional('-') + Word(nums) + Literal('.') + Word(nums)
)('float')

sciNumber = Combine(
  (floatNumber | intNumber) + CaselessLiteral('e') + intNumber
)('scientific')

aString = quotedString('string')

# Use lookahead to match only numbers in a list (can't remember why this is necessary)
afterNumber = FollowedBy(",") ^ FollowedBy(")") ^ FollowedBy(LineEnd())
number = Group(
  (sciNumber + afterNumber) |
  (floatNumber + afterNumber) |
  (intNumber + afterNumber)
)('number')

boolean = Group(
  CaselessKeyword("true") |
  CaselessKeyword("false")
)('boolean')

# Function calls

## Symbols
leftBrace = Literal('{')
rightBrace = Literal('}')
leftParen = Literal('(').suppress()
rightParen = Literal(')').suppress()
comma = Literal(',').suppress()
equal = Literal('=').suppress()
backslash = Literal('\\').suppress()

symbols = '''(){},=.'"\\'''
arg = Group(
  boolean |
  number |
  aString |
  expression
)
args = delimitedList(arg)('args')

func = Word(alphas+'_', alphanums+'_')('func')
call = Group(
  func + Literal('(').suppress() +
  args + Literal(')').suppress()
)('call')

# Metric pattern (aka. pathExpression)
validMetricChars = ''.join((set(printables) - set(symbols)))
escapedChar = backslash + Word(symbols, exact=1)
partialPathElem = Combine(
  OneOrMore(
    escapedChar | Word(validMetricChars)
  )
)

matchEnum = Combine(
  leftBrace +
  delimitedList(partialPathElem, combine=True) +
  rightBrace
)

pathElement = Combine(
  Group(partialPathElem | matchEnum) +
  ZeroOrMore(matchEnum | partialPathElem)
)
pathExpression = delimitedList(pathElement, delim='.', combine=True)('pathExpression')

expression << Group(call | pathExpression)('expression')
grammar << expression


def enableDebug():
  for name,obj in globals().items():
    try:
      obj.setName(name)
      obj.setDebug(True)
    except:
      pass
