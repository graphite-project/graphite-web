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
var refreshTask;
var spacer; //XXX Debug

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
  {name: 'targets', type: 'auto'},
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


function initNavigator () {

  // Populate naming-scheme based datastructures
  Ext.each(schemes, function (scheme_info) {
    scheme_info.id = scheme_info.name;
    schemeRecords.push( new SchemeRecord(scheme_info) );

    Ext.each(scheme_info.fields, function (field) {

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
    hidden: false, //XXX Debug
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

  metricSelector = new Ext.tree.TreePanel({
    root: new Ext.tree.TreeNode({}),
    containerScroll: true,
    autoScroll: true,
    flex: 1.5,
    pathSeparator: '.',
    rootVisible: false,
    singleExpand: false,
    trackMouseOver: true,
    listeners: {click: metricSelectorNodeClicked}
  });

  var graphTemplate = new Ext.XTemplate(
    '<tpl for=".">',
      '<div class="graph-wrap">',
        '<img class="graph-img" src="{url}">',
      '</div>',
    '</tpl>',
    '<div class="x-clear"></div>'
  );

  graphView = new Ext.DataView({
    store: graphStore,
    tpl: graphTemplate,
    overClass: 'graph-over',
    itemSelector: 'div.graph-wrap',
    emptyText: "Configure your context above, and then select some metrics."
  });

  graphArea = new Ext.Panel({
    region: 'center',
    layout: 'fit',
    autoScroll: true,
    bodyCssClass: 'graphAreaBody',
    items: [graphView],
    tbar: new Ext.Toolbar({
      items: [
        {
          icon: REFRESH_ICON,
          tooltop: 'Refresh Graphs',
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
          id: 'time-range-text',
          xtype: 'tbtext',
          text: getTimeText()
        }, '->', {
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
    run: refreshGraphs,
    interval: UI_CONFIG.refresh_interval * 1000
  };
  Ext.TaskMgr.start(refreshTask);
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


function contextFieldChanged (combo, oldValue, newValue) {
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
  spacer.setValue(pattern);
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


function graphAreaToggle(target) {
  var existingIndex = graphStore.find('id', target);

  if (existingIndex > -1) {
    graphStore.removeAt(existingIndex);
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

function timeRangeUpdated() {
  if (TimeRange.type == 'relative') {
    var fromParam = '-' + TimeRange.quantity + TimeRange.units;
    var untilParam = 'now';
  } else {
    var fromParam = TimeRange.startDate.format('H:i_Ymd');
    var untilParam = TimeRange.endDate.format('H:i_Ymd');
  }
  spacer.setValue("from=" + fromParam + "&until=" + untilParam);
  graphArea.getTopToolbar().get('time-range-text').setText( getTimeText() );

  defaultGraphParams.from = fromParam;
  defaultGraphParams.until = untilParam;

  graphStore.each(function () {
    this.data.params.from = fromParam;
    this.data.params.until = untilParam;
  });

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
