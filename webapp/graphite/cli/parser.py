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

grammar = Forward()

#common stuff
dash = Literal('-')
nondash = Word(printables.replace('-',''),max=1)
path = Word(printables).setResultsName('path')

#set/unset
_set = Keyword('set').setResultsName('command')
set_cmd = _set + Word(alphas).setResultsName('name') + Word(printables).setResultsName('value')
unset = Keyword('unset').setResultsName('command')
unset_cmd = unset + Word(alphas).setResultsName('name')

#echo
echo = Keyword('echo').setResultsName('command')
echo_cmd = echo + Word(printables).setResultsName('args')

#vars
vars_cmd = Keyword('vars').setResultsName('command')

#clear
clear_cmd = Keyword('clear').setResultsName('command')

#create window [style]
window = Word(alphanums+'_').setResultsName('window')
create_cmd = Keyword('create').setResultsName('command') + window

#draw
draw = Keyword('draw').setResultsName('command')

gpath = Word(alphanums + '._-+*?[]#:')
fcall = Forward()
expr = Word( printables.replace('(','').replace(')','').replace(',','') )
arg = fcall | expr
fcall << Combine( Word(alphas) + Literal('(') + arg + ZeroOrMore(',' + arg) + Literal(')') )
target = fcall | gpath
targetList = delimitedList(target).setResultsName('targets')
_from = Literal('from') + Word(printables).setResultsName('_from')
until = Literal('until') + Word(printables).setResultsName('until')
redrawspec = Literal('every') + Word(nums).setResultsName('interval')
winspec = Literal('in') + window
tempspec = Literal('using') + Word(printables).setResultsName('template')
options = Each( [Optional(_from), Optional(until), Optional(winspec), Optional(redrawspec), Optional(tempspec)] )
draw_cmd = draw + targetList + options

#change
var = Word(printables).setResultsName('var')
value = restOfLine.setResultsName('value')
change_cmd = Keyword('change').setResultsName('command') + Word(alphanums+'_*').setResultsName('window') + var + Literal('to ').suppress() + value

#add/remove
add_cmd = Keyword('add').setResultsName('command') + target.setResultsName('target') + Literal('to').suppress() + window
remove_cmd = Keyword('remove').setResultsName('command') + target.setResultsName('target') + Literal('from').suppress() + window

#help
help_cmd = Keyword('help').setResultsName('command')

#redraw
redraw_cmd = Keyword('redraw').setResultsName('command') + window + Literal('every') + Word(nums).setResultsName('interval')

#code
code_cmd = Keyword('code').setResultsName('command') + restOfLine.setResultsName('code')

#email
email_cmd = Keyword('email').setResultsName('command') + window + Literal('to') + commaSeparatedList.setResultsName('addressList')
doemail_cmd = Keyword('doemail').setResultsName('command')

#url
url_cmd = Keyword('url').setResultsName('command') + window
  
#find
find_cmd = Keyword('find').setResultsName('command') + restOfLine.setResultsName('pattern')

#save/load
view = Word(alphanums+'-_.')
save_cmd = Keyword('save').setResultsName('command') + view.setResultsName('view')
dosave_cmd = Keyword('dosave').setResultsName('command') + view.setResultsName('viewName')
load_cmd = Keyword('load').setResultsName('command') + view.setResultsName('viewName') + Optional( Keyword('above').setResultsName('above') )

#views
views_cmd = Keyword('views').setResultsName('command')

#gsave/gload
tilde = Literal('~').suppress()
slash = Literal('/').suppress()
user = Word(alphanums+'_')
graph = Word(alphanums+'_.')
gsave_cmd = Keyword('gsave').setResultsName('command') + graph.setResultsName('graphName')
dogsave_cmd = Keyword('dogsave').setResultsName('command') + graph.setResultsName('graphName')
gload_cmd = Keyword('gload').setResultsName('command') + Optional(tilde + user.setResultsName('user') + slash) + graph.setResultsName('graphName')

#graphs
graphs_cmd = Keyword('graphs').setResultsName('command') + Optional(user.setResultsName('user'))

#rmview
rmview_cmd = Keyword('rmview').setResultsName('command') + view.setResultsName('viewName')

#rmgraph
rmgraph_cmd = Keyword('rmgraph').setResultsName('command') + graph.setResultsName('graphName')

#compose
compose_cmd = Keyword('compose').setResultsName('command') + window

#login
login_cmd = Keyword('login').setResultsName('command')

#logout
logout_cmd = Keyword('logout').setResultsName('command')

#id/whoami
id_cmd = Keyword('id').setResultsName('command')
whoami_cmd = Keyword('whoami').setResultsName('command')

grammar << ( set_cmd | unset_cmd | add_cmd | remove_cmd | \
             draw_cmd | echo_cmd | vars_cmd | clear_cmd | \
             create_cmd | code_cmd | redraw_cmd | email_cmd | doemail_cmd | \
             url_cmd | change_cmd | help_cmd | find_cmd | save_cmd | \
             load_cmd | dosave_cmd | views_cmd | rmview_cmd | compose_cmd | \
             login_cmd | logout_cmd | id_cmd | whoami_cmd | \
             gsave_cmd | dogsave_cmd | gload_cmd | graphs_cmd | rmgraph_cmd | Empty() \
)

def parseInput(s):
  return grammar.parseString(s)
