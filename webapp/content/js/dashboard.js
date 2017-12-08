// From Ext library
/*global Ext*/
// Defined in dashboard.html
/*global AUTOCOMPLETE_DELAY CALENDAR_ICON CLOCK_ICON CONTEXT_FIELD_WIDTH FINDER_QUERY_DELAY*/
/*global HELP_ICON NEW_DASHBOARD_REMOVE_GRAPHS REFRESH_ICON REMOVE_ICON RESIZE_ICON*/
/*global SHARE_ICON UI_CONFIG initialState initialError permissions queryString userName*/
/*global permissionsUnauthenticated schemes*/
// Defined in composer_widgets.js
/*global createFunctionsMenu createOptionsMenu updateCheckItems*/

// Global object names
var viewport;
var contextSelector;
var contextSelectorFields = [];
var selectedScheme = null;
var selectedRecord = null;
var metricSelector;
var metricSelectorMode;
var metricSelectorGrid;
var metricSelectorTextField;
var graphArea;
var graphStore;
var graphView;
var navBar;
var dashboardName;
var dashboardURL;
var refreshTask;
var spacer;
var justClosedGraph = false;
var NOT_EDITABLE = ['from', 'until', 'width', 'height', 'target', 'uniq', '_uniq'];
var editor = null;

var cookieProvider = new Ext.state.CookieProvider({
  path: document.body.dataset.baseUrl + 'dashboard'
});

var NAV_BAR_REGION = cookieProvider.get('navbar-region') || 'north';

var CONFIRM_REMOVE_ALL = cookieProvider.get('confirm-remove-all') != 'false';

var currentlySettingHash = false;

function changeHash(hash){
    currentlySettingHash = true;
    window.location.hash = hash;
}

if ('onhashchange' in window) // does the browser support the hashchange event?
  window.onhashchange = function () {
    if (currentlySettingHash){
      currentlySettingHash = false;
      return;
    }
    location.reload();
  }

/* Nav Bar configuration */
var navBarNorthConfig = {
  region: 'north',
  layout: 'hbox',
  layoutConfig: { align: 'stretch' },
  collapsible: true,
  collapseMode: 'mini',
  collapsed: false,
  split: true,
  title: 'untitled',
  height: 350,
  listeners: {
    expand: function() { focusCompleter(); } // defined below
  }
};

var navBarWestConfig = Ext.apply({}, navBarNorthConfig);
delete navBarWestConfig.height;
navBarWestConfig.region = 'west';
navBarWestConfig.layout = 'vbox';
navBarWestConfig.width = 338;


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
  url: document.body.dataset.baseUrl + 'metrics/find/',
  root: 'metrics',
  idProperty: 'name',
  fields: ContextFieldValueRecord,
  baseParams: {format: 'completer', wildcards: '1'}
});


var GraphRecord = new Ext.data.Record.create([
  {name: 'target'},
  {name: 'params', type: 'auto'},
  {name: 'url'},
  {name: 'width', type: 'auto'},
  {name: 'height', type: 'auto'},
  {name: 'loading'},
]);

var graphStore;
function graphStoreUpdated() {
  if (metricSelectorGrid) metricSelectorGrid.getView().refresh();
}

graphStore = new Ext.data.ArrayStore({
  fields: GraphRecord,
  listeners: {
    add: graphStoreUpdated,
    remove: graphStoreUpdated,
    update: graphStoreUpdated
  }
});

var originalDefaultGraphParams = {
  from: '-2hours',
  until: 'now',
  width: UI_CONFIG.default_graph_width,
  height: UI_CONFIG.default_graph_height
};
var defaultGraphParams;
//XXX
// Per-session default graph params
var sessionDefaultParamsJson = cookieProvider.get('defaultGraphParams');
if (sessionDefaultParamsJson && sessionDefaultParamsJson.length > 0) {
  defaultGraphParams = Ext.decode(sessionDefaultParamsJson);
} else {
  defaultGraphParams = Ext.apply({}, originalDefaultGraphParams);
}

function isLoggedIn() {
  return userName != null;
}

function hasPermission(permission) {
  for (const i in permissions) {
    if (permissions[i] === permission) {
      return true;
    }
  }
  return false;
}

function initDashboard () {

  // Populate naming-scheme based datastructures
  Ext.each(schemes, function (schemeInfo) {
    schemeInfo.id = schemeInfo.name;
    schemeRecords.push( new SchemeRecord(schemeInfo) );

    Ext.each(schemeInfo.fields, function (field) {

      // Context Field configuration
      contextSelectorFields.push( new Ext.form.ComboBox({
        id: schemeInfo.name + '-' + field.name,
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
        value: queryString[field.name] || getContextFieldCookie(field.name) || '*',
        listeners: {
          beforequery: buildQuery,
          change: contextFieldChanged,
          select: function (thisField) { thisField.triggerBlur(); focusCompleter(); },
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
    id: 'metric-type-field',
    fieldLabel: 'Metric Type',
    width: CONTEXT_FIELD_WIDTH,
    mode: 'local',
    triggerAction: 'all',
    editable: false,
    store: schemesStore,
    displayField: 'name',
    listeners: {
      afterrender: function (combo) {
        var value = (queryString.metricType) ? queryString.metricType : getContextFieldCookie('metric-type');

        if (!value) {
          value = 'Everything';
        }
        var index = combo.store.find('name', value);
        if (index > -1) {
          var record = combo.store.getAt(index);
          combo.setValue(value);
          metricTypeSelected.defer(250, this, [combo, record, index]);
        }
      },
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
          graphAreaToggle(child.id, {dontRemove: true});
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
      text: 'Add All Metrics',
      handler: function (item, e) {
                 expandNode(item.parentMenu.node, false);
               }
    }, {
      text: 'Add All Metrics (recursively)',
      handler: function (item, e) {
                 expandNode(item.parentMenu.node, true);
               }
    }]
  });

  if (NAV_BAR_REGION == 'west') {
    metricSelectorMode = 'tree';
    metricSelector = new Ext.tree.TreePanel({
      root: new Ext.tree.TreeNode({}),
      containerScroll: true,
      autoScroll: true,
      flex: 3.0,
      pathSeparator: '.',
      rootVisible: false,
      singleExpand: false,
      trackMouseOver: true,
      listeners: {
      click: metricTreeSelectorNodeClicked,
      contextmenu: function (node, e) {
                     if (!node.leaf) {
                       folderContextMenu.node = node;
                       folderContextMenu.showAt( e.getXY() );
                     }
                   }
      }
    });
  } else { // NAV_BAR_REGION == 'north'
    metricSelectorMode = 'text';
    metricSelectorGrid = new Ext.grid.GridPanel({
      region: 'center',
      hideHeaders: true,
      loadMask: true,
      bodyCssClass: 'metric-result',

      colModel: new Ext.grid.ColumnModel({
        defaults: {
          sortable: false,
          menuDisabled: true
        },
        columns: [
          {header: 'Metric Path', width: 1.0, dataIndex: 'path'}
        ]
      }),
      viewConfig: {
        forceFit: true,
        rowOverCls: '',
        bodyCssClass: 'metric-result',
        getRowClass: function(record, index) {
          var toggledClass = (
             graphStore.findExact('target', 'target=' + record.data.path) == -1
            ) ? 'metric-not-toggled' : 'metric-toggled';
          var branchClass = (
            record.data['is_leaf'] == '0'
          ) ? 'result-is-branch-node' : '';
          return toggledClass + ' ' + branchClass + ' metric-result';
        }
      },
      selModel: new Ext.grid.RowSelectionModel({
        singleSelect: false
      }),
      store: new Ext.data.JsonStore({
        method: 'GET',
        url: document.body.dataset.baseUrl + 'metrics/find/',
        autoLoad: true,
        baseParams: {
          query: '',
          format: 'completer',
          automatic_variants: (UI_CONFIG.automatic_variants) ? '1' : '0'
        },
        fields: ['path', 'is_leaf'],
        root: 'metrics'
      }),
      listeners: {
        rowclick: function (thisGrid, rowIndex, e) {
                    var record = thisGrid.getStore().getAt(rowIndex);
                    if (record.data['is_leaf'] == '1') {
                      graphAreaToggle(record.data.path);
                      thisGrid.getView().refresh();
                    } else {
                      metricSelectorTextField.setValue(record.data.path);
                    }
                    autocompleteTask.delay(50);
                    focusCompleter();
                  }
      }
    });

    function completerKeyPress(thisField, e) {
      var charCode = e.getCharCode();
      if (charCode == 8 ||  //backspace
          charCode >= 46 || //delete and all printables
          charCode == 36 || //home
          charCode == 35) { //end
        autocompleteTask.delay(AUTOCOMPLETE_DELAY);
      }
    }

    metricSelectorTextField = new Ext.form.TextField({
      region: 'south',
      enableKeyEvents: true,
      cls: 'completer-input-field',
      listeners: {
        keypress: completerKeyPress,
        specialkey: completerKeyPress,
        afterrender: focusCompleter
      }
    });
    metricSelector = new Ext.Panel({
      flex: 1.5,
      layout: 'border',
      items: [metricSelectorGrid, metricSelectorTextField]
    });
  }

  var autocompleteTask = new Ext.util.DelayedTask(function () {
    var query = metricSelectorTextField.getValue();
    var store = metricSelectorGrid.getStore();
    store.setBaseParam('query', query);
    store.load();
  });

  var graphTemplate = new Ext.XTemplate(
    '<tpl for=".">',
      '<div class="graph-container">',
        '<div class="graph-overlay">',
          '<img class="graph-img{loading}" src="{url}" width="{width}" height="{height}" id="graph{index}">',
          '<div class="overlay-close-button" onclick="javascript: graphStore.removeAt(\'{index}\'); updateGraphRecords(); justClosedGraph = true;">X</div>',
        '</div>',
      '</div>',
    '</tpl>',
    '<div class="x-clear"></div>'
  );

  function setupGraphDD () {
    graphView.dragZone = new Ext.dd.DragZone(graphView.getEl(), {
      containerScroll: true,
      ddGroup: 'graphs',

      getDragData: function (e) {
        var sourceEl = e.getTarget(graphView.itemSelector, 10);
        if (sourceEl) {
          var dupe = sourceEl.cloneNode(true);
          dupe.id = Ext.id();
          return {
            ddel: dupe,
            sourceEl: sourceEl,
            repairXY: Ext.fly(sourceEl).getXY(),
            sourceStore: graphStore,
            draggedRecord: graphView.getRecord(sourceEl)
          }
        }
      },

      getRepairXY: function () {
        return this.dragData.repairXY;
      }

    });

    graphView.dropZone = new Ext.dd.DropZone(graphView.getEl(), {
      ddGroup: 'graphs',
      dropAction: 'reorder',
      mergeEl: Ext.get('merge'),

      getTargetFromEvent: function (e) {
        return e.getTarget(graphView.itemSelector);
      },

      onNodeEnter: function (target, dd, e, data) {
        //Ext.fly(target).addClass('graph-highlight');
        this.setDropAction('reorder');
        this.mergeTarget = Ext.get(target);
        this.mergeSwitchTimeout = this.setDropAction.defer(UI_CONFIG.merge_hover_delay, this, ['merge']);
      },

      onNodeOut: function (target, dd, e, data) {
        //Ext.fly(target).removeClass('graph-highlight');
        this.mergeEl.hide();
        //this.setDropAction('reorder');
      },

      onNodeOver: function (target, dd, e, data) {
        return Ext.dd.DropZone.prototype.dropAllowed;
      },

      setDropAction: function (action) {
        if (this.mergeSwitchTimeout != null) {
          clearTimeout(this.mergeSwitchTimeout);
          this.mergeSwitchTimeout = null;
        }

        this.dropAction = action;
        if (action == 'reorder') {
          //revert merge ui change
          this.mergeEl.hide();
        } else if (action == 'merge') {
          //apply merge ui change
          this.mergeEl.show();
          var targetXY = this.mergeTarget.getXY();
          var mergeElWidth = Math.max(GraphSize.width * 0.75, 20);
          var xOffset = (GraphSize.width - mergeElWidth) / 2;
          var yOffset = -14;
          this.mergeEl.setXY([targetXY[0] + xOffset, targetXY[1] + yOffset]);
          this.mergeEl.setWidth(mergeElWidth);
        }
      },

      onNodeDrop: function (target, dd, e, data){
        var nodes = graphView.getNodes();
        var dropIndex = nodes.indexOf(target);
        var dragIndex = graphStore.indexOf(data.draggedRecord);

        if (dragIndex == dropIndex) {
          return false;
        }

        if (this.dropAction == 'reorder') {
          graphStore.removeAt(dragIndex);
          graphStore.insert(dropIndex, data.draggedRecord);
          updateGraphRecords();
          return true;
        } else if (this.dropAction == 'merge') {
          var dragRecord = data.draggedRecord;
          var dropRecord = graphView.getRecord(target);
          if (dropRecord.data.params.target.length == 1) {
            if (dropRecord.data.params.target[0] == dropRecord.data.params.title) {
              delete dropRecord.data.params.title;
            }
          }

          var mergedTargets = uniq( dragRecord.data.params.target.concat(dropRecord.data.params.target) );
          dropRecord.data.params.target = mergedTargets;
          dropRecord.data.target = Ext.urlEncode({target: mergedTargets});
          dropRecord.commit();
          graphStore.remove(dragRecord);
          updateGraphRecords();
          return true;
        }
        return false;
      }
    });
  }

  graphView = new Ext.DataView({
    store: graphStore,
    tpl: graphTemplate,
    overClass: 'graph-over',
    itemSelector: 'div.graph-container',
    emptyText: 'Configure your context above, and then select some metrics.',
    autoScroll: true,
//    plugins: [
//      new Ext.ux.DataViewTransition({
//        duration: 750,
//        idProperty: 'target'
//      })
//    ],
    listeners: {
      click: graphClicked,
      render: setupGraphDD
    }
  });

  /* Toolbar items */
  var relativeTimeRange = {
          icon: CLOCK_ICON,
          text: 'Relative Time Range',
          tooltip: 'View Recent Data',
          handler: selectRelativeTime,
          scope: this
  };

  var absoluteTimeRange = {
    icon: CALENDAR_ICON,
    text: 'Absolute Time Range',
    tooltip: 'View Specific Time Range',
    handler: selectAbsoluteTime,
    scope: this
  };

  var timeRangeText = {
    id: 'time-range-text',
    xtype: 'tbtext',
    text: getTimeText()
  };

  // Note that some of these items are changed in postLoginMenuAdjust() after login/logout
  var dashboardMenu = {
    text: 'Dashboard',
    menu: {
      items: [
        {
          text: 'New',
          handler: function (item, e) {
                     setDashboardName(null);
                     if (NEW_DASHBOARD_REMOVE_GRAPHS) {
                       graphStore.removeAll();
                     }
                     refreshGraphs();
                   }
        }, {
          text: 'Finder',
          handler: showDashboardFinder
        }, {
          text: 'Template Finder',
          handler: showTemplateFinder
        }, {
          text: 'Save As Template',
          handler: saveTemplate,
          disabled: !hasPermission('change')
        }, {
          id: 'dashboard-save-button',
          text: 'Save',
          handler: function (item, e) {
                     sendSaveRequest(dashboardName);
                   },
          disabled: dashboardName == null || !hasPermission('change')
        }, {
          id: 'dashboard-save-as-button',
          text: 'Save As',
          handler: saveDashboard,
          disabled: !hasPermission('change')
        }, {
          text: 'Configure UI',
          handler: configureUI
        }, {
          text: 'Edit Dashboard',
          handler: editDashboard
        }, {
          id: 'dashboard-login-button',
          text: getLoginMenuItemText(),
          handler: function (item, e) {
                     if (isLoggedIn()) {
                       logout();
                     } else {
                       showLoginForm();
                     }
                   }
        }
      ]
    }
  };

  var graphsMenu = {
    text: 'Graphs',
    menu: {
      items: [
        { text: 'New Graph',
          menu: {
            items: [
              { text: 'Empty Graph',
                handler: newEmptyGraph
              },
              { text: 'From URL',
                handler: newFromUrl
              },
              { text: 'From Saved Graph',
                handler: newFromSavedGraph
              },
              { text: 'From Metric',
                handler: newFromMetric
              }
            ]
          }
        },
        {
          text: 'Edit Default Parameters',
          handler: editDefaultGraphParameters
        }, {
          text: 'Resize',
          handler: selectGraphSize
        }, {
          text: 'Remove All',
          handler: removeAllGraphs
        }
      ]
    }
  };

  var shareButton = {
    icon: SHARE_ICON,
    tooltip: 'Share This Dashboard',
    text: 'Share',
    handler: doShare
  };

  var helpButton = {
    icon: HELP_ICON,
    tooltip: 'Keyboard Shortcuts',
    handler: showHelp
  };

  var resizeButton = {
    icon: RESIZE_ICON,
    tooltip: 'Resize Graphs',
    handler: selectGraphSize
  };

  var removeAllButton = {
    icon: REMOVE_ICON,
    tooltip: 'Remove All Graphs',
    handler: removeAllGraphs
  };

  var refreshButton = {
    icon: REFRESH_ICON,
    tooltip: 'Refresh Graphs',
    handler: refreshGraphs
  };

  var autoRefreshButton = {
    xtype: 'button',
    id: 'auto-refresh-button',
    text: 'Auto-Refresh',
    enableToggle: true,
    pressed: false,
    tooltip: 'Toggle auto-refresh',
    toggleHandler: function (button, pressed) {
                     if (pressed) {
                       startTask(refreshTask);
                     } else {
                       stopTask(refreshTask);
                     }
                   }
  };

  var every = {
    xtype: 'tbtext',
    text: 'every'
  };

  var seconds = {
    xtype: 'tbtext',
    text: 'seconds'
  };

  var autoRefreshField = {
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
                      if (field.getValue() >= 1) {
                        updateAutoRefresh( field.getValue() );
                      }
                    }
                  }
    }
  };

  var lastRefreshed = {
    xtype: 'tbtext',
    text: 'Last Refreshed: '
  };

  var lastRefreshedText = {
    id: 'last-refreshed-text',
    xtype: 'tbtext',
    text: ( new Date() ).format('g:i:s A')
  };

  graphArea = new Ext.Panel({
    region: 'center',
    layout: 'fit',
    autoScroll: false,
    bodyCssClass: 'graph-area-body',
    items: [graphView],
    tbar: new Ext.Toolbar({
      items: [
        dashboardMenu,
        graphsMenu,
        '-',
        shareButton,
        '-',
        relativeTimeRange,
        absoluteTimeRange,
        ' ',
        timeRangeText,
        '->',
        helpButton,
        resizeButton,
        removeAllButton,
        refreshButton,
        autoRefreshButton,
        every, autoRefreshField, seconds,
        '-',
        lastRefreshed, lastRefreshedText
      ]
    })
  });

  /* Nav Bar */
  navBarNorthConfig.items = [metricSelector];
  navBarWestConfig.items = [contextSelector, metricSelector];
  var navBarConfig = (NAV_BAR_REGION == 'north') ? navBarNorthConfig : navBarWestConfig;
  navBar = new Ext.Panel(navBarConfig);

  viewport = new Ext.Viewport({
    layout: 'border',
    items: [
      navBar,
      graphArea
    ]
  });

  refreshTask = {
    run: refreshGraphs,
    interval: UI_CONFIG.refresh_interval * 1000
  };

  // Load initial dashboard state if it was passed in
  if (initialState) {
    applyState(initialState);
    navBar.collapse(false);
  }

  if(window.location.hash != '')
  {
    if (window.location.hash.indexOf('/') != -1) {
      var nameVal = window.location.hash.substr(1).split('#');
      sendLoadTemplateRequest(nameVal[0],nameVal[1]);
    } else {
      sendLoadRequest(window.location.hash.substr(1));
    }
    navBar.collapse(false);
  }

  if (initialError) {
    Ext.Msg.alert('Error', initialError);
  }
}

function showHelp() {
  var win = new Ext.Window({
    title: 'Keyboard Shortcuts',
    modal: true,
    width: 550,
    height: 300,
    autoLoad: document.body.dataset.baseUrl + 'dashboard/help/'
  });
  win.show();
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

  setContextFieldCookie('metric-type', combo.getValue());
  contextFieldChanged();
  focusCompleter();
}


function buildQuery (queryEvent) {
  var queryString = '';
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


function contextFieldChanged() {
  var pattern = getContextFieldsPattern();
  if (pattern) metricSelectorShow(pattern);
}

function getContextFieldsPattern() {
  var schemeName = selectedScheme.get('name');
  var pattern = selectedScheme.get('pattern');
  var fields = selectedScheme.get('fields');
  var missingFields = false;

  Ext.each(fields, function (field) {
    var id = schemeName + '-' + field.name;
    var value = Ext.getCmp(id).getValue();

    // Update context field cookies
    setContextFieldCookie(field.name, value);

    if (UI_CONFIG.automatic_variants) {
      if (value.indexOf(',') > -1 && value.search(/[{}]/) == -1) {
        value = '{' + value + '}';
      }
    }

    if (value.trim() == '') {
      missingFields = true;
    } else {
      pattern = pattern.replace('<' + field.name + '>', value);
    }
  });

  if (missingFields) {
    return;
  }

  return pattern;
}

function metricSelectorShow(pattern) {
  if (metricSelectorMode == 'tree') {
    metricTreeSelectorShow(pattern);
  } else {
    metricTextSelectorShow(pattern);
  }
}

function metricTreeSelectorShow(pattern) {
  var baseParts = pattern.split('.');

  function setParams (loader, node, callback) {
    loader.baseParams.format = 'treejson';

    if (node.id == 'rootMetricSelectorNode') {
      loader.baseParams.query = pattern + '.*';
    } else {
      var idParts = node.id.split('.');
      idParts.splice(0, baseParts.length); //make it relative
      var relativeId = idParts.join('.');
      loader.baseParams.query = pattern + '.' + relativeId + '.*';
    }
  }

  var loader = new Ext.tree.TreeLoader({
    url: document.body.dataset.baseUrl + 'metrics/find/',
    requestMethod: 'GET',
    listeners: {beforeload: setParams}
  });

  try {
    var oldRoot = Ext.getCmp('rootMetricSelectorNode');
    oldRoot.destroy();
  } catch (err) { }

  var root = new Ext.tree.AsyncTreeNode({
    id: 'rootMetricSelectorNode',
    loader: loader
  });

  metricSelector.setRootNode(root);
  root.expand();
}

function metricTextSelectorShow(pattern) {
  var store = metricSelectorGrid.getStore();
  store.setBaseParam('query', pattern);
  store.load();
}


function metricTreeSelectorNodeClicked (node, e) {
  if (!node.leaf) {
    if (node.expanded) {
      node.collapse();
    } else {
      node.loaded = false;
      node.expand();
    }
    return;
  }

  graphAreaToggle(node.id);
}


function graphAreaToggle(target, options) {
  /* The GraphRecord's id is their URL-encoded target=...&target=... string
     This function can get called with either the encoded string or just a raw
     metric path, eg. "foo.bar.baz".
  */
  var graphTargetString;
  if (target.substr(0,7) == 'target=') {
    graphTargetString = target;
  } else {
    graphTargetString = 'target=' + target;
  }
  var graphTargetList = Ext.urlDecode(graphTargetString)['target'];
  if (typeof graphTargetList == 'string') {
    graphTargetList = [graphTargetList];
  }

  var existingIndex = graphStore.findExact('target', graphTargetString);

  if (existingIndex > -1) {
    if ( (options === undefined) || (!options.dontRemove) ) {
      graphStore.removeAt(existingIndex);
    }
  } else if ( (options === undefined) || (!options.onlyRemove) ) {
    // Add it
    var myParams = {
      target: graphTargetList
    };
    var urlParams = {};
    Ext.apply(urlParams, defaultGraphParams);
    if (options && options.defaultParams) {
      Ext.apply(urlParams, options.defaultParams);
    }
    Ext.apply(urlParams, GraphSize);
    Ext.apply(urlParams, myParams);

    var record = new GraphRecord({
      target: graphTargetString,
      params: myParams,
      url: document.body.dataset.baseUrl + 'render?' + Ext.urlEncode(urlParams)
    });
    graphStore.add([record]);
    updateGraphRecords();
  }
}

function importGraphUrl(targetUrl, options) {
  var fullUrl = targetUrl;
  var i = fullUrl.indexOf('?');
  if (i == -1) {
    return;
  }

  var queryString = fullUrl.substr(i+1);
  var params = Ext.urlDecode(queryString);

  var graphTargetList = params['target'];
  if (typeof graphTargetList == 'string') {
    graphTargetList = [graphTargetList];
  }
  params['target'] = graphTargetList;

  if (graphTargetList.length == 0) {
    return;
  }

  var graphTargetString = Ext.urlEncode({target: graphTargetList});
  var existingIndex = graphStore.findExact('target', graphTargetString);

  if (existingIndex > -1) {
    if ( (options === undefined) || (!options.dontRemove) ) {
      graphStore.removeAt(existingIndex);
    }
  } else {
    var urlParams = {};
    Ext.apply(urlParams, defaultGraphParams);
    Ext.apply(urlParams, params);
    Ext.apply(urlParams, GraphSize);

    var record = new GraphRecord({
      target: graphTargetString,
      params: params,
      url: document.body.dataset.baseUrl + 'render?' + Ext.urlEncode(urlParams)
      });
      graphStore.add([record]);
      updateGraphRecords();
  }
}

function updateGraphRecords() {
  graphStore.each(function (item, index) {
    var params = {};
    Ext.apply(params, defaultGraphParams);
    Ext.apply(params, item.data.params);
    Ext.apply(params, GraphSize);
    params._uniq = Math.random();
    if (params.title === undefined && params.target.length == 1) {
      params.title = params.target[0];
    }
    if (!params.uniq === undefined) {
        delete params['uniq'];
    }

    //Preload the image and set it into the UI once it is available.
    item.set('loading','-loading');
    var img = new Image();
    img.onload = function() {
      item.set('url',img.src);
      item.set('loading','');
    };
    img.src = document.body.dataset.baseUrl + 'render?' + Ext.urlEncode(params);

    item.set('width', GraphSize.width);
    item.set('height', GraphSize.height);
    item.set('index', index);
  });
}

function refreshGraphs() {
  updateGraphRecords();
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
    stopTask(refreshTask);
    refreshTask.interval = value * 1000;
    startTask(refreshTask);
  } else {
    refreshTask.interval = value * 1000;
  }
}

/* Task management */
function stopTask(task) {
  if (task.running) {
    Ext.TaskMgr.stop(task);
    task.running = false;
  }
}

function startTask(task) {
  if (!task.running) {
    Ext.TaskMgr.start(task);
    task.running = true;
  }
}

/* Time Range management */
defaultGraphParams['from'].match(/([0-9]+)([^0-9]+)/);
var defaultRelativeQuantity = RegExp.$1;
var defaultRelativeUnits = RegExp.$2;
var TimeRange = {
  // Default to a relative time range
  type: 'relative',
  relativeStartQuantity: defaultRelativeQuantity,
  relativeStartUnits: defaultRelativeUnits,
  relativeUntilQuantity: '',
  relativeUntilUnits: 'now',
  // Absolute time range
  startDate: new Date(),
  startTime: '9:00 AM',
  endDate: new Date(),
  endTime: '5:00 PM'
};

function getTimeText() {
  if (TimeRange.type == 'relative') {
    var text = 'Now showing the past ' + TimeRange.relativeStartQuantity + ' ' + TimeRange.relativeStartUnits;
    if (TimeRange.relativeUntilUnits !== 'now' && TimeRange.relativeUntilUnits !== '') {
      text = text + ' until ' + TimeRange.relativeUntilQuantity + ' ' + TimeRange.relativeUntilUnits + ' ago';
    }
    return text;
  } else {
    var fmt = 'g:ia F jS Y';
    return 'Now Showing ' + TimeRange.startDate.format(fmt) + ' through ' + TimeRange.endDate.format(fmt);
  }
}

function updateTimeText() {
  graphArea.getTopToolbar().get('time-range-text').setText( getTimeText() );
}

function timeRangeUpdated() {
  if (TimeRange.type == 'relative') {
    var fromParam = '-' + TimeRange.relativeStartQuantity + TimeRange.relativeStartUnits;
    if (TimeRange.relativeUntilUnits == 'now') {
      var untilParam = 'now';
    } else {
      var untilParam = '-' + TimeRange.relativeUntilQuantity + TimeRange.relativeUntilUnits;
    }
  } else {
    var fromParam = TimeRange.startDate.format('H:i_Ymd');
    var untilParam = TimeRange.endDate.format('H:i_Ymd');
  }
  defaultGraphParams.from = fromParam;
  defaultGraphParams.until = untilParam;
  saveDefaultGraphParams();

  graphStore.each(function () {
    this.data.params.from = fromParam;
    this.data.params.until = untilParam;
  });

  updateTimeText();
  refreshGraphs();
}


function selectRelativeTime() {
  var quantityField = new Ext.form.TextField({
    fieldLabel: 'Show the past',
    width: 90,
    allowBlank: false,
    regex: /\d+/,
    regexText: 'Please enter a number',
    value: TimeRange.relativeStartQuantity
  });

  var unitField = new Ext.form.ComboBox({
    fieldLabel: '',
    width: 90,
    mode: 'local',
    editable: false,
    triggerAction: 'all',
    allowBlank: false,
    forceSelection: true,
    store: ['minutes', 'hours', 'days', 'weeks', 'months'],
    value: TimeRange.relativeStartUnits
  });

  var untilQuantityField = new Ext.form.TextField({
    id: 'until-quantity-field',
    fieldLabel: 'Until',
    width: 90,
    allowBlank: true,
    regex: /\d+/,
    regexText: 'Please enter a number',
    value: TimeRange.relativeUntilQuantity
  });

  var untilUnitField = new Ext.form.ComboBox({
    fieldLabel: '',
    width: 90,
    mode: 'local',
    editable: false,
    triggerAction: 'all',
    allowBlank: true,
    forceSelection: false,
    store: ['now', 'minutes', 'hours', 'days', 'weeks', 'months'],
    value: TimeRange.relativeUntilUnits,
    listeners: {
      select: function(combo, record, index) {
                  if (index == 0) {
                    Ext.getCmp('until-quantity-field').setValue('');
                    Ext.getCmp('until-quantity-field').setDisabled(true);
                  } else {
                    Ext.getCmp('until-quantity-field').setDisabled(false);
                  }
                },
      render: function(combo) {
                if (combo.getValue() == 'now') {
                  Ext.getCmp('until-quantity-field').setValue('');
                  Ext.getCmp('until-quantity-field').setDisabled(true);
                } else {
                  Ext.getCmp('until-quantity-field').setDisabled(false);
                }
              }
    }
  });


  var win;

  function updateTimeRange() {
    TimeRange.type = 'relative';
    TimeRange.relativeStartQuantity = quantityField.getValue();
    TimeRange.relativeStartUnits = unitField.getValue();
    TimeRange.relativeUntilQuantity = untilQuantityField.getValue();
    TimeRange.relativeUntilUnits = untilUnitField.getValue();
    win.close();
    timeRangeUpdated();
  }

  win = new Ext.Window({
    title: 'Select Relative Time Range',
    width: 205,
    height: 170,
    resizable: false,
    modal: true,
    layout: 'form',
    labelAlign: 'right',
    labelWidth: 90,
    items: [quantityField, unitField, untilQuantityField, untilUnitField],
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
    title: 'Select Absolute Time Range',
    width: 225,
    height: 180,
    resizable: false,
    modal: true,
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


// New empty Graph
function newEmptyGraph() {

  var myParams = {
    target: []
  };

  var graphTargetString = Ext.urlEncode({target: ''});

  var urlParams = {};
  Ext.apply(urlParams, defaultGraphParams);
  Ext.apply(urlParams, myParams);
  Ext.apply(urlParams, GraphSize);
  myParams['from'] = urlParams.from;
  myParams['until'] = urlParams.until;

  var record = new GraphRecord({
   target: graphTargetString,
    params: myParams,
    url: '/render?' + Ext.urlEncode(urlParams),
   'width': GraphSize.width,
   'height': GraphSize.height,
    });
  graphStore.add([record]);
  var canvasId = graphStore.indexOf(record);
  graphStore.getAt(canvasId).data.index = canvasId;
  updateGraphRecords();
}

function newFromUrl() {
  function applyUrl() {
    var inputUrl = Ext.getCmp('import-url-field').getValue();
    importGraphUrl(inputUrl);
    win.close();
  }

  var urlField = new Ext.form.TextField({
    id: 'import-url-field',
    fieldLabel: 'Graph URL',
    region: 'center',
    width: '100%',
    listeners: {
      specialkey: function (field, e) {
                    if (e.getKey() == e.ENTER) {
                      applyUrl();
                    }
                  },
      afterrender: function (field) { field.focus(false, 100); }
    }
  });

  var win = new Ext.Window({
    title: 'Import Graph From URL',
    width: 470,
    height: 87,
    layout: 'form',
    resizable: true,
    modal: true,
    items: [urlField],
    buttonAlign: 'center',
    buttons: [
      {
        text: 'OK',
        handler: applyUrl
      }, {
        text: 'Cancel',
        handler: function () { win.close(); }
      }
    ]
  });
  win.show();

}

function newFromSavedGraph() {
  function setParams(loader, node) {
    var nodeId = node.id.replace(/^[A-Za-z]+Tree\.?/,'');
    loader.baseParams.query = (nodeId == '') ? '*' : (nodeId + '.*');
    loader.baseParams.format = 'treejson';
    loader.baseParams.contexts = '1';
    loader.baseParams.path = nodeId;
    if (node.parentNode && node.parentNode.id == 'UserGraphsTree') {
      loader.baseParams.user = node.id;
    }
  }

  var userGraphsNode = new Ext.tree.AsyncTreeNode({
    id: 'UserGraphsTree',
    leaf: false,
    allowChildren: true,
    expandable: true,
    allowDrag: false,
    loader: new Ext.tree.TreeLoader({
      url: document.body.dataset.baseUrl + 'browser/usergraph/',
      requestMethod: 'GET',
      listeners: {beforeload: setParams}
    })
  });

  function handleSelects(selModel, nodes) {
    Ext.each(nodes, function (node, index) {
      if (!node.leaf) {
        node.unselect();
        node.toggle();
      }
    });

    if (selModel.getSelectedNodes().length == 0) {
      Ext.getCmp('user-graphs-select-button').setDisabled(true);
    } else {
      Ext.getCmp('user-graphs-select-button').setDisabled(false);
    }
  }

  var treePanel = new Ext.tree.TreePanel({
    id: 'user-graphs-tree',
    header: false,
    region: 'center',
    root: userGraphsNode,
    containerScroll: true,
    autoScroll: true,
    pathSeparator: '.',
    rootVisible: false,
    singleExpand: false,
    trackMouseOver: true,
    selModel: new Ext.tree.MultiSelectionModel({
      listeners: {
        selectionchange: handleSelects
      }
    })
  });

  function selectUserGraphs(selectedNodes) {
    Ext.each(selectedNodes, function (node, index) {
      importGraphUrl(node.attributes.graphUrl);
    });
  }

  var win = new Ext.Window({
    title: 'Import From User Graphs',
    width: 300,
    height: 400,
    layout: 'border',
    resizable: true,
    modal: true,
    items: [treePanel],
    buttonAlign: 'center',
    buttons: [
      {
        id: 'user-graphs-select-button',
        text: 'Select',
        disabled: true,
        handler: function () {
          selectUserGraphs(Ext.getCmp('user-graphs-tree').getSelectionModel().getSelectedNodes());
          win.close();
        }
      }, {
        text: 'Cancel',
        handler: function () { win.close(); }
      }
    ]
  });
  win.show();
}

function newFromMetric() {
  function applyMetric() {
    var inputMetric = Ext.getCmp('import-metric-field').getValue();
    if (inputMetric == '') {
      return;
    }
    var graphTargetString = Ext.urlEncode({target: inputMetric});

    var myParams = {
      target: [inputMetric]
    };

    var urlParams = {};
    Ext.apply(urlParams, defaultGraphParams);
    Ext.apply(urlParams, myParams);
    Ext.apply(urlParams, GraphSize);

    var record = new GraphRecord({
      target: graphTargetString,
      params: myParams,
      url: '/render?' + Ext.urlEncode(urlParams)
      });
    graphStore.add([record]);
    updateGraphRecords();
    win.close();
  }

  var urlField = new Ext.form.TextField({
    id: 'import-metric-field',
    fieldLabel: 'Metric',
    region: 'center',
    width: '100%',
    listeners: {
      specialkey: function (field, e) {
                    if (e.getKey() == e.ENTER) {
                      applyMetric();
                    }
                  },
      afterrender: function (field) { field.focus(false, 100); }
    }
  });

  var win = new Ext.Window({
    title: 'Import Graph From Metric',
    width: 470,
    height: 87,
    layout: 'form',
    resizable: true,
    modal: true,
    items: [urlField],
    buttonAlign: 'center',
    buttons: [
      {
        text: 'OK',
        handler: applyMetric
      }, {
        text: 'Cancel',
        handler: function () { win.close(); }
      }
    ]
  });
  win.show();
}


function editDefaultGraphParameters() {
  var editParams = Ext.apply({}, defaultGraphParams);
  removeUneditable(editParams);

  function applyParams() {
    var paramsString = Ext.getCmp('default-params-field').getValue();
    var params = Ext.urlDecode(paramsString);
    copyUneditable(defaultGraphParams, params);
    defaultGraphParams = params;
    saveDefaultGraphParams();
    refreshGraphs();
    win.close();
  }

  var paramsField = new Ext.form.TextField({
    id: 'default-params-field',
    region: 'center',
    value: Ext.urlEncode(editParams),
    listeners: {
      specialkey: function (field, e) {
                    if (e.getKey() == e.ENTER) {
                      applyParams();
                    }
                  },
      afterrender: function (field) { field.focus(false, 100); }
    }
  });

  var win = new Ext.Window({
    title: 'Default Graph Parameters',
    width: 470,
    height: 87,
    layout: 'border',
    resizable: true,
    modal: true,
    items: [paramsField],
    buttonAlign: 'center',
    buttons: [
      {
        text: 'OK',
        handler: applyParams
      }, {
        text: 'Cancel',
        handler: function () { win.close(); }
      }
    ]
  });
  win.show();
}

function selectGraphSize() {
  var presetCombo = new Ext.form.ComboBox({
    fieldLabel: 'Preset',
    width: 80,
    editable: false,
    forceSelection: true,
    triggerAction: 'all',
    mode: 'local',
    value: 'Custom',
    store: ['Custom', 'Small', 'Medium', 'Large'],
    listeners: {
      select: function (combo, record, index) {
                var w = '';
                var h = '';
                if (index == 1) { //small
                  w = 300;
                  h = 230;
                } else if (index == 2) { //medium
                  w = 400;
                  h = 300;
                } else if (index == 3) { //large
                  w = 500;
                  h = 400;
                }
                Ext.getCmp('width-field').setValue(w);
                Ext.getCmp('height-field').setValue(h);
              }
    }
  });

  var widthField = new Ext.form.TextField({
    id: 'width-field',
    fieldLabel: 'Width',
    width: 80,
    regex: /\d+/,
    regexText: 'Please enter a number',
    allowBlank: false,
    value: GraphSize.width || UI_CONFIG.default_graph_width
  });

  var heightField = new Ext.form.TextField({
    id: 'height-field',
    fieldLabel: 'Height',
    width: 80,
    regex: /\d+/,
    regexText: 'Please enter a number',
    allowBlank: false,
    value: GraphSize.height || UI_CONFIG.default_graph_height
  })

  var win;

  function resize() {
    GraphSize.width = defaultGraphParams.width = widthField.getValue();
    GraphSize.height = defaultGraphParams.height = heightField.getValue();
    saveDefaultGraphParams();
    win.close();
    refreshGraphs();
  }

  win = new Ext.Window({
    title: 'Change Graph Size',
    width: 185,
    height: 160,
    resizable: false,
    layout: 'form',
    labelAlign: 'right',
    labelWidth: 80,
    modal: true,
    items: [presetCombo, widthField, heightField],
    buttonAlign: 'center',
    buttons: [
      {text: 'Ok', handler: resize},
      {text: 'Cancel', handler: function () { win.close(); } }
    ]
  });
  win.show();
}

function doShare() {
  if (dashboardName == null) {
    Ext.Ajax.request({
      url: document.body.dataset.baseUrl + 'dashboard/create-temporary/',
      method: 'POST',
      params: {
        state: Ext.encode( getState() )
      },
      callback: function (options, success, response) {
                  var result = Ext.decode(response.responseText);
                  if (result.error) {
                    Ext.Msg.alert('Error', 'There was an error saving this dashboard: ' + result.error);
                  } else {
                    setDashboardName(result.name);
                    sendSaveRequest(result.name); // Resave the state with the proper dashboardName now
                    showShareWindow();
                  }
                }
    });
  } else {
    // Prompt the user to save their dashboard so they are aware only saved changes get shared
    Ext.Msg.show({
      title: 'Save Dashboard And Share',
      msg: 'You must save changes to your dashboard in order to share it.',
      buttons: Ext.Msg.OKCANCEL,
      fn: function (button) {
            if (button == 'ok') {
              sendSaveRequest(dashboardName);
              showShareWindow();
            }
          }
    });

  }
}

function showShareWindow() {
  var win = new Ext.Window({
    title: 'Share Dashboard',
    width: 600,
    height: 125,
    layout: 'border',
    modal: true,
    items: [
      {
        xtype: 'label',
        region: 'north',
        style: 'text-align: center;',
        text: 'You can use this URL to access the current dashboard.'
      }, {
        xtype: 'textfield',
        region: 'center',
        value: dashboardURL,
        editable: false,
        style: 'text-align: center; font-size: large;',
        listeners: {
          focus: function (field) { field.selectText(); }
        }
      }
    ],
    buttonAlign: 'center',
    buttons: [
      {text: 'Close', handler: function () { win.close(); } }
    ]
  });
  win.show();
}

/* Other stuff */
var targetGrid;
var activeMenu;

function graphClicked(graphView, graphIndex, element, evt) {
  Ext.get('merge').hide();
  var record = graphStore.getAt(graphIndex);
  if (!record) {
    return;
  }

  if (justClosedGraph) {
    justClosedGraph = false;
    return;
  }

  if ( (activeMenu != null) && (selectedRecord == record) ) {
    activeMenu.destroy();
    activeMenu = null;
    return;
  }

  selectedRecord = record; // global state hack for graph options API

  var menu;
  var menuItems = [];

  function applyChanges (field, e) {
    if (e.getKey() != e.ENTER) {
      return;
    }

    var targets = [];
    Ext.each(menuItems, function (field) {
      if ((!field.getXType) || field.getXType() != 'textfield') {
        return;
      }
      if (field.initialConfig.isTargetField) {
        targets.push( field.getValue() );
      } else {
        var newParams = Ext.urlDecode( field.getValue() );
        copyUneditable(record.data.params, newParams);
        record.data.params = newParams;
      }
    });
    record.data.target = Ext.urlEncode( {target: targets} );
    record.data.params.target = targets;

    refreshGraphs();
    menu.destroy();
  }

  function syncGraphs(thisStore, record, operation) {
    var targets = [];
    thisStore.each(function (rec) { targets.push(rec.data.target.replace(/'/g, '"')); });
    selectedRecord.data.params.target = targets;
    selectedRecord.data.target = Ext.urlEncode({target: targets});
    refreshGraphs();
  }


  /* Inline store definition hackery*/
  var functionsButton;
  var targets = record.data.params.target;
  targets = map(targets, function (t) { return {target: t}; });
  var targetStore = new Ext.data.JsonStore({
    fields: ['target'],
    data: targets,
    listeners: {
      update: syncGraphs,
      remove: syncGraphs,
      add: syncGraphs,
    }
  });

  var buttonWidth = 115;
  var rowHeight = 21;
  var maxRows = 6;
  var frameHeight = 5;
  var gridWidth = (buttonWidth * 4) + 2;
  var gridHeight = (rowHeight * Math.min(targets.length, maxRows)) + frameHeight;

  targetGrid = new Ext.grid.EditorGridPanel({
    //frame: true,
    width: gridWidth,
    height: gridHeight,
    store: targetStore,
    hideHeaders: true,
    viewConfig: {
                  markDirty: false,
                  forceFit: true,
                  autoFill: true,
                  scrollOffset: 0
                },
    colModel: new Ext.grid.ColumnModel({
      columns: [
        {
          id: 'target',
          header: 'Target',
          dataIndex: 'target',
          width: gridWidth - 90,
          editor: {xtype: 'textfield'}
        },
        {
            xtype: 'actioncolumn',
            width: 30,
            sortable: false,
            items: [{
                icon: '/static/img/move_up.png',
                tooltip: 'Move Up',
                handler: function(grid, rowIndex, colIndex) {
                    var record = targetStore.getAt(rowIndex);
                    var target = record.data.target;
                    targetStore.remove(record);
                    if(rowIndex > 0) {
                        targetStore.insert(rowIndex-1, record);
                    } else {
                        targetStore.add(record);
                    }
                }
            }]
        },
        {
            xtype: 'actioncolumn',
            width: 30,
            sortable: false,
            items: [{
                icon: '/static/img/move_down.png',
                tooltip: 'Move Down',
                handler: function(grid, rowIndex, colIndex) {
                    var record = targetStore.getAt(rowIndex);
                    var target = record.data.target;
                    targetStore.remove(record);
                    if(rowIndex < targetStore.getTotalCount()-1) {
                        targetStore.insert(rowIndex+1, record);
                    } else {
                        targetStore.insert(0, record);
                    }
                }
            }]
        },
        {
            xtype: 'actioncolumn',
            width: 30,
            sortable: false,
            items: [{
                icon: '/static/img/trash.png',
                tooltip: 'Delete Row',
                handler: function(grid, rowIndex, colIndex) {
                    var record = targetStore.getAt(rowIndex);
                    var target = record.data.target;
                    targetStore.remove(record);
                    targets.remove(target);
                }
            }]
        },
      ]
    }),
    selModel: new Ext.grid.RowSelectionModel({
      singleSelect: false,
      listeners: {
        selectionchange: function (thisSelModel) {
          functionsButton.setDisabled(thisSelModel.getCount() == 0);
        }
      }
    }),
    clicksToEdit: 2,
    listeners: {
      afterrender: function (thisGrid) {
        thisGrid.getSelectionModel().selectFirstRow.defer(50, thisGrid.getSelectionModel());
      },
      resize: function (thisGrid) {
        thisGrid.findParentByType('menu').doLayout();
      }
    }
  });
  menuItems.push(targetGrid);

  /* Setup our menus */
  var functionsMenu = new Ext.menu.Menu({
    allowOtherMenus: true,
    items: createFunctionsMenu().concat([ {text: 'Remove Outer Call', handler: removeOuterCall} ])
  });

  functionsButton = new Ext.Button({
    text: 'Apply Function',
    disabled: true,
    width: buttonWidth,
    handler: function (thisButton) {
               if (functionsMenu.isVisible()) {
                 functionsMenu.hide();
               } else {
                 operationsMenu.hide();
                 optionsMenu.doHide(); // private method... yuck
                 functionsMenu.show(thisButton.getEl());
               }
             }
  });


  var optionsMenuConfig = createOptionsMenu(); // defined in composer_widgets.js
  optionsMenuConfig.allowOtherMenus = true;
  var optionsMenu = new Ext.menu.Menu(optionsMenuConfig);
  optionsMenu.on('hide', function () { menu.hide(); });
  updateCheckItems();

  var operationsMenu = new Ext.menu.Menu({
    allowOtherMenus: true,
    items: [{
      xtype: 'button',
      fieldLabel: '<span style=\'visibility: hidden\'>',
      text: 'Breakout',
      width: 100,
      handler: function () { menu.destroy(); breakoutGraph(record); }
    }, {
      xtype: 'button',
      fieldLabel: '<span style=\'visibility: hidden\'>',
      text: 'Clone',
      width: 100,
      handler: function () { menu.destroy(); cloneGraph(record); }
    }, {
      xtype: 'button',
      fieldLabel: '<span style=\'visibility: hidden\'>',
      text: 'Email',
      width: 100,
      handler: function () { menu.destroy(); mailGraph(record); }
    }, {
      xtype: 'button',
      fieldLabel: '<span style=\'visibility: hidden\'>',
      text: 'Direct URL',
      width: 100,
      handler: function () {
        menu.destroy();
        var win = new Ext.Window({
          title: 'Graph URL',
          width: 600,
          height: 125,
          layout: 'border',
          modal: true,
          items: [
            {
              xtype: 'label',
              region: 'north',
              style: 'text-align: center;',
              text: 'Direct URL to this graph'
            }, {
              xtype: 'textfield',
              region: 'center',
              value:  record.data.url,
              editable: false,
              style: 'text-align: center; font-size: large;',
              listeners: {
                focus: function (field) { field.selectText(); }
              }
            }
          ],
          buttonAlign: 'center',
          buttons: [
            {text: 'Close', handler: function () { win.close(); } }
          ]
        });
        win.show();
      },
    }, {
      xtype: 'button',
      fieldLabel: '<span style=\'visibility: hidden\'>',
      text: 'Short Direct URL',
      width: 100,
      handler: function () {
        menu.destroy();
        var showUrl = function(options, success, response) {
            if(success) {
              var win = new Ext.Window({
                title: 'Graph URL',
                width: 600,
                height: 125,
                layout: 'border',
                modal: true,
                items: [
                  {
                    xtype: 'label',
                    region: 'north',
                    style: 'text-align: center;',
                    text: 'Short Direct URL to this graph'
                  }, {
                    xtype: 'textfield',
                    region: 'center',
                    value:  window.location.origin + response.responseText,
                    editable: false,
                    style: 'text-align: center; font-size: large;',
                    listeners: {
                      focus: function (field) { field.selectText(); }
                    }
                  }
                ],
                buttonAlign: 'center',
                buttons: [
                  {text: 'Close', handler: function () { win.close(); } }
                ]
              });
              win.show();
           }
        }
        Ext.Ajax.request({
          method: 'GET',
          url: document.body.dataset.baseUrl + 's' + record.data.url,
          callback: showUrl,
        });
      }
    }, {
        xtype: 'button',
        text: 'History',
        width: 100,
        handler: function () { menu.destroy(); historyGraph(record);}
    }]
  });

  var buttons = [functionsButton];

  buttons.push({
    xtype: 'button',
    text: 'Render Options',
    width: buttonWidth,
    handler: function (thisButton) {
               if (optionsMenu.isVisible()) {
                 optionsMenu.doHide(); // private method... yuck (no other way to hide w/out trigging hide event handler)
               } else {
                 operationsMenu.hide();
                 functionsMenu.hide();
                 optionsMenu.show(thisButton.getEl());
               }
             }
  });

  buttons.push({
    xtype: 'button',
    text: 'Graph Operations',
    width: buttonWidth,
    handler: function (thisButton) {
               if (operationsMenu.isVisible()) {
                 operationsMenu.hide();
               } else {
                 optionsMenu.doHide(); // private method... yuck
                 functionsMenu.hide();
                 operationsMenu.show(thisButton.getEl());
               }
             }
  });

  //create new row
  buttons.push({
    xtype: 'button',
    text: 'Add Target',
    width: buttonWidth,
    handler: function() {
               // Hide the other menus
               operationsMenu.hide();
               optionsMenu.doHide(); // private method... yuck
               functionsMenu.hide();

               targetStore.add([ new targetStore.recordType({target: 'Edit to save'}) ]);
               targets.push('Edit to save');
               targetGrid.setHeight((rowHeight * Math.min(targets.length, maxRows)) + frameHeight);
    }
  });


  menuItems.push({
    xtype: 'panel',
    layout: 'hbox',
    items: buttons
  });

  menu = new Ext.menu.Menu({
    layout: 'anchor',
    allowOtherMenus: true,
    items: menuItems
  });
  activeMenu = menu;
  var position = evt.getXY();
  position[0] -= (buttonWidth * 1.5) + 10; //horizontally center menu with the mouse
  menu.showAt(position);
  menu.get(0).focus(false, 50);
  menu.keyNav.disable();
  menu.on('hide', function () {
                    var graphMenuParams = Ext.getCmp('graphMenuParams');
                    if (graphMenuParams) {
                      graphMenuParams.destroy();
                    }
                  }
  );
  menu.on('destroy', function () {
                       optionsMenu.destroy();
                       operationsMenu.destroy();
                       functionsMenu.destroy();
                     }
  );
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
  /* We have to gather some context from the
     graph target's expressions so we can reapply
     functions after the expressions get expanded. */
  var pathExpressions = [];
  var exprInfo = {};

  try {
    Ext.each(record.data.params.target, function(target) {
      var exprsInThisTarget = 0;
      map(target.split(','), function (arg) {
        var arglets = arg.split('(');
        map(arglets[arglets.length-1].split(')'), function (expr) {
          expr = expr.replace(/^\s*(.+?)\s*$/, '$1');
          if (expr.length == 0 || expr[0] == '"' || expr[0] == '\'') return;

          if (expr.match(/[a-z].*\..*[a-z]/i)) {
            exprsInThisTarget++;
            if (exprsInThisTarget > 1) {
              throw 'arrr!';
            }

            pathExpressions.push(expr);
            var i = target.indexOf(expr);
            exprInfo[expr] = {
              expr: expr,
              pre: target.substr(0, i),
              post: target.substr(i + expr.length)
            }

          }

        }); //map arglets
      }); //map args
    }); //each target
  } catch (err) {
    Ext.Msg.alert('Graph contains unbreakable target', 'Graph targets containing more than one metric expression cannot be broken out.');
    return;
  }

  Ext.Ajax.request({
    url: document.body.dataset.baseUrl + 'metrics/expand/',
    params: {
      groupByExpr: '1',
      leavesOnly: '1',
      query: pathExpressions
    },
    callback: function (options, success, response) {
                var responseObj = Ext.decode(response.responseText);
                graphStore.remove(record);
                for (var expr in responseObj.results) {
                  var pre = exprInfo[expr].pre;
                  var post = exprInfo[expr].post;
                  map(responseObj.results[expr], function (metricPath) {
                    metricPath = pre + metricPath + post;
                    graphAreaToggle(metricPath, {dontRemove: true, defaultParams: record.data.params});
                  });
                }
              }
  });
}

function mailGraph(record) {
  var mygraphParams = record.get('params');
  var newparams = Ext.encode(Ext.apply(mygraphParams, defaultGraphParams));

  var fromField = new Ext.form.TextField({
    fieldLabel: 'From',
    name: 'sender',
    width: 300,
    allowBlank: false
  });

  var toField = new Ext.form.TextField({
    fieldLabel: 'To',
    name: 'recipients',
    width: 300,
    allowBlank: false
  });

  var subjectField = new Ext.form.TextField({
    fieldLabel: 'Subject',
    name: 'subject',
    width: 300,
    allowBlank: false
  });

  var msgField = new Ext.form.TextArea({
    fieldLabel: 'Message',
    name: 'message',
    width: 300,
    height: 75
  });

  var graphParamsField = new Ext.form.TextField({
     name: 'graph_params',
     hidden: true,
     value: newparams
  });

  var contactForm = new Ext.form.FormPanel({
    width: 300,
    labelWidth: 90,
    items: [fromField, toField, subjectField, msgField, graphParamsField],
    buttons: [{
      text: 'Cancel',
      handler: function(){win.close();}
    }, {
         text: 'Send',
         handler: function(){
           if(contactForm.getForm().isValid()){
             contactForm.getForm().submit({
               url: document.body.dataset.baseUrl + 'dashboard/email',
               waitMsg: 'Processing Request',
               success: function (contactForm, response) {
                 win.close();
               }
             });
           }
         }
     }]
  });

  var win;

  win = new Ext.Window({
    title: 'Send graph via email',
    width: 450,
    height: 230,
    resizable: true,
    modal: true,
    layout: 'fit',
    items: [contactForm]
  });
  win.show();
}


function cloneGraph(record) {
  var index = graphStore.indexOf(record);
  var clone = cloneGraphRecord(record);
  graphStore.insert(index+1, [clone]);
  refreshGraphs();
}

function cloneGraphRecord(record) {
  //ensure we are working with copies, not references
  var props = {
    url: record.data.url,
    target: record.data.target,
    params: Ext.apply({}, record.data.params)
  };
  props.params.target = Ext.urlDecode(props.target).target;
  if (typeof props.params.target == 'string') {
    props.params.target = [props.params.target];
  }
  return new GraphRecord(props);
}

function historyGraph(record){

    var graphHistoryStore = new Ext.data.ArrayStore({
      fields: GraphRecord,
      listeners: {
        add: graphStoreUpdated,
        remove: graphStoreUpdated,
        update: graphStoreUpdated
      }
    });

    function getProps(record){
        var props = {
          url: record.data.url,
          target: record.data.target,
          params: Ext.apply({}, record.data.params)
        };
        props.params.target = Ext.urlDecode(props.target).target;
        if (typeof props.params.target == 'string') {
          props.params.target = [props.params.target];
        }

        props.params.width = '750';
        props.params.height = '300';
        props.params.until = '-';

        return props;
    }

    var props = getProps(record);
    var title = '';
    title = (props.params.title != undefined) ? props.params.title : '';

    props = getProps(record);
    props.params.title = title + ' 1 hour';
    props.params.from = '-1hour';
    graphHistoryStore.insert(0,new GraphRecord(props));

    props = getProps(record);
    props.params.title = title + ' 1 day';
    props.params.from = '-1day';
    graphHistoryStore.insert(1,new GraphRecord(props));

    props = getProps(record);
    props.params.title = title + ' 7 day';
    props.params.from = '-7day';
    graphHistoryStore.insert(2,new GraphRecord(props));

    props = getProps(record);
    props.params.title = title + ' 30 day';
    props.params.from = '-30day';
    graphHistoryStore.insert(3,new GraphRecord(props));

    var graphTemplate = new Ext.XTemplate(
      '<tpl for=".">',
        '<div class="graph-container">',
          '<div class="graph-overlay">',
            '<img class="graph-img" src="{url}" width="{width}" height="{height}" id="graph{index}">',
          '</div>',
        '</div>',
      '</tpl>',
      '<div class="x-clear"></div>'
    );

    updateDataHistory();

    function updateDataHistory(){
        graphHistoryStore.each(function (item, index) {
          var params = {};
          Ext.apply(params, defaultGraphParams);
          Ext.apply(params, item.data.params);
          //Ext.apply(params, GraphSize);
          params._uniq = Math.random();
          if (params.title === undefined && params.target.length == 1) {
            params.title = params.target[0];
          }

          if (!params.uniq === undefined) {
              delete params['uniq'];
          }
          item.set('url', '/render?' + Ext.urlEncode(params));
          item.set('width', item.data.params.width);
          item.set('height', item.data.params.height);
          item.set('index', index);
        });
    }

    var graphHistoryView = new Ext.DataView({
      store: graphHistoryStore,
      tpl: graphTemplate,
      overClass: 'graph-over',
      itemSelector: 'div.graph-container',
      emptyText: 'Configure your context above, and then select some metrics.',
      autoScroll: true,
      listeners: {
      }
    });

    var win = new Ext.Window({
      title: 'Graph History',
      width: 800,
      height: 800,
      resizable: true,
      modal: true,
      layout: 'fit',
      items: graphHistoryView
    });
    win.show();

}
function removeAllGraphs() {
  if (CONFIRM_REMOVE_ALL) {
    /*
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
    */
    var win;
    win = new Ext.Window({
      title: 'Remove All Graphs',
      width: 200,
      height: 120,
      modal: true,
      layout: 'vbox',
      layoutConfig: { align: 'center' },
      items: [
        {
          xtype: 'label',
          text: 'Are You Sure?',
          style: 'font-size: large;'
        }, {
          id: 'always-ask-me',
          xtype: 'checkbox',
          boxLabel: 'Always Ask Me',
          name: 'ask-me',
          inputValue: 'yes',
          checked: true
        }
      ],
      buttonAlign: 'center',
      buttons: [
        {
          text: 'Yes',
          handler: function () {
                     if (Ext.getCmp('always-ask-me').getValue()) {
                       CONFIRM_REMOVE_ALL = true;
                       cookieProvider.set('confirm-remove-all', 'true');
                     } else {
                       CONFIRM_REMOVE_ALL = false;
                       cookieProvider.set('confirm-remove-all', 'false');
                     }
                     graphStore.removeAll();
                     refreshGraphs();
                     win.close();
                   }
        }, {
          text: 'No',
          handler: function () { win.close(); }
        }
      ]
    });
    win.show();
  } else {
    graphStore.removeAll();
    refreshGraphs();
  }
}


function toggleToolbar() {
  var tbar = graphArea.getTopToolbar();
  tbar.setVisible( ! tbar.isVisible() );
  graphArea.doLayout();
}

function toggleNavBar() {
  navBar.toggleCollapse(true);
}

function focusCompleter() {
  if (metricSelectorTextField) metricSelectorTextField.focus(false, 50);
}

/* Keyboard shortcuts */
var keyEventHandlers = {
  toggle_toolbar: toggleToolbar,
  toggle_metrics_panel: toggleNavBar,
  give_completer_focus: focusCompleter,
  erase_all_graphs: function () {
      graphStore.removeAll();
      refreshGraphs();
      graphStoreUpdated();
    },
  completer_add_metrics: function () {
      if (metricSelectorGrid) {
        metricSelectorGrid.getStore().each(function (record) {
          if (record.data.path[ record.data.path.length - 1] != '.') {
            graphAreaToggle(record.data.path, {dontRemove: true});
          }
        });
        focusCompleter();
      }
    },
  completer_del_metrics: function () {
      if (metricSelectorGrid) {
        metricSelectorGrid.getStore().each(function (record) {
          graphAreaToggle(record.data.path, {onlyRemove: true});
        });
        focusCompleter();
      }
    },
  save_dashboard: function () {
      if (dashboardName == null) {
        saveDashboard();
      } else {
        sendSaveRequest(dashboardName);
      }
    }
};

var specialKeys = {
  space: 32,
  enter: Ext.EventObject.ENTER,
  backspace: Ext.EventObject.BACKSPACE
};

var keyMapConfigs = [];

for (var event_name in UI_CONFIG.keyboard_shortcuts) {
  var config = {handler: keyEventHandlers[event_name]};
  if (!config.handler) {
    continue;
  }
  var keyString = UI_CONFIG.keyboard_shortcuts[event_name];
  var keys = keyString.split('-');
  config.ctrl = keys.indexOf('ctrl') > -1;
  config.alt = keys.indexOf('alt') > -1;
  config.shift = keys.indexOf('shift') > -1;
  config.key = keys[keys.length - 1];
  if (specialKeys[config.key]) {
    config.key = specialKeys[config.key];
  }
  keyMapConfigs.push(config);
}

var keyMap = new Ext.KeyMap(document, keyMapConfigs);


/* Dashboard functions */
function editDashboard() {
  var editDashboardWin = new Ext.Window({
    title: 'Edit Dashboard',
    id: 'editor-window',
    width: 700,
    height: 500,
    layout: 'vbox',
    layoutConfig: {align: 'stretch', pack: 'start'},
    modal: true,
    items: [
      {
        xtype: 'container',
        flex: 1,
        id: 'editor',
        title: 'ace',
        listeners: { resize: function () { if (editor) editor.resize(); } }
      }
    ],
    listeners: {
      afterrender: {
        scope: this,
        fn: function (obj) { setupEditor(obj.body.dom); getInitialState() }
      }
    },
    buttons: [
      {text: 'Update (doesn\'t save)', handler: updateAfterEdit},
      {text: 'Cancel', handler: function () { editDashboardWin.close(); } }
    ]
  });
  function updateAfterEdit(btn, target) {
    var graphString = editor.getSession().getValue();
    var targets = JSON.parse(graphString);
    graphStore.removeAll();
    var graphs = [];
    for (var i = 0; i < targets.length; i++) {
      var myParams = {};
      Ext.apply(myParams, targets[i]);
      var urlParams = {};
      Ext.apply(urlParams, defaultGraphParams);
      Ext.apply(urlParams, GraphSize);
      Ext.apply(urlParams, myParams);
      graphs.push([
        Ext.urlEncode({target: targets[i].target}),
        myParams,
        document.body.dataset.baseUrl + 'render?' + Ext.urlEncode(urlParams)
      ]);
    }
    graphStore.loadData(graphs);
    refreshGraphs();
    editDashboardWin.close();
  }
  function getInitialState() {
    var graphs = [];
    graphStore.each(function () {
      var params = {};
      Ext.apply(params, this.data.params);
      delete params['from'];
      delete params['until'];
      graphs.push(params);
    });
    editor.getSession().setValue(JSON.stringify(graphs, null, 2));
  }
  function setupEditor(obj) {
    editor = ace.edit('editor');
    editor.setTheme('ace/theme/textmate');
    var JSONMode = require('ace/mode/json').Mode;
    var session = editor.getSession();
    session.setMode(new JSONMode());
    session.setUseSoftTabs(true);
    session.setTabSize(2);
  }
  editDashboardWin.show();
}

function saveDashboard() {
  Ext.Msg.prompt(
    'Save Dashboard',
    'Enter the name to save this dashboard as',
    function (button, text) {
      if (button == 'ok') {
        setDashboardName(text);
        sendSaveRequest(text);
      }
    },
    this,
    false,
    (dashboardName) ? dashboardName : ''
  );
}

function saveTemplate() {
  var nameField = new Ext.form.TextField({
    id: 'dashboard-save-template-name',
    fieldLabel: 'Template Name',
    width: 240,
    allowBlank: false,
    align: 'center',
    value: dashboardName ? dashboardName.split('/')[0]: '',
  });

  var keyField = new Ext.form.TextField({
    id: 'dashboard-save-template-key',
    fieldLabel: 'String to replace',
    width: 240,
    allowBlank: false,
    align: 'center',
  });

  var win;

  function save() {
    sendSaveTemplateRequest(nameField.getValue(), keyField.getValue());
    win.close();
  }

  win = new Ext.Window({
    title: 'Save dashboard as a template',
    width: 400,
    height: 120,
    resizable: false,
    layout: 'form',
    labelAlign: 'right',
    labelWidth: 120,
    items: [nameField,keyField],
    buttonAlign: 'center',
    buttons: [
      {text: 'Ok', handler: save},
      {text: 'Cancel', handler: function () { win.close(); } }
    ]
  });
  win.show();
}

function sendSaveTemplateRequest(name, key) {
  Ext.Ajax.request({
    url: document.body.dataset.baseUrl + 'dashboard/save_template/' + name + '/' + key,
    method: 'POST',
    params: {
      state: Ext.encode( getState() )
    },
    success: function (response) {
               var result = Ext.decode(response.responseText);
               if (result.error) {
                 Ext.Msg.alert('Error', 'There was an error saving this dashboard as a template: ' + result.error);
               }
             },
    failure: failedAjaxCall
  });
}

function sendSaveRequest(name) {
  Ext.Ajax.request({
    url: document.body.dataset.baseUrl + 'dashboard/save/' + name,
    method: 'POST',
    params: {
      state: Ext.encode( getState() )
    },
    success: function (response) {
               var result = Ext.decode(response.responseText);
               if (result.error) {
                 Ext.Msg.alert('Error', 'There was an error saving this dashboard: ' + result.error);
               }
               if(newURL) {
                 window.location = newURL;
               } else {
                 changeHash(name);
               }
             },
    failure: failedAjaxCall
  });
}

function sendLoadRequest(name) {
  Ext.Ajax.request({
    url: document.body.dataset.baseUrl + 'dashboard/load/' + name,
    success: function (response) {
               var result = Ext.decode(response.responseText);
               if (result.error) {
                 Ext.Msg.alert('Error Loading Dashboard', result.error);
               } else {
                 applyState(result.state);
                 navBar.collapse(false);
               }
             },
    failure: failedAjaxCall
  });
}

function sendLoadTemplateRequest(name, value) {
  var urlparts = window.location.href.split('#')
  if(urlparts[0].split('?')[1]) {
    var newLocation = urlparts[0].split('?')[0] + '#'+name+'/'+value;
    window.location.href = newLocation;
  } else {
    Ext.Ajax.request({
      url: document.body.dataset.baseUrl + 'dashboard/load_template/' + name + '/' + value,
      success: function (response) {
               var result = Ext.decode(response.responseText);
               if (result.error) {
                 Ext.Msg.alert('Error Loading Template', result.error);
               } else {
                 applyState(result.state);
                 navBar.collapse(false);
               }
             },
      failure: failedAjaxCall
    });
  }
}

function getState() {
  var graphs = [];
  graphStore.each(
    function (record) {
      graphs.push([
        record.data.id,
        record.data.target,
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
    defaultGraphParams: defaultGraphParams,
    graphs: graphs
  };
}

function applyState(state) {
  setDashboardName(state.name);

  //state.timeConfig = {type, quantity, units, untilQuantity, untilUnits, startDate, startTime, endDate, endTime}
  var timeConfig = state.timeConfig
  TimeRange.type = timeConfig.type;
  TimeRange.relativeStartQuantity = timeConfig.relativeStartQuantity;
  TimeRange.relativeStartUnits = timeConfig.relativeStartUnits;
  TimeRange.relativeUntilQuantity = timeConfig.relativeUntilQuantity;
  TimeRange.relativeUntilUnits = timeConfig.relativeUntilUnits;
  TimeRange.startDate = new Date(timeConfig.startDate);
  TimeRange.startTime = timeConfig.startTime;
  TimeRange.endDate = new Date(timeConfig.endDate);
  TimeRange.endTime = timeConfig.endTime;

  if (queryString.from && queryString.until) {
    // The URL contains a "from" and "until" parameters (format "YYYY-MM-DDThh:mm:ss") => use the timestamps as default absolute range of the dashboard
    var from = new Date(queryString.from);
    var until = new Date(queryString.until);

    TimeRange.startDate = from;
    TimeRange.startTime = from.format('H:m');
    TimeRange.endDate = until;
    TimeRange.endTime = until.format('H:m');
    TimeRange.type = 'absolute';

    state.timeConfig = TimeRange;

    state.defaultGraphParams.from = from.format('H:i_Ymd');
    state.defaultGraphParams.until = until.format('H:i_Ymd');
  }

  updateTimeText();



  //state.refreshConfig = {enabled, interval}
  var refreshConfig = state.refreshConfig;
  if (refreshConfig.enabled) {
    stopTask(refreshTask);
    startTask(refreshTask);
    Ext.getCmp('auto-refresh-button').toggle(true);
  } else {
    stopTask(refreshTask);
    Ext.getCmp('auto-refresh-button').toggle(false);
  }
  //refreshTask.interval = refreshConfig.interval;
  updateAutoRefresh(refreshConfig.interval / 1000);

  //state.graphSize = {width, height}
  var graphSize = state.graphSize;
  GraphSize.width = graphSize.width;
  GraphSize.height = graphSize.height;

  //state.defaultGraphParams = {...}
  defaultGraphParams = state.defaultGraphParams || originalDefaultGraphParams;

  //state.graphs = [ [id, target, params, url], ... ]
  //Fix url param to be correct for this document.body.dataset.baseUrl
  var graphs = [];
  for (var i = 0; i < state.graphs.length; i++) {
    var myParams = {};
    var renderType = state.graphs[i][3];
    Ext.apply(myParams, state.graphs[i][1]);
    var urlParams = {};
    Ext.apply(urlParams, defaultGraphParams);
    Ext.apply(urlParams, GraphSize);
    Ext.apply(urlParams, myParams);
    graphs.push([
      state.graphs[i][0],
      myParams,
      document.body.dataset.baseUrl + 'render?' + Ext.urlEncode(urlParams),
      renderType
    ]);
  }
  graphStore.loadData(graphs);

  refreshGraphs();
}

function deleteDashboard(name) {
  Ext.Ajax.request({
    url: document.body.dataset.baseUrl + 'dashboard/delete/' + name,
    success: function (response) {
      var result = Ext.decode(response.responseText);
      if (result.error) {
        Ext.Msg.alert('Error', 'Failed to delete dashboard \'' + name + '\': ' + result.error);
      } else {
        Ext.Msg.alert('Dashboard Deleted', 'The ' + name + ' dashboard was deleted successfully.');
      }
    },
    failure: failedAjaxCall
  });
}

function deleteTemplate(name) {
  Ext.Ajax.request({
    url: document.body.dataset.baseUrl + 'dashboard/delete_template/' + name,
    success: function (response) {
      var result = Ext.decode(response.responseText);
      if (result.error) {
        Ext.Msg.alert('Error', 'Failed to delete template \'' + name + '\': ' + result.error);
      } else {
        Ext.Msg.alert('Template Deleted', 'The ' + name + ' template was deleted successfully.');
      }
    },
    failure: failedAjaxCall
  });
}

function setDashboardName(name) {
  dashboardName = name;
  var saveButton = Ext.getCmp('dashboard-save-button');

  if (name == null || !hasPermission('change')) {
    dashboardURL = null;
    document.title = 'untitled - Graphite Dashboard';
    navBar.setTitle('untitled');
    saveButton.setText('Save');
    saveButton.disable();
  } else {
    var urlparts = location.href.split('#')[0].split('/');
    var i = urlparts.indexOf('dashboard');
    if (i == -1) {
      Ext.Msg.alert('Error', 'urlparts = ' + Ext.encode(urlparts) + ' and indexOf(dashboard) = ' + i);
      return;
    }
    urlparts = urlparts.slice(0, i+1);
    urlparts.push( encodeURI(name) )
    dashboardURL = urlparts.join('/');

    document.title = name + ' - Graphite Dashboard';
    changeHash(name);
    navBar.setTitle(name + ' - (' + dashboardURL + ')');
    saveButton.setText('Save "' + name + '"');
    saveButton.enable();
  }
}

function failedAjaxCall(response, options) {
  Ext.Msg.alert(
    'Ajax Error',
    'Ajax call failed, response was :' + response.responseText
  );
}

var configureUIWin;
function configureUI() {

  if (configureUIWin) {
    configureUIWin.close();
  }

  function updateOrientation() {
    if (Ext.getCmp('navbar-left-radio').getValue()) {
      updateNavBar('west');
    } else {
      updateNavBar('north');
    }
    configureUIWin.close();
    configureUIWin = null;
  }

  configureUIWin = new Ext.Window({
    title: 'Configure UI',
    layout: 'form',
    width: 300,
    height: 125,
    labelWidth: 120,
    labelAlign: 'right',
    items: [
      {
        id: 'navbar-left-radio',
        xtype: 'radio',
        fieldLabel: 'Navigation Mode',
        boxLabel: 'Tree (left nav)',
        name: 'navbar-position',
        inputValue: 'left',
        checked: (NAV_BAR_REGION == 'west')
      }, {
        id: 'navbar-top-radio',
        xtype: 'radio',
        fieldLabel: '',
        boxLabel: 'Completer (top nav)',
        name: 'navbar-position',
        inputValue: 'top',
        checked: (NAV_BAR_REGION == 'north')
      }
    ],
    buttons: [
      {text: 'Ok', handler: updateOrientation},
      {text: 'Cancel', handler: function () { configureUIWin.close(); configureUIWin = null; } }
    ]
  });
  configureUIWin.show();
}

function updateNavBar(region) {
  if (region == NAV_BAR_REGION) {
    return;
  }

  cookieProvider.set('navbar-region', region);
  NAV_BAR_REGION = region;

  if (graphStore.getCount() == 0) {
    window.location.reload()
  } else {
    Ext.Msg.alert('Cookie Updated', 'You must refresh the page to update the nav bar\'s location.');
    //TODO prompt the user to save their dashboard and refresh for them
  }
}

// Dashboard Finder
function showDashboardFinder() {
  var win;
  var dashboardsList;
  var queryField;
  var dashboardsStore = new Ext.data.JsonStore({
    url: document.body.dataset.baseUrl + 'dashboard/find/',
    method: 'GET',
    params: {query: 'e'},
    fields: [{
      name: 'name',
      sortType: function(value) {
	// Make sorting case-insensitive
        return value.toLowerCase();
      }
    }],
    root: 'dashboards',
    sortInfo: {
      field: 'name',
      direction: 'ASC'
    },
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

  function deleteSelected() {
    var selected = dashboardsList.getSelectedRecords();
    if (selected.length > 0) {
      var record = selected[0];
      var name = record.data.name;

      Ext.Msg.confirm(
       'Delete Dashboard',
        'Are you sure you want to delete the ' + name + ' dashboard?',
        function (button) {
          if (button == 'yes') {
            deleteDashboard(name);
            dashboardsStore.remove(record);
            dashboardsList.refresh();
          }
        }
      );
    }
  }

  dashboardsList = new Ext.list.ListView({
    columns: [
      {header: 'Dashboard', width: 1.0, dataIndex: 'name', sortable: false}
    ],
    columnSort: false,
    emptyText: 'No dashboards found',
    hideHeaders: true,
    listeners: {
      selectionchange: function (listView, selections) {
                         if (listView.getSelectedRecords().length == 0) {
                           Ext.getCmp('finder-open-button').disable();
                           Ext.getCmp('finder-delete-button').disable();
                         } else {
                           Ext.getCmp('finder-open-button').enable();
                           if (hasPermission('delete')) {
                             Ext.getCmp('finder-delete-button').enable();
                           } else {
                             Ext.getCmp('finder-delete-button').disable();
                           }
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
    style: 'background-color: white;'
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
    emptyText: 'filter dashboard listing',
    enableKeyEvents: true,
    listeners: {
      keyup: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    sendLoadRequest(field.getValue());
                    win.close();
                  } else {
                    queryUpdateTask.delay(FINDER_QUERY_DELAY);
                  }
                }
    }
  });

  win = new Ext.Window({
    title: 'Dashboard Finder',
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
        text: 'Open',
        disabled: true,
        handler: openSelected
      }, {
        id: 'finder-delete-button',
        text: 'Delete',
        disabled: true,
        handler: deleteSelected
      }, {
        text: 'Close',
        handler: function () { win.close(); }
      }
    ]
  });
  dashboardsStore.load();
  win.show();
}

// Template Finder
function showTemplateFinder() {
  var win;
  var templatesList;
  var queryField;
  var valueField;
  var templatesStore = new Ext.data.JsonStore({
    url: document.body.dataset.baseUrl + 'dashboard/find_template/',
    method: 'GET',
    params: {query: 'e'},
    fields: ['name'],
    root: 'templates',
    listeners: {
      beforeload: function (store) {
                    store.setBaseParam('query', queryField.getValue());
                  }
    }
  });

  function openSelected() {
    var selected = templatesList.getSelectedRecords();
    if (selected.length > 0) {
      sendLoadTemplateRequest(selected[0].data.name, valueField.getValue());
    }
    win.close();
  }

  function deleteSelected() {
    var selected = templatesList.getSelectedRecords();
    if (selected.length > 0) {
      var record = selected[0];
      var name = record.data.name;

      Ext.Msg.confirm(
       'Delete Template',
        'Are you sure you want to delete the ' + name + ' template?',
        function (button) {
          if (button == 'yes') {
            deleteTemplate(name);
            templatesStore.remove(record);
            templatesList.refresh();
          }
        }
      );
    }
  }

  templatesList = new Ext.list.ListView({
    columns: [
      {header: 'Template', width: 1.0, dataIndex: 'name', sortable: false}
    ],
    columnSort: false,
    emptyText: 'No templates found',
    hideHeaders: true,
    listeners: {
      selectionchange: function (listView, selections) {
                         if (listView.getSelectedRecords().length == 0) {
                           Ext.getCmp('finder-open-button').disable();
                           Ext.getCmp('finder-delete-button').disable();
                         } else {
                           if (valueField.getValue()) {
                             Ext.getCmp('finder-open-button').enable();
                           }
                           Ext.getCmp('finder-delete-button').enable();
                         }
                       },

    },
    overClass: '',
    region: 'center',
    reserveScrollOffset: true,
    singleSelect: true,
    store: templatesStore,
    style: 'background-color: white;'
  });

  var lastQuery = null;
  var queryUpdateTask = new Ext.util.DelayedTask(
    function () {
      var currentQuery = queryField.getValue();
      if (lastQuery != currentQuery) {
        templatesStore.load();
      }
      lastQuery = currentQuery;
    }
  );

  queryField = new Ext.form.TextField({
    region: 'south',
    emptyText: 'filter template listing',
    enableKeyEvents: true,
    listeners: {
      keyup: function (field, e) {
                  if (e.getKey() == e.ENTER) {
                    sendLoadRequest(field.getValue(), reset_params=true);
                    win.close();
                  } else {
                    queryUpdateTask.delay(FINDER_QUERY_DELAY);
                  }
                }
    }
  });

  valueField = new Ext.form.TextField({
    region: 'north',
    emptyText: 'Value to use'
  });

  win = new Ext.Window({
    title: 'Template Finder',
    width: 400,
    height: 500,
    layout: 'border',
    modal: true,
    items: [
      valueField,
      templatesList,
      queryField,
    ],
    buttons: [
      {
        id: 'finder-open-button',
        text: 'Open',
        disabled: true,
        handler: openSelected
      }, {
        id: 'finder-delete-button',
        text: 'Delete',
        disabled: true,
        handler: deleteSelected
      }, {
        text: 'Close',
        handler: function () { win.close(); }
      }
    ]
  });
  templatesStore.load();
  win.show();
}

/* Graph Options API (to reuse createOptionsMenu from composer_widgets.js) */
function updateGraph() {
  refreshGraphs();
  var graphMenuParams = Ext.getCmp('graphMenuParams');
  if (graphMenuParams) {
    var editParams = Ext.apply({}, selectedRecord.data.params);
    removeUneditable(editParams);
    graphMenuParams.setValue( Ext.urlEncode(editParams) );
  }
}

function getParam(param) {
  return selectedRecord.data.params[param];
}

function setParam(param, value) {
  selectedRecord.data.params[param] = value;
  selectedRecord.commit();
}

function removeParam(param) {
  delete selectedRecord.data.params[param];
  selectedRecord.commit();
}


function removeTargetFromSelectedGraph(target) {
  selectedRecord.data.params.target.remove(target);
  selectedRecord.data.target = Ext.urlEncode({target: selectedRecord.data.params.target});
}

function getSelectedTargets() {
  if (targetGrid) {
    return map(targetGrid.getSelectionModel().getSelections(), function (r) {
      return r.data.target;
    });
  }
  return [];
}

function applyFuncToEach(funcName, extraArg) {

  function applyFunc() {
    Ext.each(targetGrid.getSelectionModel().getSelections(),
      function (record) {
        var target = record.data.target;
        var newTarget;
        var targetStore = targetGrid.getStore();

        targetStore.remove(record);
        removeTargetFromSelectedGraph(target);

        if (extraArg) {
          newTarget = funcName + '(' + target + ',' + extraArg + ')';
        } else {
          newTarget = funcName + '(' + target + ')';
        }

        // Add newTarget to selectedRecord
        targetStore.add([ new targetStore.recordType({target: newTarget}, newTarget) ]);
        targetGrid.getSelectionModel().selectRow(targetStore.findExact('target', newTarget), true);
      }
    );
    refreshGraphs();
  }
  return applyFunc;
}

function applyFuncToEachWithInput (funcName, question, options) {
  if (options == null) {
    options = {};
  }

 function applyFunc() {
    Ext.MessageBox.prompt(
      'Input Required', //title
      question, //message
      function (button, inputValue) { //handler
        if (button == 'ok' && (options.allowBlank || inputValue != '')) {
          if (options.quote) {
            inputValue = '"' + inputValue + '"';
          }
          applyFuncToEach(funcName, inputValue)();
        }
      },
      this, //scope
      false, //multiline
      '' //initial value
    );
  }
  applyFunc = applyFunc.createDelegate(this);
  return applyFunc;
}

function applyFuncToAll (funcName) {
  function applyFunc() {
    var args = getSelectedTargets().join(',');
    var newTarget = funcName + '(' + args + ')';
    var targetStore = targetGrid.getStore();

    Ext.each(targetGrid.getSelectionModel().getSelections(),
      function (record) {
        targetStore.remove(record);
        removeTargetFromSelectedGraph(record.data.target);
      }
    );
    targetStore.add([ new targetStore.recordType({target: newTarget}, newTarget) ]);
    targetGrid.getSelectionModel().selectRow(targetStore.findExact('target', newTarget), true);
    refreshGraphs();
  }
  applyFunc = applyFunc.createDelegate(this);
  return applyFunc;
}

function removeOuterCall() { // blatantly repurposed from composer_widgets.js (don't hate)
  Ext.each(targetGrid.getSelectionModel().getSelections(), function (record) {
    var target = record.data.target;
    var targetStore = targetGrid.getStore();
    var args = [];
    var i, c;
    var lastArg = 0;
    var depth = 0;
    var argString = target.replace(/^[^(]+\((.+)\)/, '$1'); //First we strip it down to just args

    for (i = 0; i < argString.length; i++) {
      switch (argString.charAt(i)) {
        case '(': depth += 1; break;
        case '{': depth += 1; break;
        case ')': depth -= 1; break;
        case '}': depth -= 1; break;
        case ',':
          if (depth > 0) { continue; }
          if (depth < 0) { Ext.Msg.alert('Malformed target, cannot remove outer call.'); return; }
          args.push( argString.substring(lastArg, i).replace(/^\s+/, '').replace(/\s+$/, '') );
          lastArg = i + 1;
          break;
      }
    }
    args.push( argString.substring(lastArg, i) );

    targetStore.remove(record);
    selectedRecord.data.params.target.remove(target);

    Ext.each(args, function (arg) {
      if (!arg.match(/^([0123456789\.]+|".+")$/)) { //Skip string and number literals
        targetStore.add([ new targetStore.recordType({target: arg}) ]);
        targetGrid.getSelectionModel().selectRow(targetStore.findExact('target', arg), true);
      }
    });
  });
  refreshGraphs();
}

function saveDefaultGraphParams() {
  cookieProvider.set('defaultGraphParams', Ext.encode(defaultGraphParams));
}


/* Cookie stuff */
function getContextFieldCookie(field) {
  return cookieProvider.get(field);
}

function setContextFieldCookie(field, value) {
  cookieProvider.set(field, value);
}

/* Misc */
function uniq(myArray) {
  var uniqArray = [];
  for (var i=0; i<myArray.length; i++) {
    if (uniqArray.indexOf(myArray[i]) == -1) {
      uniqArray.push(myArray[i]);
    }
  }
  return uniqArray;
}

function map(myArray, myFunc) {
  var results = [];
  for (var i=0; i<myArray.length; i++) {
    results.push( myFunc(myArray[i]) );
  }
  return results;
}

function getLoginMenuItemText() {
  if (isLoggedIn()) {
    return 'Log Out From "' + userName + '"';
  } else {
    return 'Log In';
  }
}

/* After login/logout, make any necessary adjustments to Dashboard menu items (text and/or disabled) */
function postLoginMenuAdjust() {
  Ext.getCmp('dashboard-login-button').setText(getLoginMenuItemText());
  Ext.getCmp('dashboard-save-button').setDisabled(dashboardName == null || !hasPermission('change'));
  Ext.getCmp('dashboard-save-as-button').setDisabled(!hasPermission('change'));
}

function showLoginForm() {
  var login = new Ext.FormPanel({
    labelWidth: 80,
    frame: true,
    title: 'Please Login',
    defaultType: 'textfield',
    monitorValid: true,

    items: [{
        fieldLabel: 'Username',
        name: 'username',
        allowBlank: false,
        listeners: {
          afterrender: function(field) { field.focus(false, 100); }
        }
      },{
        fieldLabel: 'Password',
        name: 'password',
        inputType: 'password',
        allowBlank: false
      }
    ],
    buttons: [
      {text: 'Login', formBind: true, handler: doLogin},
      {text: 'Cancel', handler: function () { win.close(); } }
    ]
  });

  function doLogin() {
    login.getForm().submit({
      method: 'POST',
      url: document.body.dataset.baseUrl + 'dashboard/login',
      waitMsg: 'Authenticating...',
      success: function(form, action) {
        userName = form.findField('username').getValue();
        permissions = action.result.permissions;
        postLoginMenuAdjust();
        win.close();
      },
      failure: function(form, action) {
        if (action.failureType == 'server') {
          var obj = Ext.util.JSON.decode(action.response.responseText);
          Ext.Msg.alert('Login Failed!', obj.errors.reason);
        } else {
          Ext.Msg.alert('Warning!', 'Authentication server is unreachable : ' + action.response.responseText);
        }
        login.getForm().reset();
      }
    });
  }

  var win = new Ext.Window({
    layout: 'fit',
    width: 300,
    height: 150,
    closable: false,
    resizable: false,
    plain: true,
    border: false,
    items: [login]
  });
  win.show();
}

function logout() {
  Ext.Ajax.request({
    url: document.body.dataset.baseUrl + 'dashboard/logout',
    method: 'POST',
    success: function() {
      userName = null;
      permissions = permissionsUnauthenticated;
      postLoginMenuAdjust();
    },
    failure: function() {
      // Probably because they no longer have a valid session - assume they're now logged out
      userName = null;
      permissions = permissionsUnauthenticated;
      postLoginMenuAdjust();
    }
  });
}


