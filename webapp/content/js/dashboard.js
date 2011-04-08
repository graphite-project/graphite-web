// Global object names
var viewport;
var contextSelector;
var contextSelectorFields = [];
var selectedScheme = null;
var metricSelector;
var graphArea;
var graphStore;
var graphView;
var topBar;
var dashboardName;
var refreshTask;
var spacer;
var justClosedGraph = false;
var NOT_EDITABLE = ['from', 'until', 'width', 'height', 'target', 'uniq'];


// Record types and stores
var SchemeRecord = Ext.data.Record.create([
  {name: 'name'},
  {name: 'pattern'},
  {name: 'fields', type: 'auto'}
]);

var schemeRecords = [];

var schemesStore = new Ext.data.Store({
  fields: SchemeRecord
});


var ContextFieldValueRecord = Ext.data.Record.create([
  {name: 'name'},
  {path: 'path'}
]);

var contextFieldStore = new Ext.data.JsonStore({
  url: '/metrics/find/',
  root: 'metrics',
  idProperty: 'name',
  fields: ContextFieldValueRecord,
  baseParams: {format: 'completer', wildcards: '1'}
});


var GraphRecord = new Ext.data.Record.create([
  {name: 'id'},
  {name: 'params', type: 'auto'},
  {name: 'url'}
]);

var graphStore = new Ext.data.ArrayStore({
  fields: GraphRecord
});


var defaultGraphParams = {
  from: '-2hours',
  until: 'now',
  width: UI_CONFIG.default_graph_width,
  height: UI_CONFIG.default_graph_height
};


function initDashboard () {

  // Populate naming-scheme based datastructures
  Ext.each(schemes, function (scheme_info) {
    scheme_info.id = scheme_info.name;
    schemeRecords.push( new SchemeRecord(scheme_info) );

    Ext.each(scheme_info.fields, function (field) {

      // Context Field configuration
      contextSelectorFields.push( new Ext.form.ComboBox({
        id: scheme_info.name + '-' + field.name,
        fieldLabel: field.label,
        width: CONTEXT_FIELD_WIDTH,
        mode: 'remote',
        triggerAction: 'all',
        editable: true,
        forceSelection: false,
        store: contextFieldStore,
        displayField: 'name',
        queryDelay: 100,
        queryParam: 'query',
        minChars: 1,
        typeAhead: false,
        value: "*",
        listeners: {
          beforequery: buildQuery,
          change: contextFieldChanged,
          select: function (thisField) { thisField.triggerBlur(); },
          afterrender: function (thisField) { thisField.hide(); },
          hide: function (thisField) { thisField.getEl().up('.x-form-item').setDisplayed(false); },
          show: function (thisField) { thisField.getEl().up('.x-form-item').setDisplayed(true); }
        }
      }) );

    });

  });
  schemesStore.add(schemeRecords);

  spacer = new Ext.form.TextField({
    hidden: true,
    hideMode: 'visibility'
  });

  var metricTypeCombo = new Ext.form.ComboBox({
    fieldLabel: 'Metric Type',
    width: CONTEXT_FIELD_WIDTH,
    mode: 'local',
    triggerAction: 'all',
    editable: false,
    store: schemesStore,
    displayField: 'name',
    listeners: {
      select: metricTypeSelected
    }
  });

  contextSelector = new Ext.form.FormPanel({
    flex: 1,
    autoScroll: true,
    labelAlign: 'right',
    items: [
      spacer,
      metricTypeCombo
    ].concat(contextSelectorFields)
  });

  function expandNode(node, recurse) {
    function addAll () {
      Ext.each(node.childNodes, function (child) {
        if (child.leaf) {
          graphAreaToggle(child.id, true);
        } else if (recurse) {
          expandNode(child, recurse);
        }
      });
    }

    if (node.isExpanded()) {
      addAll();
    } else {
      node.expand(false, false, addAll);
    }
  }

  var folderContextMenu = new Ext.menu.Menu({
    items: [{
      text: "Add All Metrics",
      handler: function (item, e) {
                 expandNode(item.parentMenu.node, false);
               }
    }, {
      text: "Add All Metrics (recursively)",
      handler: function (item, e) {
                 expandNode(item.parentMenu.node, true);
               }
    }]
  });

  metricSelector = new Ext.tree.TreePanel({
    root: new Ext.tree.TreeNode({}),
    containerScroll: true,
    autoScroll: true,
    flex: 1.5,
    pathSeparator: '.',
    rootVisible: false,
    singleExpand: false,
    trackMouseOver: true,
    listeners: {
      click: metricSelectorNodeClicked,
      contextmenu: function (node, e) {
                     if (!node.leaf) {
                       folderContextMenu.node = node;
                       folderContextMenu.showAt( e.getXY() );
                     }
                   }
    }
  });

  var graphTemplate = new Ext.XTemplate(
    '<tpl for=".">',
      '<div class="graph-container">',
        '<div class="graph-overlay">',
          '<img class="graph-img" src="{url}">',
          '<div class="overlay-close-button" onclick="javascript: graphAreaToggle(\'{id}\'); justClosedGraph = true;">X</div>',
        '</div>',
      '</div>',
    '</tpl>',
    '<div class="x-clear"></div>'
  );

  graphView = new Ext.DataView({
    store: graphStore,
    tpl: graphTemplate,
    overClass: 'graph-over',
    itemSelector: 'div.graph-container',
    emptyText: "Configure your context above, and then select some metrics.",
    autoScroll: true,
    listeners: {click: graphClicked}
  });

  graphArea = new Ext.Panel({
    region: 'center',
    layout: 'fit',
    autoScroll: false,
    bodyCssClass: 'graphAreaBody',
    items: [graphView],
    tbar: new Ext.Toolbar({
      items: [
        {
          icon: REFRESH_ICON,
          tooltip: 'Refresh Graphs',
          handler: refreshGraphs
        }, {
          icon: CLOCK_ICON,
          tooltip: 'View Recent Data',
          handler: selectRelativeTime,
          scope: this
        }, {
          icon: CALENDAR_ICON,
          tooltip: 'View Time Range',
          handler: selectAbsoluteTime,
          scope: this
        }, '-', {
          text: 'Dashboard',
          menu: {
            items: [
/*
              {
                text: "Open",
                handler: function (item, e) {
                           Ext.Msg.prompt(
                             "Load Dashboard",
                             "Enter the name of the dashboard you would like to open",
                             function (button, text) {
                               if (button == 'ok' && text.length > 0) {
                                 sendLoadRequest(text);
                               }
                             }
                           );
                         }
              },
*/
              {
                text: "Open",
                handler: showDashboardFinder
              }, {
                id: 'dashboard-save-button',
                text: "Save",
                handler: function (item, e) {
                           sendSaveRequest(dashboardName);
                         },
                disabled: (dashboardName == null) ? true : false
              }, {
                text: "Save As",
                handler: saveDashboard
              }, {
                id: 'dashboard-delete-button',
                text: "Delete",
                handler: function (item, e) {
                           Ext.Msg.confirm(
                             "Delete Dashboard",
                             "Are you sure you want to delete the " + dashboardName + " dashboard?",
                             function (button) {
                               if (button == 'yes') {
                                 deleteDashboard(dashboardName);
                               }
                             }
                           )
                         },
                disabled: (dashboardName == null) ? true : false
              }
            ]
          }
        }, {
          text: 'Graphs',
          menu: {
            items: [
              {
                text: "Resize",
                handler: selectGraphSize
              }, {
                text: "Remove All",
                handler: removeAllGraphs
              }
            ]
          }
        }, '-', {
          id: 'time-range-text',
          xtype: 'tbtext',
          text: getTimeText()
        }, '->', {
          xtype: 'button',
          id: 'auto-refresh-button',
          text: "Auto-Refresh",
          enableToggle: true,
          pressed: true,
          tooltip: "Toggle auto-refresh",
          toggleHandler: function (button, pressed) {
                           if (pressed) {
                             Ext.TaskMgr.start(refreshTask);
                           } else {
                             Ext.TaskMgr.stop(refreshTask);
                           }
                         }
        }, {
          xtype: 'tbtext',
          text: 'every'
        }, {
          id: 'auto-refresh-field',
          xtype: 'textfield',
          width: 25,
          value: UI_CONFIG.refresh_interval,
          enableKeyEvents: true,
          disableKeyFilter: true,
          listeners: {
            change: function (field, newValue) { updateAutoRefresh(newValue); },
            specialkey: function (field, e) {
                          if (e.getKey() == e.ENTER) {
                            updateAutoRefresh( field.getValue() );
                          }
                        }
          }
        }, {
          xtype: 'tbtext',
          text: 'seconds'
        }, '-', {
          xtype: 'tbtext',
          text: 'Last Refreshed: '
        }, {
          id: 'last-refreshed-text',
          xtype: 'tbtext',
          text: ( new Date() ).format('g:i:s A')
        }
      ]
    })
  });

  topBar = new Ext.Panel({
    region: 'north',
    layout: 'hbox',
    layoutConfig: { align: 'stretch' },
    collapsible: true,
    collapseMode: 'mini',
    split: true,
    header: false,
    height: 220,
    items: [contextSelector, metricSelector]
  });

  viewport = new Ext.Viewport({
    layout: 'border',
    items: [
      topBar,
      graphArea
    ]
  });

  refreshTask = {
    enabled: true,
    run: refreshGraphs,
    interval: UI_CONFIG.refresh_interval * 1000
  };
  Ext.TaskMgr.start(refreshTask);

  // Load initial dashboard state if it was passed in
  if (initialState) {
    applyState(initialState);
  }

  if (initialError) {
    Ext.Msg.alert("Error", initialError);
  }
}


function metricTypeSelected (combo, record, index) {
  selectedScheme = record;

  // Show only the fields for the selected context
  Ext.each(contextSelectorFields, function (field) {
    if (field.getId().indexOf( selectedScheme.get('name') ) == 0) {
      field.show();
    } else {
      field.hide();
    }
  });

  contextFieldChanged();
}


function buildQuery (queryEvent) {
  var queryString = "";
  var parts = selectedScheme.get('pattern').split('.');
  var schemeName = selectedScheme.get('name');

  // Clear cached records to force JSON queries every time
  contextFieldStore.removeAll();
  delete queryEvent.combo.lastQuery;

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var field = part.match(/^<[^>]+>$/) ? part.substr(1, part.length - 2) : null;

    if (field == null) {
      queryString += part + '.';
      continue;
    }

    var combo = Ext.getCmp(schemeName + '-' + field);
    var value = combo.getValue();

    if (UI_CONFIG.automatic_variants) {
      if (value.indexOf(',') > -1 && value.search(/[{}]/) == -1) {
        value = '{' + value + '}';
      }
    }

    if (combo === queryEvent.combo) {
      queryEvent.query = queryString + queryEvent.query + '*';
      return;
    } else {
      if (value) {
        queryString += value + '.';
      } else {
        Ext.Msg.alert('Missing Context', 'Please fill out all of the fields above first.');
        queryEvent.cancel = true;
        return;
      }
    }
  }

  Ext.Msg.alert('Error', 'Failed to build query, could not find "' + queryEvent.combo.getId() + '" field');
  queryEvent.cancel = true;
}


function contextFieldChanged () {
  var schemeName = selectedScheme.get('name');
  var pattern = selectedScheme.get('pattern');
  var fields = selectedScheme.get('fields');
  var missing_fields = false;

  Ext.each(fields, function (field) {
    var id = schemeName + '-' + field.name;
    var value = Ext.getCmp(id).getValue();

    if (UI_CONFIG.automatic_variants) {
      if (value.indexOf(',') > -1 && value.search(/[{}]/) == -1) {
        value = '{' + value + '}';
      }
    }

    if (value.trim() == "") {
      missing_fields = true;
    } else {
      pattern = pattern.replace('<' + field.name + '>', value);
    }
  });

  if (missing_fields) {
    return;
  }

  metricSelectorShow(pattern);
}

function metricSelectorShow(pattern) {
  var base_parts = pattern.split('.');

  function setParams (loader, node, callback) {
    loader.baseParams.format = 'treejson';

    if (node.id == 'rootMetricSelectorNode') {
      loader.baseParams.query = pattern + '.*';
    } else {
      var id_parts = node.id.split('.');
      id_parts.splice(0, base_parts.length); //make it relative
      var relative_id = id_parts.join('.');
      loader.baseParams.query = pattern + '.' + relative_id + '.*';
    }
  }

  var loader = new Ext.tree.TreeLoader({
    url: '/metrics/find/',
    requestMethod: 'GET',
    listeners: {beforeload: setParams}
  });

  try {
    var oldRoot = Ext.getCmp('rootMetricSelectorNode')
    oldRoot.destroy();
  } catch (err) { }

  var root = new Ext.tree.AsyncTreeNode({
    id: 'rootMetricSelectorNode',
    loader: loader
  });

  metricSelector.setRootNode(root);
  root.expand();
}


function metricSelectorNodeClicked (node, e) {
  if (!node.leaf) {
    node.toggle();
    return;
  }

  graphAreaToggle(node.id);
}


function graphAreaToggle(target, dontRemove) {
  var existingIndex = graphStore.find('id', target);

  if (existingIndex > -1) {
    if (!dontRemove) {
      graphStore.removeAt(existingIndex);
    }
  } else {
    // Add it
    var params = Ext.apply({target: [target]}, defaultGraphParams);
    var record = new GraphRecord({
      id: target,
      params: params,
      url: '/render?' + Ext.urlEncode(params)
    });
    graphStore.add([record]);
  }

}

function refreshGraphs() {
  graphStore.each(function () {
    this.data.params.uniq = Math.random();
    this.set('url', '/render?' + Ext.urlEncode(this.get('params')));
  });
  graphView.refresh();
  graphArea.getTopToolbar().get('last-refreshed-text').setText( (new Date()).format('g:i:s A') );
}

/*
function refreshGraph(index) {
  var node = graphView.getNode(index);
  var record = graphView.getRecord(node);
  record.data.params.uniq = Math.random();
  record.set('url', '/render?' + Ext.urlEncode(record.get('params')));

  // This refreshNode method only refreshes the record data, it doesn't re-render
  // the template. Which is pretty useless... It would be more efficient if we
  // could simply re-render the template. Need to see if thats feasible.
  //graphView.refreshNode(node);

  // This is *slightly* better than just calling refreshGraphs() because we're only
  // updating the URL of one graph, so caching should save us from re-rendering each
  // graph.
  //graphView.refresh();
}
*/

function updateAutoRefresh (newValue) {
  Ext.getCmp('auto-refresh-field').setValue(newValue);

  var value = parseInt(newValue);
  if ( isNaN(value) ) {
    return;
  }

  if (Ext.getCmp('auto-refresh-button').pressed) {
    Ext.TaskMgr.stop(refreshTask);
    refreshTask.interval = value * 1000;
    Ext.TaskMgr.start(refreshTask);
  } else {
    refreshTask.interval = value * 1000;
  }
}


/* Time Range management */
var TimeRange = {
  // Default to a relative time range
  type: 'relative',
  quantity: '2',
  units: 'hours',
  // Absolute time range
  startDate: new Date(),
  startTime: "9:00 AM",
  endDate: new Date(),
  endTime: "5:00 PM"
}

function getTimeText() {
  if (TimeRange.type == 'relative') {
    return "Now showing the past " + TimeRange.quantity + ' ' + TimeRange.units;
  } else {
    var fmt = 'g:ia F jS Y';
    return "Now Showing " + TimeRange.startDate.format(fmt) + ' through ' + TimeRange.endDate.format(fmt);
  }
}

function updateTimeText() {
  graphArea.getTopToolbar().get('time-range-text').setText( getTimeText() );
}

function timeRangeUpdated() {
  if (TimeRange.type == 'relative') {
    var fromParam = '-' + TimeRange.quantity + TimeRange.units;
    var untilParam = 'now';
  } else {
    var fromParam = TimeRange.startDate.format('H:i_Ymd');
    var untilParam = TimeRange.endDate.format('H:i_Ymd');
  }
  defaultGraphParams.from = fromParam;
  defaultGraphParams.until = untilParam;

  graphStore.each(function () {
    this.data.params.from = fromParam;
    this.data.params.until = untilParam;
  });

  updateTimeText();
  refreshGraphs();
}


function selectRelativeTime() {
  var quantityField = new Ext.form.TextField({
    fieldLabel: "Show the past",
    width: 90,
    allowBlank: false,
    regex: /\d+/,
    regexText: "Please enter a number",
    value: TimeRange.quantity
  });

  var unitField = new Ext.form.ComboBox({
    fieldLabel: "",
    width: 90,
    mode: 'local',
    editable: false,
    triggerAction: 'all',
    allowBlank: false,
    forceSelection: true,
    store: ['minutes', 'hours', 'days', 'weeks', 'months'],
    value: TimeRange.units
  });

  var win;

  function updateTimeRange() {
    TimeRange.type = 'relative';
    TimeRange.quantity = quantityField.getValue();
    TimeRange.units = unitField.getValue();
    win.close();
    timeRangeUpdated();
  }

  win = new Ext.Window({
    title: "Select Relative Time Range",
    width: 205,
    height: 130,
    resizable: false,
    layout: 'form',
    labelAlign: 'right',
    labelWidth: 90,
    items: [quantityField, unitField],
    buttonAlign: 'center',
    buttons: [
      {text: 'Ok', handler: updateTimeRange},
      {text: 'Cancel', handler: function () { win.close(); } }
    ]
  });
  win.show();
}

function selectAbsoluteTime() {
  var startDateField = new Ext.form.DateField({
    fieldLabel: 'Start Date',
    width: 125,
    value: TimeRange.startDate || ''
  });

  var startTimeField = new Ext.form.TimeField({
    fieldLabel: 'Start Time',
    width: 125,
    allowBlank: false,
    increment: 30,
    value: TimeRange.startTime || ''
  });

  var endDateField = new Ext.form.DateField({
    fieldLabel: 'End Date',
    width: 125,
    value: TimeRange.endDate || ''
  });

  var endTimeField = new Ext.form.TimeField({
    fieldLabel: 'End Time',
    width: 125,
    allowBlank: false,
    increment: 30,
    value: TimeRange.endTime || ''
  });

  var win;

  function updateTimeRange() {
    TimeRange.type = 'absolute';
    TimeRange.startDate = new Date(startDateField.getValue().format('Y/m/d ') + startTimeField.getValue());
    TimeRange.startTime = startTimeField.getValue();
    TimeRange.endDate = new Date(endDateField.getValue().format('Y/m/d ') + endTimeField.getValue());
    TimeRange.endTime = endTimeField.getValue();
    win.close();
    timeRangeUpdated();
  }

  win = new Ext.Window({
    title: "Select Absolute Time Range",
    width: 225,
    height: 180,
    resizable: false,
    layout: 'form',
    labelAlign: 'right',
    labelWidth: 70,
    items: [startDateField, startTimeField, endDateField, endTimeField],
    buttonAlign: 'center',
    buttons: [
      {text: 'Ok', handler: updateTimeRange},
      {text: 'Cancel', handler: function () { win.close(); } }
    ]
  });
  win.show();
}


/* Graph size stuff */

var GraphSize = {
  width: UI_CONFIG.default_graph_width,
  height: UI_CONFIG.default_graph_height
};

function selectGraphSize() {
  var widthField = new Ext.form.TextField({
    fieldLabel: "Width",
    width: 80,
    regex: /\d+/,
    regexText: "Please enter a number",
    allowBlank: false,
    value: GraphSize.width || UI_CONFIG.default_graph_width
  });

  var heightField = new Ext.form.TextField({
    fieldLabel: "Height",
    width: 80,
    regex: /\d+/,
    regexText: "Please enter a number",
    allowBlank: false,
    value: GraphSize.height || UI_CONFIG.default_graph_height
  })

  var win;

  function resize() {
    GraphSize.width = defaultGraphParams.width = widthField.getValue();
    GraphSize.height = defaultGraphParams.height = heightField.getValue();
    win.close();

    graphStore.each(function () {
      this.data.params.width = GraphSize.width;
      this.data.params.height = GraphSize.height;
    });
    refreshGraphs();
  }

  win = new Ext.Window({
    title: "Change Graph Size",
    width: 185,
    height: 120,
    resizable: false,
    layout: 'form',
    labelAlign: 'right',
    labelWidth: 80,
    items: [widthField, heightField],
    buttonAlign: 'center',
    buttons: [
      {text: 'Ok', handler: resize},
      {text: 'Cancel', handler: function () { win.close(); } }
    ]
  });
  win.show();
}

/* Other stuff */
var targetListing;

function graphClicked(graphView, index, element, evt) {
  var record = graphStore.getAt(index);
  if (!record) {
    return;
  }

  if (justClosedGraph) {
    justClosedGraph = false;
    return;
  }

  var menu;
  var menuItems = [];

  Ext.each(record.data.params.target, function (target, index) {
    menuItems.push({
      xtype: 'textfield',
      fieldLabel: "Target",
      allowBlank: false,
      grow: true,
      growMin: 150,
      value: target,
      disableKeyFilter: true,
      listeners: {
        specialkey: function (field, e) {
                      if (e.getKey() == e.ENTER) {
                        record.data.params.target[index] = field.getValue();
                        refreshGraphs();
                        menu.destroy();
                      }
                    }
      }
    });
  });

  var editParams = Ext.apply({}, record.data.params);
  removeUneditable(editParams);
  menuItems.push({
    xtype: 'textfield',
    fieldLabel: "Params",
    allowBlank: true,
    grow: true,
    growMin: 150,
    value: Ext.urlEncode(editParams),
    disableKeyFilter: true,
    listeners: {
      specialkey: function (field, e) {
                    if (e.getKey() == e.ENTER) {
                      var newParams = Ext.urlDecode( field.getValue() );
                      copyUneditable(record.data.params, newParams);
                      record.data.params = newParams;
                      refreshGraphs();
                      menu.destroy();
                    }
                  }
    }
  });

  menuItems.push({
    xtype: 'button',
    fieldLabel: "<span style='visibility: hidden'>",
    text: 'Breakout Into Separate Graphs',
    handler: function () { menu.destroy(); breakoutGraph(record); }
  });

  menu = new Ext.menu.Menu({
    layout: 'form',
    labelWidth: 72,
    labelAlign: 'right',
    items: menuItems
  });
  menu.showAt( evt.getXY() );
  menu.get(0).focus(false, 50);
  menu.keyNav.disable();
}


function removeUneditable (obj) {
  Ext.each(NOT_EDITABLE, function (p) {
    delete obj[p];
  });
  return obj;
}

function copyUneditable (src, dst) {
  Ext.each(NOT_EDITABLE, function (p) {
    if (src[p] === undefined) {
      delete dst[p];
    } else {
      dst[p] = src[p];
    }
  });
}


function breakoutGraph(record) {
  Ext.Ajax.request({
    url: '/metrics/expand/',
    params: {
      query: record.data.params.target
    },
    callback: function (options, success, response) {
                var responseObj = Ext.decode(response.responseText);
                graphStore.remove(record);
                Ext.each(responseObj.results, function (metricPath) {
                  graphAreaToggle(metricPath, true);
                });
              }
  });
}


function removeAllGraphs() {
  Ext.Msg.confirm(
    "Are you sure?",
    "Are you sure you want to remove all the graphs?",
    function (choice) {
      if (choice == 'yes') {
        graphStore.removeAll();
        refreshGraphs();
      }
    }
  );
}


function toggleToolbar() {
  var tbar = graphArea.getTopToolbar();
  tbar.setVisible( ! tbar.isVisible() );
  graphArea.doLayout();
}

var keyMap = new Ext.KeyMap(document, {
  key: 'z',
  ctrl: true,
  handler: toggleToolbar
});


/* Dashboard functions */
function saveDashboard() {
  Ext.Msg.prompt(
    "Save Dashboard",
    "Enter the name to save this dashboard as",
    function (button, text) {
      if (button == 'ok') {
        setDashboardName(text);
        sendSaveRequest(text);
      }
    },
    this,
    false,
    (dashboardName) ? dashboardName : ""
  );
}

function sendSaveRequest(name) {
  Ext.Ajax.request({
    url: "/dashboard/save/" + name,
    method: 'POST',
    params: {
      state: Ext.encode( getState() )
    },
    success: function (response) {
               var result = Ext.decode(response.responseText);
               if (result.error) {
                 Ext.Msg.alert("Error", "There was an error saving this dashboard: " + result.error);
               }
             },
    failure: failedAjaxCall
  });
}

function sendLoadRequest(name) {
  Ext.Ajax.request({
    url: "/dashboard/load/" + name,
    success: function (response) {
               var result = Ext.decode(response.responseText);
               if (result.error) {
                 Ext.Msg.alert("Error Loading Dashboard", result.error);
               } else {
                 applyState(result.state);
               }
             },
    failure: failedAjaxCall
  });
}

function getState() {
  var graphs = [];
  graphStore.each(
    function (record) {
      graphs.push([
        record.data.id,
        record.data.params,
        record.data.url
      ]);
    }
  );

  return {
    name: dashboardName,
    timeConfig: TimeRange,
    refreshConfig: {
      enabled: Ext.getCmp('auto-refresh-button').pressed,
      interval: refreshTask.interval
    },
    graphSize: GraphSize,
    graphs: graphs
  };
}

function applyState(state) {
  setDashboardName(state.name);

  //state.timeConfig = {type, relativeConfig={, absoluteConfig}
  var timeConfig = state.timeConfig
  TimeRange.type = timeConfig.type;
  TimeRange.quantity = timeConfig.quantity;
  TimeRange.units = timeConfig.units;
  TimeRange.startDate = new Date(timeConfig.startDate);
  TimeRange.startTime = timeConfig.startTime;
  TimeRange.endDate = new Date(timeConfig.endDate);
  TimeRange.endTime = timeConfig.endTime;
  updateTimeText();

  //state.refreshConfig = {enabled, interval}
  var refreshConfig = state.refreshConfig;
  if (refreshConfig.enabled) {
    Ext.TaskMgr.stop(refreshTask);
    Ext.TaskMgr.start(refreshTask);
    Ext.getCmp('auto-refresh-button').toggle(true);
  } else {
    Ext.TaskMgr.stop(refreshTask);
    Ext.getCmp('auto-refresh-button').toggle(false);
  }
  //refreshTask.interval = refreshConfig.interval;
  updateAutoRefresh(refreshConfig.interval / 1000);

  //state.graphSize = {width, height}
  var graphSize = state.graphSize;
  GraphSize.width = graphSize.width;
  GraphSize.height = graphSize.height;

  //state.graphs = [ [id, params, url], ... ]
  graphStore.loadData(state.graphs);

  refreshGraphs();
}

function deleteDashboard(name) {
  Ext.Ajax.request({
    url: "/dashboard/delete/" + name,
    success: function (response) {
      var result = Ext.decode(response.responseText);
      if (result.error) {
        Ext.Msg.alert("Error", "Failed to delete dashboard '" + name + "': " + result.error);
      } else {
        Ext.Msg.alert("Dashboard Deleted", "The " + name + "dashboard was deleted successfully.");
      }
    },
    failure: failedAjaxCall
  });
}

function setDashboardName(name) {
  dashboardName = name;
  document.title = name + " - Graphite Dashboard";
  Ext.getCmp('dashboard-save-button').enable();
  Ext.getCmp('dashboard-delete-button').enable();
}

function failedAjaxCall(response, options) {
  Ext.Msg.alert(
    "Ajax Error",
    "Ajax call failed, response was :" + response.responseText
  );
}


// Dashboard Finder
function showDashboardFinder() {
  var win;
  var dashboardsList;
  var queryField;
  var dashboardsStore = new Ext.data.JsonStore({
    url: "/dashboard/find/",
    method: 'GET',
    params: {query: "e"},
    fields: ['name'],
    root: 'dashboards',
    listeners: {
      beforeload: function (store) {
                    store.setBaseParam('query', queryField.getValue());
                  }
    }
  });

  function openSelected() {
    var selected = dashboardsList.getSelectedRecords();
    if (selected.length > 0) {
      sendLoadRequest(selected[0].data.name);
    }
    win.close();
  }

  dashboardsList = new Ext.list.ListView({
    columns: [
      {header: 'Dashboard', width: 1.0, dataIndex: 'name', sortable: false}
    ],
    columnSort: false,
    emptyText: "No dashboards found",
    hideHeaders: true,
    listeners: {
      selectionchange: function (listView, selections) {
                         var button = Ext.getCmp('finder-open-button');
                         if (listView.getSelectedRecords().length == 0) {
                           button.disable();
                         } else {
                           button.enable();
                         }
                       },

      dblclick: function (listView, index, node, e) {
                  var record = dashboardsStore.getAt(index);
                  sendLoadRequest(record.data.name);
                  win.close();
                }
    },
    overClass: '',
    region: 'center',
    reserveScrollOffset: true,
    singleSelect: true,
    store: dashboardsStore,
    style: "background-color: white;"
  });

  var lastQuery = null;
  var queryUpdateTask = new Ext.util.DelayedTask(
    function () {
      var currentQuery = queryField.getValue();
      if (lastQuery != currentQuery) {
        dashboardsStore.load();
      }
      lastQuery = currentQuery;
    }
  );

  queryField = new Ext.form.TextField({
    region: 'south',
    emptyText: "filter dashboard listing",
    enableKeyEvents: true,
    listeners: {
      keyup: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    sendLoadRequest(field.getValue());
                    win.close();
                  } else {
                    queryUpdateTask.delay(QUERY_DELAY);
                  }
                }
    }
  });

  win = new Ext.Window({
    title: "Find Dashboards",
    width: 400,
    height: 500,
    layout: 'border',
    modal: true,
    items: [
      dashboardsList,
      queryField
    ],
    buttons: [
      {
        id: 'finder-open-button',
        text: "Open",
        disabled: true,
        handler: openSelected
      }, {
        text: "Cancel",
        handler: function () { win.close(); }
      }
    ]
  });
  dashboardsStore.load();
  win.show();
}
