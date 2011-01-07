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

from graphite.thirdparty.pyparsing import *

ParserElement.enablePackrat()
grammar = Forward()

#expression operations
expression = Forward()

intNumber = Word(nums+'-',nums).setResultsName('integer')
floatNumber = Combine(Word(nums+'-',nums) + Literal('.') + Word(nums)).setResultsName('float')
numberFollow = FollowedBy(",") ^ FollowedBy(")") ^ FollowedBy(LineEnd())
number = Group(floatNumber + numberFollow | intNumber + numberFollow).setResultsName('number')

goodchars = printables.replace('(','').replace(')','').replace(',','').replace('"','').replace("'","") + ' '
pathExpression = Word(goodchars).setResultsName('pathExpression')

arg = Group(number | quotedString.setResultsName('string') | expression)
args = Group(
  arg + ZeroOrMore(Literal(',').suppress() + arg)
).setResultsName('args')
func = Word(alphas+'_',alphanums+'_').setResultsName('func')
call = Group(func + Literal('(').suppress() + args + Literal(')').suppress()).setResultsName('call')

expression << Group(call | pathExpression).setResultsName('expression')

grammar << expression

def enableDebug():
  for name,obj in globals().items():
    try:
      obj.setName(name)
      obj.setDebug(True)
    except:
      pass
