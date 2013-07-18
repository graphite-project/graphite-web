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

function GraphiteBrowser () {
  var treePanel = createTreePanel();
  var searchPanel = createSearchPanel();
  var completerPanel = createCompleterPanel();
  var treeRoot = treePanel.getRootNode();

  this.trees = {
    graphite: treeRoot.findChild('id', 'GraphiteTree'),
    mygraphs: treeRoot.findChild('id', 'MyGraphsTree'),
    usergraphs: treeRoot.findChild('id', 'UserGraphsTree')
  };

  this.panel = new Ext.TabPanel({
    region: 'west',
    items: [treePanel, searchPanel, completerPanel],
    split: true,
    width: 300,
    collapsible: true,
    collapseMode: 'mini',
    activeTab: 0
  });
}

//Tree Tab
function createTreePanel(){
  var rootNode = new Ext.tree.TreeNode({});

  function setParams(loader, node) {
    var node_id = node.id.replace(/^[A-Za-z]+Tree\.?/,"");
    loader.baseParams.query = (node_id == "") ? "*" : (node_id + ".*");
    loader.baseParams.format = 'treejson';
    loader.baseParams.path = node_id;

    if (node.parentNode && node.parentNode.id == "UserGraphsTree") {
      loader.baseParams.user = node.id;
    }
  }

  var graphiteNode = new Ext.tree.AsyncTreeNode({
    id: 'GraphiteTree',
    text: "Recent jobs",
    expanded: true,
    loader: new Ext.tree.TreeLoader({
      url: "../metrics/find/",
      requestMethod: "GET",
      listeners: {beforeload: setParams}
    })
  });
  rootNode.appendChild(graphiteNode);

  //function reloadOnce (node) {
  //  node.un('beforeexpand', reloadOnce);
  //  node.reload();
  //  setTimeout(function () { node.on('beforeexpand', reloadOnce); }, 1000);
  //}

  if (GraphiteConfig.showMyGraphs) {
    var myGraphsNode = new Ext.tree.AsyncTreeNode({
      id: 'MyGraphsTree',
      text: "My Graphs",
      leaf: false,
      allowChildren: true,
      expandable: true,
      allowDrag: false,
      //listeners: {beforeexpand: reloadOnce},
      loader: new Ext.tree.TreeLoader({
        url: "../browser/mygraph/",
        requestMethod: "GET",
        listeners: {beforeload: setParams}
      })
    });
    rootNode.appendChild(myGraphsNode);
  }

  var userGraphsNode = new Ext.tree.AsyncTreeNode({
    id: 'UserGraphsTree',
    text: "User Graphs",
    //listeners: {beforeexpand: reloadOnce},
    loader: new Ext.tree.TreeLoader({
      url: "../browser/usergraph/",
      requestMethod: "GET",
      listeners: {beforeload: setParams}
    })
  });
  rootNode.appendChild(userGraphsNode);

  var treePanel = new Ext.tree.TreePanel({
    title: "Recent jobs",
    root: rootNode,
    containerScroll: true,
    autoScroll: true,
    pathSeparator: ".",
    rootVisible: false,
    singleExpand: false,
    trackMouseOver: true
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
      var url = node.attributes.graphUrl
      Composer.loadMyGraph(node.attributes.text, url);
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
    disabled: (!GraphiteConfig.searchEnabled),
    width: 200,
    containerScroll: true,
    autoScroll: true,
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
  var html = '<a id="searchHelpLink" > Help </a> <p id="searchError"></p> <ul id="searchResults"></ul>';
  Ext.DomHelper.append("searchForm", html);
  var helpAction = 'javascript: void window.open';
  var helpPage = '"../content/html/searchHelp.html"';
  var helpTitle = '"Searching Graphite"';
  var helpOptions = '"width=500,height=400,toolbar=no,location=no,directories=no,status=no,menubar=no"';
  Ext.getDom('searchHelpLink').href = helpAction+"("+helpPage+","+helpTitle+","+helpOptions+");";
  var formPanel = Ext.get("searchForm");
  formPanel.un("render",setupSearchForm);
}

function showSearchError(message) {
  Ext.getDom('searchError').innerHTML = '<font color="red">' + message + '</font><br/>';
}

function sendSearchRequest (searchField, evt) {
  if (evt.getCharCode() != Ext.EventObject.RETURN) {
    return;
  }
  //Clear any previous errors
  showSearchError("");
  //Clear the result list
  var resultList = Ext.getDom('searchResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
  Ext.Ajax.request({
    url: '../browser/search/',
    method: 'POST',
    success: handleSearchResponse,
    failure: handleSearchFailure,
    params: {query: searchField.getValue()}
  });
}

function handleSearchResponse (response, options) {
  if (!response.responseText) {
    showSearchError("Nothing matched your query");
    return;
  }
  var result = Ext.util.JSON.decode(response.responseText);
  var resultList = Ext.getDom('searchResults');
  Ext.each(result, function (item) {
    var li = document.createElement('li');

    // We don't want to toggle the target here as we'll only receive jobs names; rather open a new tab
    li.innerHTML = "<a href=\"javascript: addJobPanel('" + item[0] + "','" + item[2] + "')\">" + item[2]  + "</a>";
    resultList.appendChild(li);
  });
}

// Adds a new job tree when a name job is clicked in the search view
function addJobPanel(job, fancyname)
{

  var newTree = addJobTree(job, fancyname);
  Browser.panel.add(newTree);
  Browser.panel.setActiveTab(newTree);

}

// Creates a new Tree to add to the new job panel
function addJobTree(job, fancyname)
{
  var rootNode = new Ext.tree.TreeNode({});

  function setParams(loader, node) {
    var node_id = node.id.replace(/^[A-Za-z]+Tree\.?/,"");
    loader.baseParams.query = (node_id == "") ? "*" : (node_id + ".*");
    loader.baseParams.format = 'treejson';
    loader.baseParams.contexts = '1';
    loader.baseParams.path = node_id;
  }

  var graphiteNode = new Ext.tree.AsyncTreeNode({
    id: job,
    text: fancyname,
    expanded: true,
    loader: new Ext.tree.TreeLoader({
      url: "../metrics/find/",
      requestMethod: "GET",
      listeners: {beforeload: setParams}
    })
  });
  rootNode.appendChild(graphiteNode);

  var treePanel = new Ext.tree.TreePanel({
    id: job,
    title: fancyname,
    root: rootNode,
    containerScroll: true,
    autoScroll: true,
    pathSeparator: ".",
    closable: true,
    rootVisible: false,
    singleExpand: false,
    trackMouseOver: true
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
      var url = node.attributes.graphUrl
      Composer.loadMyGraph(node.attributes.text, url);
      return;
    }

    Composer.toggleTarget(node.id);
  });

  return treePanel;
}

function handleSearchFailure (response, options)
{
  showSearchError("Search request failed");
}

//Auto-Completer Tab
function createCompleterPanel() {
  var metricCompleter = new MetricCompleter({emptyText: "Start typing a metric name..."});

  metricCompleter.on('specialkey', function (field, e) {
    if (e.getKey() == e.ENTER) {
      var target = metricCompleter.getValue();
      Composer.toggleTarget(target);
    }
  });

  return new Ext.Panel({
    title: "Auto-Completer",
    layout: {
      type: 'vbox',
      align: 'stretch'
    },
    items: [
      metricCompleter,
      new Ext.form.Label({html: '<a id="completerHelpLink" href="../content/html/completerHelp.html", target="_new"> Help </a>'})
    ]
  });

  /*
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
  */
}

function setupCompleterForm(formEl) {
  html = '<a id="completerHelpLink" > Help </a> <div id="completerResults"/>';
  Ext.DomHelper.append("completerForm",html);
  var helpAction = 'javascript: void window.open';
  var helpPage= '"../content/html/completerHelp.html"';
  var helpTitle = '"Using the Auto-Completer"';
  var helpOptions = '"width=500,height=400,toolbar=no,location=no,directories=no,status=no,menubar=no"';
  Ext.getDom('completerHelpLink').href = helpAction+"("+helpPage+","+helpTitle+","+helpOptions+");";
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
  alert('sup');
  if(Ext.Ajax.isLoading()) {
    return;
  }
  Ext.Ajax.request({
    url: '../cli/autocomplete/',
    method: 'GET',
    success: handleCompleterResponse,
    failure: handleCompleterFailure,
    params: {short:true, path: el.value}
  });
}

function handleCompleterResponse(response, options) {
  var resultList = Ext.getDom('completerResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
  Ext.DomHelper.append('completerResults',response.responseText);
}

function handleCompleterFailure(response, options) {
  var resultList = Ext.getDom('completerResults');
  while (resultList.childNodes[0]) {
    resultList.removeChild( resultList.childNodes[0] );
  }
}
