from graphite.thirdparty.pyparsing import *

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

aString = quotedString('string')

# Use lookahead to match only numbers in a list (can't remember why this is necessary)
afterNumber = FollowedBy(",") ^ FollowedBy(")") ^ FollowedBy(LineEnd())
number = Group(
  (floatNumber + afterNumber) |
  (intNumber + afterNumber)
)('number')

boolean = Group(
  CaselessKeyword("true") |
  CaselessKeyword("false")
)('boolean')

# Function calls
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
