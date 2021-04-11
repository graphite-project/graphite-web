from pyparsing import (
    Forward, Combine, Optional, Word, Literal, CaselessKeyword,
    CaselessLiteral, Group, FollowedBy, LineEnd, OneOrMore, ZeroOrMore,
    alphas, alphanums, printables, pyparsing_unicode, delimitedList, quotedString, Regex,
    __version__, Suppress, Empty
)

from django.conf import settings

grammar = Forward()

expression = Forward()

# Literals

intNumber = Regex(r'-?\d+')('integer')

floatNumber = Regex(r'-?\d+\.\d+')('float')

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

none = Group(
  CaselessKeyword('none')
)('none')

infinity = Group(
  CaselessKeyword('inf')
)('infinity')

argname = Word(alphas + '_', alphanums + '_')('argname')
funcname = Word(alphas + '_', alphanums + '_')('funcname')

## Symbols
leftParen = Literal('(').suppress()
rightParen = Literal(')').suppress()
comma = Literal(',').suppress()
equal = Literal('=').suppress()

# Function calls

## Symbols
leftBrace = Literal('{')
rightBrace = Literal('}')
leftParen = Literal('(').suppress()
rightParen = Literal(')').suppress()
comma = Literal(',').suppress()
equal = Literal('=').suppress()
backslash = Literal('\\').suppress()

symbols = '''(){},.'"\\|'''
arg = Group(
  boolean |
  number |
  none |
  aString |
  infinity |
  expression
)('args*')
kwarg = Group(argname + equal + arg)('kwargs*')

args = delimitedList(~kwarg + arg)  # lookahead to prevent failing on equals
kwargs = delimitedList(kwarg)


def setRaw(s, loc, toks):
    toks[0].raw = s[toks[0].start:toks[0].end]


call = Group(
  Empty().setParseAction(lambda s, l, t: l)('start') +
  funcname + leftParen +
  Optional(
    args + Optional(
      comma + kwargs
    )
  ) + rightParen +
  Empty().leaveWhitespace().setParseAction(lambda s, l, t: l)('end')
).setParseAction(setRaw)('call')

# Metric pattern (aka. pathExpression)
if settings.UTF8_METRICS:
    Printables = pyparsing_unicode.printables
else:
    Printables = printables
validMetricChars = ''.join((set(Printables) - set(symbols)))
escapedChar = backslash + Word(symbols + '=', exact=1)
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

litarg = Group(
  number | aString
)('args*')
litkwarg = Group(argname + equal + litarg)('kwargs*')
litargs = delimitedList(~litkwarg + litarg)  # lookahead to prevent failing on equals
litkwargs = delimitedList(litkwarg)

template = Group(
  Literal('template') + leftParen +
  (call | pathExpression) +
  Optional(comma + (litargs | litkwargs)) +
  rightParen
)('template')

pipeSep = ZeroOrMore(Literal(' ')) + Literal('|') + ZeroOrMore(Literal(' '))

pipedExpression = Group(
  (template | call | pathExpression) +
  Group(ZeroOrMore(Suppress(pipeSep) + Group(call)('pipedCall')))('pipedCalls')
)('expression')

if __version__.startswith('1.'):
    expression << pipedExpression
    grammar << expression
else:
    expression <<= pipedExpression
    grammar <<= expression


def enableDebug():
    for name, obj in globals().items():
        try:
            obj.setName(name)
            obj.setDebug(True)
        except Exception:
            pass
