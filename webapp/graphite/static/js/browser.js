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

// From Ext library
/*global Ext*/
// Defined in composer.html
/*global Browser Composer GraphiteConfig*/
// Defined in composer.js
/*global MetricCompleter*/

function GraphiteBrowser () {
  this.rootNode = new Ext.tree.TreeNode({});
  this.treePanel = createTreePanel( this.rootNode );
  this.searchPanel = createSearchPanel();
  this.completerPanel = createCompleterPanel();
  this.treeRoot = this.treePanel.getRootNode();

  this.trees = {
    graphite: this.treeRoot.findChild('id', 'GraphiteTree'),
    mygraphs: this.treeRoot.findChild('id', 'MyGraphsTree'),
    usergraphs: this.treeRoot.findChild('id', 'UserGraphsTree')
  };

  this.panel = new Ext.TabPanel({
    region: 'west',
    items: [this.treePanel, this.searchPanel, this.completerPanel],
    split: true,
    width: 300,
    collapsible: true,
    collapseMode: 'mini',
    activeTab: 0,
    tools: [ { id: 'refresh', handler : function(event, toolEl, panel) {

      if ( panel.activeTab.id !== 'tree' ) {
        return;
      }

      Ext.each(Object.keys(Browser.trees), function(tree) {
        if ( Browser.trees[tree] !== null ) {
          Browser.trees[tree].reload();
        }
      });

    } } ]
  });
}

function createGraphiteNode() {

  return new Ext.tree.AsyncTreeNode({
      id: 'GraphiteTree',
      text: 'Metrics',
      loader: new Ext.tree.TreeLoader({
        url: document.body.dataset.baseUrl + 'metrics/find/',
        requestMethod: 'GET',
        listeners: {beforeload: setParams}
      })
    });

} // createGraphiteNode

function setParams(loader, node) {
  var nodeId = node.id.replace(/^[A-Za-z]+Tree\.?/,'');
  loader.baseParams.query = (nodeId === '') ? '*' : (nodeId + '.*');
  loader.baseParams.format = 'treejson';
  loader.baseParams.path = nodeId;

  if (node.parentNode && node.parentNode.id == 'UserGraphsTree') {
    loader.baseParams.user = node.id;
  }
} // setParams

// Tree Tab
function createTreePanel( rootNode ){

  function setParams(loader, node) {
    var nodeId = node.id.replace(/^[A-Za-z]+Tree\.?/,'');
    loader.baseParams.query = (nodeId === '') ? '*' : (nodeId + '.*');
    loader.baseParams.format = 'treejson';
    loader.baseParams.path = nodeId;

    if (node.parentNode && node.parentNode.id == 'UserGraphsTree') {
      loader.baseParams.user = node.id;
    }
  }

  var graphiteNode = createGraphiteNode();
  rootNode.appendChild(graphiteNode);

  if (GraphiteConfig.showMyGraphs) {
    var myGraphsNode = new Ext.tree.AsyncTreeNode({
      id: 'MyGraphsTree',
      text: 'My Graphs',
      leaf: false,
      allowChildren: true,
      expandable: true,
      allowDrag: false,
      loader: new Ext.tree.TreeLoader({
        url: document.body.dataset.baseUrl + 'browser/mygraph/',
        requestMethod: 'GET',
        listeners: {beforeload: setParams}
      })
    });
    rootNode.appendChild(myGraphsNode);
  }

  var userGraphsNode = new Ext.tree.AsyncTreeNode({
    id: 'UserGraphsTree',
    text: 'User Graphs',
    loader: new Ext.tree.TreeLoader({
      url: document.body.dataset.baseUrl + 'browser/usergraph/',
      requestMethod: 'GET',
      listeners: {beforeload: setParams}
    })
  });
  rootNode.appendChild(userGraphsNode);

  var treePanel = new Ext.tree.TreePanel({
    id: 'tree',
    title: 'Tree',
    root: rootNode,
    containerScroll: true,
    autoScroll: true,
    pathSeparator: '.',
    rootVisible: false,
    singleExpand: false,
    trackMouseOver: true
  });

  treePanel.on('click', function (node,evt) {
    if (node.id == 'no-click') {
      return;
    }

    if (!node.leaf) {
      node.toggle();
      return;
    }

    if (node.attributes.graphUrl) {
      var url = node.attributes.graphUrl;
      Composer.loadMyGraph(node.attributes.text, url);
      return;
    }

    Composer.toggleTarget(node.id);
  });

  return treePanel;
}

// Search Tab
function createSearchPanel() {
  return new Ext.form.FormPanel({
    formId: 'searchForm',
    title: 'Search',
    disabled: (!GraphiteConfig.searchEnabled),
    width: 200,
    containerScroll: true,
    autoScroll: true,
    items: [
      new Ext.form.TextField({
        emptyText: 'search for metrics',
        width: 200,
        hideLabel: true,
        listeners: {specialkey: sendSearchRequest}
      })
    ],
    listeners: {render: setupSearchForm}
  });
}

var recursiveExpand = {

  parts : false,
  first : true,

  expand : function( node, nodePath ) {

    if( typeof nodePath != 'undefined' ) {
      this.parts = nodePath;
    } else {
      nodePath = recursiveExpand.parts;
    }

    if( this.first ) {
      this.first = false;
      node.expand(false, false, recursiveExpand.expand);
      return;
    }

    var nextPart = nodePath.shift();
    if (!nextPart) {
      return;
    }

    var nextNode = node.findChild('text', nextPart);
    if (!nextNode) {
      return;
    }

    nextNode.expand(false, false, recursiveExpand.expand);

  } // expand

};


function setupSearchForm(formEl) {
  var html = '<a id="searchHelpLink" > Help </a> <p id="searchError"></p> <ul id="searchResults"></ul>';
  Ext.DomHelper.append('searchForm', html);
  var helpAction = 'javascript: void window.open';
  var helpPage = '"' + document.body.dataset.staticRoot + 'html/searchHelp.html"';
  var helpTitle = '"Searching Graphite"';
  var helpOptions = '"width=500,height=400,toolbar=no,location=no,directories=no,status=no,menubar=no"';
  Ext.getDom('searchHelpLink').href = helpAction+'('+helpPage+','+helpTitle+','+helpOptions+');';
  var formPanel = Ext.get('searchForm');
  formPanel.un('render',setupSearchForm);
}

function showSearchError(message) {
  Ext.getDom('searchError').innerHTML = '<font color="red">' + message + '</font><br/>';
}

function sendSearchRequest (searchField, evt) {
  if (evt.getCharCode() != Ext.EventObject.RETURN) {
    return;
  }
  // Clear any previous errors
  showSearchError('');
  // Clear the result list
  var resultList = Ext.getDom('searchResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
  Ext.Ajax.request({
    url: document.body.dataset.baseUrl + 'browser/search/',
    method: 'POST',
    success: handleSearchResponse,
    failure: handleSearchFailure,
    params: {query: searchField.getValue()}
  });
}

function handleSearchResponse (response, options) {
  var text = response.responseText;
  if (text == '') {
    showSearchError('Nothing matched your query');
    return;
  }
  var resultList = Ext.getDom('searchResults');
  var results = text.split(',');
  Ext.each(results, function (item) {
    var li = document.createElement('li');
    li.innerHTML = '<a href="javascript: Composer.toggleTarget(\'' + item + '\');">' + item + '</a>';
    resultList.appendChild(li);
  });
}

function handleSearchFailure (response, options)
{
  showSearchError('Search request failed');
}

// Auto-Completer Tab
function createCompleterPanel() {
  var metricCompleter = new MetricCompleter({emptyText: 'Start typing a metric name...'});

  metricCompleter.on('specialkey', function (field, e) {
    if (e.getKey() == e.ENTER) {
      var target = metricCompleter.getValue();
      Composer.toggleTarget(target);
    }
  });

  return new Ext.Panel({
    title: 'Auto-Completer',
    layout: {
      type: 'vbox',
      align: 'stretch'
    },
    items: [
      metricCompleter,
      new Ext.form.Label({html: '<a id="completerHelpLink" href="' + document.body.dataset.staticRoot + 'html/completerHelp.html", target="_new"> Help </a>'})
    ]
  });
}
