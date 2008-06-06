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

function createNavigationPanel(options) {
  return new Ext.TabPanel({
    region: 'west',
    items: [createTreePanel(options), createSearchPanel(options), createCompleterPanel(options)],
    width: 230,
    split: true,
    collapsible: true,
    collapseMode: 'mini',
    activeTab: 0,
    tabWidth: 100
  });
}

//Tree Navigation
function stripPathPrefix(path) {
  return path.replace(/^\.root\.[^\.]+\.?/,"");
}

function createTreePanel(options){
  var rootNode = new Ext.tree.TreeNode({});

  function setPath(loader,node) {
    loader.baseParams.path = node.id.replace(/^[A-Za-z]+Tree\.?/,"");
  }

  var graphiteNode = new Ext.tree.AsyncTreeNode({
    id: 'GraphiteTree',
    text: "Graphite",
    loader: new Ext.tree.TreeLoader({
      url: "/browser/tree/",
      requestMethod: "GET",
      listeners: {beforeload: setPath}
    })
  });
  rootNode.appendChild(graphiteNode);

  if (options.showMyGraphs) {
    var myGraphsNode = new Ext.tree.AsyncTreeNode({
      id: 'MyGraphsTree',
      text: "My Graphs",
      leaf: false,
      allowChildren: true,
      expandable: true,
      allowDrag: false,
      loader: new Ext.tree.TreeLoader({
        url: "/browser/mygraph/",
        requestMethod: "GET",
        listeners: {beforeload: setPath}
      })
    });
    rootNode.appendChild(myGraphsNode);
  }

  var userGraphsNode = new Ext.tree.AsyncTreeNode({
    id: 'UserGraphsTree',
    text: "User Graphs",
    loader: new Ext.tree.TreeLoader({
      url: "/browser/usergraph/",
      requestMethod: "GET",
      listeners: {beforeload: setPath}
    })
  });
  rootNode.appendChild(userGraphsNode);

  var treePanel = new Ext.tree.TreePanel({
    title: "Tree",
    root: rootNode,
    containerScroll: true,
    autoScroll: true,
    pathSeparator: ".",
    rootVisible: false,
    singleExpand: false,
    trackMouseOver: true,
  });

  treePanel.on("click", function (node,evt) {
    if (!node.leaf) {
      node.toggle();
      return;
    }
    //XXX click on a My Graph or User Graph
    //if (node.attributes.graphUrl){
    //  Composer.loadURL(node.attributes.graphUrl);
    //  return;
    //}
    Composer.toggleTarget(node.id);
  });

  return treePanel;
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
function createCompleterPanel(){
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
