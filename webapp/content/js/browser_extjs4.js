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
var queryParam={
        query:"*",
        format:"treejson",
        path:"",
        node:"",
    };
function setTreeParam(data){
        var text=data.id
        if(text!="root"||text!="usergraph"||text!="mygraph")
        {var query=text+".*"}
        else{ var query="*"}
        queryParam.query=query
        queryParam.path=text
        queryParam.node=text
    }
function GraphiteBrowser () {
  var treePanel = createTreePanel();
  var userPanel = createUserGraph();
  var myPanel = createMyGraph();
  if (!GraphiteConfig.showMyGraphs){myPanel.disable()}
  var searchPanel = createSearchPanel();
  var completerPanel = createCompleterPanel();
  this.trees = {
    graphite: treePanel,
    mygraphs: myPanel,
    usergraphs : userPanel,
  };
  this.panel = new Ext.TabPanel({
    region: 'west',
    items: [treePanel, userPanel, myPanel,searchPanel, completerPanel],
    split: true,
    width: 300,
    collapsible: true,
    collapseMode: 'header',
    collapseDirection: "left",
    trees:this.trees,
  });
  return this.panel
}

//Tree Tab
function createTreePanel(){
    var metric_store = Ext.create('Ext.data.TreeStore', {
        root: {
            expanded: false

        },
        proxy: {
            type: 'ajax',
            url:"/metrics/find/",
            extraParams:queryParam,
        }
    });
    

    // create the Tree
    var graphiteTreePanel = Ext.create('Ext.tree.Panel', {
        store: metric_store,
        width: 300,
        title: 'Metrics',
        id: 'GraphiteTree',
        rootVisible:false,
        root:{
          expanded:true,
        },
        plugins: {
                ptype: 'bufferedrenderer'
            },
        listeners:{
            beforeitemexpand:function(record,childnode){
                if (record.data.expandable&&!record.data.expanded){
                    setTreeParam(record.data)                
                }
            },
            itemclick:function(thisview,record,item,index,e){
                
                if(record.data.leaf){
                    var node_id = record.data.id
                    Composer.toggleTarget(node_id)
                }else{
                  if (!record.data.expanded)
                  {this.expandNode(record)}
                  else{this.collapseNode(record)}
                }
                
            },
        }

    });

  

  return graphiteTreePanel;
}

function createUserGraph(){
    var user_metric_store = Ext.create('Ext.data.TreeStore', {
        root: {
            expanded: false

        },
        proxy: {
            type: 'ajax',
            url:"/browser/usergraph/",
            extraParams:queryParam,
        }
    });
    

    // create the Tree
    var userTreePanel = Ext.create('Ext.tree.Panel', {
        store: user_metric_store,
        width: 300,
        title: 'User Graphs',
        rootVisible:false,
        root:{
          id:"usergraph",
          expanded:true,
        },
        plugins: {
                ptype: 'bufferedrenderer'
            },
        listeners:{
            beforeitemexpand:function(record,childnode){

                if (record.data.expandable&&!record.data.expanded){
                    setTreeParam(record.data)                
                }
            },
            itemclick:function(thisview,record,item,index,e){
                if(record.data.leaf){
                  if (record.raw.graphUrl){
                      Composer.loadMyGraph(record.raw.text,record.raw.graphUrl)
                    }
                    var node_id = record.data.id
                    Composer.toggleTarget(node_id)
                }else{
                  if (!record.data.expanded)
                  {this.expandNode(record)}
                  else{this.collapseNode(record)}
                }
                
            },
        }

    });
    return userTreePanel;
}

function createMyGraph(){
    if(GraphiteConfig.showMyGraphs){
      var my_metric_store = Ext.create('Ext.data.TreeStore', {
        root: {
            id:"mygraph",
            expanded: false

        },
        proxy: {
            type: 'ajax',
            url:"/browser/mygraph/",
            extraParams:queryParam,
        }
      });
    }else{
      var my_metric_store = {}
    }
    

    // create the Tree
    var myTreePanel = Ext.create('Ext.tree.Panel', {
        store: my_metric_store,
        width: 300,
        title: 'My Graphs',
        rootVisible:false,
        root:{
          expanded:true,
        },
        plugins: {
                ptype: 'bufferedrenderer'
            },
        listeners:{
            beforeitemexpand:function(record,childnode){
                if (record.data.expandable&&!record.data.expanded){
                    setTreeParam(record.data)                
                }
            },
            itemclick:function(thisview,record,item,index,e){
                if(record.data.leaf){
                  if (record.raw.graphUrl){
                      Composer.loadMyGraph(record.raw.text,record.raw.graphUrl)
                    }
                }else{
                  if (!record.data.expanded)
                  {this.expandNode(record)}
                  else{this.collapseNode(record)}
                }
                
            },
        }

    });
    return myTreePanel;
}

//Search Tab
function createSearchPanel() {
  return new Ext.form.FormPanel({
    id: 'searchForm',
    title: 'Search',
    disabled: (!GraphiteConfig.searchEnabled),
    width: 200,
    containerScroll: true,
    autoScroll: true,
    html:'<a id="searchHelpLink" > Help </a> <p id="searchError"></p> <ul id="searchResults"></ul>',
    items: [
     {
        emptyText: "search for metrics",
        xtype:"textfield",
        width: 200,
        hideLabel: true,
        listeners: {specialkey: sendSearchRequest}
      }
    ],
    listeners: {render: setupSearchForm}
  });
}

function setupSearchForm(formEl) {
  //var html =Ext.dom.Element('<a id="searchHelpLink" > Help </a> <p id="searchError"></p> <ul id="searchResults"></ul>') 
  var formPanel = Ext.getCmp("searchForm");
  //Ext.DomHelper.append("searchForm", html);
  var helpAction = 'javascript: void window.open';
  var helpPage = '"../content/html/searchHelp.html"';
  var helpTitle = '"Searching Graphite"';
  var helpOptions = '"width=500,height=400,toolbar=no,location=no,directories=no,status=no,menubar=no"';
  //Ext.getDom('searchHelpLink').href = helpAction+"("+helpPage+","+helpTitle+","+helpOptions+");";
  
  formPanel.un("render",setupSearchForm); 
  showSearchError("Search request failed");
}

function showSearchError(message) {
  Ext.getDom('searchError').innerHTML = '<font color="red">' + message + '</font><br/>';
}

function sendSearchRequest (searchField, evt) {

  if (evt.getCharCode() != Ext.EventObject.RETURN) {
    return;
  }
  //Clear any previous errors
  //showSearchError("");
  //Clear the result list
  //var resultList = Ext.getDom('searchResults');
  //while (resultList.childNodes[0]) {
    //resultList.removeChild( resultList.childNodes[0] );
  //}

  Ext.Ajax.request({
    url: '../browser/search/',
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
  var resultList = Ext.getDom('searchResults');
  var results = text.split(',');
  Ext.each(results, function (item) {
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
  var metricCompleter = new MetricCompleter({emptyText: "Start typing a metric name..."});
  metricCompleter.on('specialkey', function (field, e) {
    console.log(field)
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
