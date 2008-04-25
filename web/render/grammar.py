"""Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License."""

from pyparsing import *

ParserElement.enablePackrat()
grammar = Forward()

#expression operations
expression = Forward()

intNumber = Word(nums).setResultsName('integer')
floatNumber = Combine(Word(nums) + Literal('.') + Word(nums)).setResultsName('float')
number = Group(floatNumber | intNumber).setResultsName('number')

extras = '._-+*?[]#'
pathExpression = Word(alphas+extras,alphanums+extras).setResultsName('pathExpression')
#pathExpressionList = Group(pathExpression + ZeroOrMore(Literal(',').suppress() + pathExpression)).setResultsName('pathExpressionList')

arg = Group(number | expression | quotedString.setResultsName('string'))
args = Group(
  arg + ZeroOrMore(Literal(',').suppress() + arg)
).setResultsName('args')
func = Word(alphas+'_',alphanums+'_').setResultsName('func')
call = Group(func + Literal('(').suppress() + args + Literal(')').suppress()).setResultsName('call')

expression << Group(call | pathExpression).setResultsName('expression')

grammar << expression

def buildGrammar(debug=False):
  if debug:
    for name,obj in globals().items():
      try:
        obj.setName(name)
        obj.setDebug(True)
      except:
        pass
  return grammar
