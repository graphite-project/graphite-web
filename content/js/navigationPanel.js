/* Copyright 2008 Orbitz WorldWide

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */
function NavigationPanel(){
  var tree = createTreePanel();
  var search = createSearchPanel();
  var completer = createAutoCompletePanel();
  var navPanel = new Ext.TabPanel({
    region:'west',
    items:[tree,search,completer],
    width:230,
    split:true,
    collapsible:true,
    collapseMode:'mini',
    activeTab:0,
    tabWidth:100
  });
  return navPanel
}

//********TREE BROWSER STUFF
function _beforeTreeLoad(treeloader,node){
  //this hackishness removes three ... from start of full path
  //using nodeName instead of node to avoid issues upon return.
  treeloader.baseParams.nodeName = node.getPath().substr(3);
  treeloader.baseParams.lookupRoute = node.attributes.lookupRoute;
}
function _treeOnClick(node,evt){
  if(node.attributes.graphUrl){
    window.setURL(node.attributes.graphUrl);
    return;
  }
  var target = node.getPath().substr(3).split(".").reverse(); //make graphite last element
  target.pop(); //pop it off
  target.reverse(); //revert back to original config
  window.toggleTarget(target.join(".")); //return to string foo.bar.baz
}
function createTreePanel(){
  var rootNode = new Ext.tree.TreeNode({text:"root",id:"."});
  var graphiteNode = new Ext.tree.AsyncTreeNode({
    id:"graphite",
    text:"graphite",
    allowChildren:true,
    allowDrag:false,
    expandable:true,
    leaf:false,
    lookupRoute:"hierarchyLookup"
  });
  var myGraphsNode = new Ext.tree.AsyncTreeNode({
    id:"myGraphs",
    text:"My Graphs",
    allowChildren:true,
    allowDrag:false,
    expandable:true,
    leaf:false,
    lookupRoute:"myLookup"
  });
  var userGraphsNode = new Ext.tree.AsyncTreeNode({
    id:"userGraphs",
    text:"User Graphs",
    allowChildren:true,
    allowDrag:false,
    expandable:true,
    leaf:false,
    lookupRoute:"userLookup"
  });
  rootNode.appendChild([graphiteNode,myGraphsNode,userGraphsNode]);
  treeLoader = new Ext.tree.TreeLoader({url:"/browser/routeLookup/",requestMethod:"GET"})
  treeLoader.on("beforeload",_beforeTreeLoad)
  var tree = new Ext.tree.TreePanel({
    title:"browse",
    root:rootNode,
    containerScroll:true,
    pathSeparator:".",
    rootVisible:false,
    singleExpand:false,
    trackMouseOver:true,
    loader: treeLoader,
    useArrows:true // maybe turn this off not sure what it does exactly
  });
  tree.on("click",_treeOnClick);
  return tree;
}

//*************SEARCH STUFF
function handleSearchResponse (req,conn,opt)
{
  resp = req.responseText;
  setError = function(err){$('errorText').innerHTML = '<font color="red">'+err+'</font><br/>';}
  if (req.status != 200) { setError(resp); return;}
  if (resp == '') { setError("Nothing matched your query"); return; }
  var resultList = $('resultList');
  var results = resp.split(',');
  results.each(function(item){
    var li = document.createElement('li');
    li.innerHTML = "<a href=\"javascript: top.content.toggleTarget('" + item + "');\">" + item + "</a>";
    resultList.appendChild(li);
  });
}

function handleSearchException (req,exc)
{
  $('errorText').innerHTML = 'AJAX Exception ' + exc.name + ': ' + exc.message;
}

function doSearch (field,evt){
  if(evt.getKey() != Ext.EventObject.RETURN){return;}
  //Cleanup the interface
  $('errorText').innerHTML = "";
  //Clear the result list
  var resultList = $('resultList');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
  Ext.Ajax.request({
    url:"/browser/search",
    method: 'POST',
    success: handleSearchResponse,
    failure: handleSearchException,
    params: {query: field.getValue()}
  });
}

function formSetup(searchFormEl){
  var search = Ext.get("searchForm"); //this is the real extObj
  html = '<a id="helpLink" > Help </a> <p id="errorText"/> <ul id="resultList />';
  Ext.DomHelper.append("searchForm",html);
  var helpAction = 'javascript: void window.open';
  var helpContent= '"/content/html/searchHelp.html"';
  var helpTitle = '"Searching Graphite"';
  var helpOptions = '"width=500,height=400,toolbar=no,location=no,directories=no,status=no,menubar=no"';
  $('helpLink').href = helpAction+"("+helpContent+","+helpTitle+","+helpOptions+");";
  search.un("render",formSetup); 
}
function createSearchPanel(){
  var searchField = new Ext.form.TextField({
    emptyText:"Search for term",
    width:150,
    hideLabel:true
  });
  searchField.on("specialkey",doSearch);
  var search = new Ext.form.FormPanel({
    title: "search",
    items:[searchField],
    width:200,
    formId: "searchForm"
  });
  search.on("render",formSetup);
  return search;
}


//**************AUTO COMPLETER STUFF

function handleCompleterResponse(req,conn,opt){
  var resultList = $('completerResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
  Ext.DomHelper.append('completerResults',req.responseText);
}
function handleCompleterException(req,exc){
  var resultList = $('completerResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
}
function autoComplete(evt,el){
  if(Ext.Ajax.isLoading()){return;}
  Ext.Ajax.request({
    url:"/cli/completer",
    method: 'GET',
    success: handleCompleterResponse,
    failure: handleCompleterException,
    params: {short:true,path: el.value}
  });
}
function completerSetup(completerFromEl){
  completer = Ext.get("autoCompleteForm");
  html = '<a id="completerHelpLink" > Help </a> <div id="completerResults"/>';
  Ext.DomHelper.append("autoCompleteForm",html);
  var helpAction = 'javascript: void window.open';
  var helpContent= '"/content/html/completerHelp.html"';
  var helpTitle = '"Using the Auto Completer"';
  var helpOptions = '"width=500,height=400,toolbar=no,location=no,directories=no,status=no,menubar=no"';
  $('completerHelpLink').href = helpAction+"("+helpContent+","+helpTitle+","+helpOptions+");";
  completer.un("render",completerSetup);
}
function fieldRender(field){
  field.el.on("keyup",autoComplete);
}
function handleFieldEnter(field,evt){
  if(evt.getKey() != Ext.EventObject.RETURN){return;}
  window.toggleTarget(field.getValue());
}
function createAutoCompletePanel(){
 var completerField = new Ext.form.TextField({
    emptyText:"type a term",
    width:150,
    hideLabel:true,
    id: "completerField"
  });
  completerField.on("render",fieldRender);
  completerField.on("specialkey",handleFieldEnter);
  var completer = new Ext.form.FormPanel({
    title: "auto complete",
    items:[completerField],
    width:200,
    formId: "autoCompleteForm"
  });
  completer.on("render",completerSetup);
  return completer; 
}
