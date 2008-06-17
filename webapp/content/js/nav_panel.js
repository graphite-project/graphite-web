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

//Tree Tab
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
    if (node.id == 'no-click') {
      return;
    }
    if (!node.leaf) {
      node.toggle();
      return;
    }
    if (node.attributes.graphUrl) {
      Composer.loadURL(node.attributes.graphUrl);
      return;
    }
    Composer.toggleTarget(node.id);
  });

  return treePanel;
}

//Search Tab
function createSearchPanel() {
  return new Ext.form.FormPanel({
    formId: 'searchForm',
    title: 'Search',
    width: 200,
    items: [
      new Ext.form.TextField({
        emptyText: "search for metrics",
        width: 200,
        hideLabel: true,
        listeners: {specialkey: sendSearchRequest}
      })
    ],
    listeners: {render: setupSearchForm}
  });
}

function setupSearchForm(formEl) {
  html = '<a id="searchHelpLink" > Help </a> <p id="searchError"/> <ul id="searchResults />';
  Ext.DomHelper.append("searchForm",html);
  var helpAction = 'javascript: void window.open';
  var helpPage = '"/content/html/searchHelp.html"';
  var helpTitle = '"Searching Graphite"';
  var helpOptions = '"width=500,height=400,toolbar=no,location=no,directories=no,status=no,menubar=no"';
  $('searchHelpLink').href = helpAction+"("+helpPage+","+helpTitle+","+helpOptions+");";
  var formPanel = Ext.get("searchForm");
  formPanel.un("render",setupSearchForm); 
}

function showSearchError(message) {
  $('searchError').innerHTML = '<font color="red">' + message + '</font><br/>';
}

function sendSearchRequest (searchField, evt) {
  if (evt.getKey() != Ext.EventObject.RETURN) {
    return;
  }
  //Clear any previous errors
  showSearchError("");
  //Clear the result list
  var resultList = $('searchResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
  Ext.Ajax.request({
    url: '/browser/search/',
    method: 'POST',
    success: handleSearchResponse,
    failure: handleSearchFailure,
    params: {query: searchField.getValue()}
  });
}

function handleSearchResponse (response, options) {
  var text = response.responseText;
  if (text == "") {
    showSearchError("Nothing matched your query");
    return;
  }
  var resultList = $('searchResults');
  var results = text.split(',');
  results.each(function (item) {
    var li = document.createElement('li');
    li.innerHTML = "<a href=\"javascript: Composer.toggleTarget('" + item + "');\">" + item + "</a>";
    resultList.appendChild(li);
  });
}

function handleSearchFailure (response, options)
{
  showSearchError("Search request failed");
}

//Auto-Completer Tab
function createCompleterPanel() {
  return new Ext.form.FormPanel({
    formId: "completerForm",
    title: "Auto-Completer",
    width: 200,
    items: [
      new Ext.form.TextField({
        id: "completerField",
        emptyText: "start typing a metric path",
        width: 200,
        hideLabel: true,
        listeners: {render: setupCompleterField, specialkey: completerToggle}
      })
    ],
    listeners: {render: setupCompleterForm}
  });
}

function setupCompleterForm(formEl) {
  html = '<a id="completerHelpLink" > Help </a> <div id="completerResults"/>';
  Ext.DomHelper.append("completerForm",html);
  var helpAction = 'javascript: void window.open';
  var helpPage= '"/content/html/completerHelp.html"';
  var helpTitle = '"Using the Auto-Completer"';
  var helpOptions = '"width=500,height=400,toolbar=no,location=no,directories=no,status=no,menubar=no"';
  $('completerHelpLink').href = helpAction+"("+helpPage+","+helpTitle+","+helpOptions+");";
  completer = Ext.get("completerForm");
  completer.un("render", setupCompleterForm);
}

function setupCompleterField(field) {
  field.el.on("keyup", sendCompleterRequest);
}

function completerToggle(field, evt) {
  if (evt.getKey() != Ext.EventObject.RETURN) {
    return;
  }
  Composer.toggleTarget( field.getValue() );
}

function sendCompleterRequest(evt, el) {
  if(Ext.Ajax.isLoading()) {
    return;
  }
  Ext.Ajax.request({
    url: '/cli/autocomplete/',
    method: 'GET',
    success: handleCompleterResponse,
    failure: handleCompleterFailure,
    params: {short:true, path: el.value}
  });
}

function handleCompleterResponse(response, options) {
  var resultList = $('completerResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
  Ext.DomHelper.append('completerResults',response.responseText);
}

function handleCompleterFailure(response, options) {
  var resultList = $('completerResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
}
