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

argname = Word(alphas + '_', alphanums + '_')('argname')
funcname = Word(alphas + '_', alphanums + '_')('funcname')

## Symbols
leftParen = Literal('(').suppress()
rightParen = Literal(')').suppress()
comma = Literal(',').suppress()
equal = Literal('=').suppress()

# Function calls
arg = Group(
  boolean |
  number |
  aString |
  expression
)('args*')
kwarg = Group(argname + equal + arg)('kwargs*')

args = delimitedList(~kwarg + arg)  # lookahead to prevent failing on equals
kwargs = delimitedList(kwarg)

call = Group(
  funcname + leftParen +
  Optional(
    args + Optional(
      comma + kwargs
    )
  ) + rightParen
)('call')

# Metric pattern (aka. pathExpression)
validMetricChars = alphanums + r'''!#$%&"'*+-.:;<=>?@[\]^_`|~'''
pathExpression = Combine(
  Optional(Word(validMetricChars)) +
  Combine(
    ZeroOrMore(
      Group(
        Literal('{') +
        Word(validMetricChars + ',') +
        Literal('}') + Optional( Word(validMetricChars) )
      )
    )
  )
)('pathExpression')

expression << Group(call | pathExpression)('expression')

grammar << expression

def enableDebug():
  for name,obj in globals().items():
    try:
      obj.setName(name)
      obj.setDebug(True)
    except:
      pass
