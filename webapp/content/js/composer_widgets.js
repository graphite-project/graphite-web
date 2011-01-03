/* Copyright 2008 Orbitz WorldWide
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License. */

var DEFAULT_WINDOW_WIDTH = 600;
var DEFAULT_WINDOW_HEIGHT = 400;
var Composer;

function createComposerWindow(myComposer) {
  //This global is an ugly hack, probly need to make these widgets into more formal objects
  //and keep their associated Composer object as an attribute.
  Composer = myComposer;

  //Can't define this inline because I need a reference in a closure below
  var timeDisplay = new Ext.Toolbar.TextItem({text: "Now showing the past 24 hours"});

  var topToolbar = [
    createToolbarButton('Update Graph', 'updateGraph.gif', updateGraph),
    '-',
    createToolbarButton('Select a Date Range', 'calBt.gif', toggleWindow(createCalendarWindow) ),
    createToolbarButton('Select Recent Data', 'arrow1.gif', toggleWindow(createRecentWindow) ),
    '-',
    timeDisplay
  ];
  if (GraphiteConfig.showMyGraphs) {
    var saveButton = createToolbarButton('Save to My Graphs', 'save.gif', saveMyGraph);
    var deleteButton = createToolbarButton('Delete from My Graphs', 'delete.gif', deleteMyGraph);
    topToolbar.splice(0, 0, saveButton, deleteButton);
  }

  var bottomToolbar = [
    { text: "Graph Options", menu: createOptionsMenu() },
    { text: "Graph Data", handler: toggleWindow(GraphDataWindow.create.createDelegate(GraphDataWindow)) },
    { text: "Auto-Refresh", id: 'autorefresh_button', enableToggle: true, toggleHandler: toggleAutoRefresh }
  ];

  var win = new Ext.Window({
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    title: "Graphite Composer",
    layout: "border",
    region: "center",
    maximizable: true,
    closable: false,
    tbar: topToolbar,
    buttons: bottomToolbar,
    buttonAlign: 'left',
    items: { html: "<img id='image-viewer' src='/render'/>", region: "center" },
    listeners: {
      activate: keepDataWindowOnTop,
      show: fitImageToWindow,
      resize: fitImageToWindow
    }
  });

  // Tack on some convenience closures
  win.updateTimeDisplay = function (time) {
    var text;
    if (time.mode == 'date-range') {
      text = "<b>From</b> " + time.startDate.toLocaleString();
      text += " <b>Until</b> " + time.endDate.toLocaleString();
      text = text.replace(/:00 /g, " "); // Strip out the seconds
    } else if (time.mode == 'recent') {
      text = "Now showing the past " + time.quantity + " " + time.units;
    }
    timeDisplay.getEl().dom.innerHTML = text;
  };

  win.updateUI = function () {
    var toggled = Composer.url.getParam('autorefresh') ? true : false;
    Ext.getCmp('autorefresh_button').toggle(toggled);
    updateCheckItems();
  };

  win.getImage = function () {
    return Ext.getDom('image-viewer');
  };

  return win;
}

function toggleWindow(createFunc) { // Convenience for lazily creating toggled dialogs
  function toggler (button, e) {
    if (!button.window) { //First click, create the window
      button.window = createFunc();
    }
    if (button.window.isVisible()) {
      button.window.hide();
    } else {
      button.window.show();
    }
  }
  return toggler;
}

function ifEnter(func) { // Convenience decorator for specialkey listener definitions
  return function (widget, e) {
    if (e.getCharCode() == Ext.EventObject.RETURN) {
      func(widget);
    }
  }
}

function keepDataWindowOnTop () {
  if (GraphDataWindow.window && GraphDataWindow.window.isVisible()) {
    GraphDataWindow.window.toFront();
  }
}

function fitImageToWindow(win) {
  Composer.url.setParam('width', win.getInnerWidth());
  Composer.url.setParam('height', win.getInnerHeight());
  try {
    Composer.updateImage();
  } catch (err) {
    //An exception gets thrown when the initial resize event
    //occurs prior to rendering the image viewer. Safe to ignore.
  }
}

function updateGraph() {
  Composer.updateImage();
}

/* Toolbar stuff */
function createToolbarButton(tip, icon, handler) {
  return new Ext.Toolbar.Button({
    style: "padding-left:10pt; background:transparent url(../content/img/" + icon + ") no-repeat scroll 0% 50%",
    handler: handler,
    handleMouseEvents: false,
    text: "&nbsp; &nbsp;",
    listeners: {
      render: function (button) {
        button.el.toolTip = new Ext.ToolTip({
	  html: tip,
	  showDelay: 100,
	  dismissDelay: 10000,
	  target: button.el
	});
      }
    }
  });
}

/* "Date Range" Calendar */
function createCalendarWindow() {
  // Start/End labels
  var style = "font-family: tahoma,arial,verdana,sans-serif; font-size:11px;";
  var startDateHeader = {
    html: "<center><span id='startDate' style=\"" + style + "\">Start Date</span></center>"
  };
  var endDateHeader = {
    html: "<center><span id='endDate' style=\"" + style + "\">End Date</span></center>"
  };
  // Date controls
  var startDateControl = new Ext.DatePicker({
    id: 'start-date',
    maxDate: new Date()
  });
  var endDateControl = new Ext.DatePicker({
    id: 'end-date',
    maxDate: new Date()
  });
  startDateControl.on('select', calendarSelectionMade);
  endDateControl.on('select', calendarSelectionMade);
  // Time controls
  startTimeControl = new Ext.form.TimeField({
    id: 'start-time',
    increment: 30,
    allowBlank: false,
    value: "12:00 AM",
    listeners: {select: calendarSelectionMade, specialkey: ifEnter(calendarSelectionMade)}
  });
  endTimeControl = new Ext.form.TimeField({
    id: 'end-time',
    allowBlank: false,
    value: "11:59 PM",
    listeners: {select: calendarSelectionMade, specialkey: ifEnter(calendarSelectionMade)}
  });

  var myWindow;
  var resizeStuff = function () {
    startTimeControl.setWidth( startDateControl.el.getWidth() );
    endTimeControl.setWidth( endDateControl.el.getWidth() );
    myWindow.setWidth( startDateControl.el.getWidth() + endDateControl.el.getWidth() + myWindow.getFrameWidth() );
    //myWindow.setHeight( startDateControl.el.getHeight() + startTimeControl.el.getHeight() + myWindow.getFrameHeight() );
  };

  myWindow = new Ext.Window({
    title: "Select Date Range",
    layout: 'table',
    height: 300,
    width: 400,
    layoutConfig: { columns: 2 },
    closeAction: 'hide',
    items: [
      startDateHeader,
      endDateHeader,
      startDateControl,
      endDateControl,
      startTimeControl,
      endTimeControl
    ],
    listeners: {show: resizeStuff}
  });
  return myWindow;
}

function calendarSelectionMade(datePicker, selectedDate) {
  var startDate = getCalendarSelection('start');
  var endDate = getCalendarSelection('end');
  Composer.url.setParam('from', asDateString(startDate) );
  Composer.url.setParam('until', asDateString(endDate) );
  Composer.updateImage();
  Composer.window.updateTimeDisplay({
    mode: 'date-range',
    startDate: startDate,
    endDate: endDate
  });
}

function getCalendarSelection(which) {
  var myDate = Ext.getCmp(which + '-date').getValue();
  var myTime = Ext.getCmp(which + '-time').getEl().dom.value; // Need to grab the raw textfield value, which may not be selected

  var myHour = myTime.match(/(\d+):/)[1];
  var myMinute = myTime.match(/:(\d+)/)[1];
  if (myTime.match(/\bAM\b/i) && myHour == '12') {
    myHour = 0;
  }
  if (myTime.match(/\bPM\b/i) && myHour != '12') {
    myHour = parseInt(myHour) + 12;
  }
  return myDate.add(Date.HOUR, myHour).add(Date.MINUTE, myMinute);
}

function asDateString(dateObj) {
  return dateObj.format('H:i_Ymd');
}

/* "Recent Data" dialog */
function toggleWindow(createFunc) {
  function toggler (button, e) {
    if (!button.window) { //First click, create the window
      button.window = createFunc();
    }
    if (button.window.isVisible()) {
      button.window.hide();
    } else {
      button.window.show();
    }
  }
  return toggler;
}

function createRecentWindow() {
  var quantityField = new Ext.form.NumberField({
    id: 'time-quantity',
    grow: true,
    value: 24,
    listeners: {change: recentSelectionMade, specialkey: ifEnter(recentSelectionMade)}
  });
  var unitSelector = new Ext.form.ComboBox({
    id: 'time-units',
    editable: false,
    triggerAction: 'all',
    mode: 'local',
    store: ['minutes', 'hours', 'days', 'weeks', 'months', 'years'],
    width: 75,
    value: 'hours',
    listeners: {select: recentSelectionMade}
  });

  return new Ext.Window({
    title: "Select a Recent Time Range",
    layout: 'table',
    height: 60, //there's gotta be a way to auto-size these windows!
    width: 235,
    layoutConfig: { columns: 3 },
    closeAction: 'hide',
    items: [
      {
        html: "<div style=\"border: none; background-color: rgb(223,232,246)\">View the past</div>",
        style: "border: none; background-color: rgb(223,232,246)"
      },
      quantityField,
      unitSelector
    ]
  });
}

function recentSelectionMade(combo, record, index) {
  var quantity = Ext.getCmp('time-quantity').getValue();
  var units = Ext.getCmp('time-units').getValue();
  var fromString = '-' + quantity + units;
  Composer.url.setParam('from', fromString);
  Composer.url.removeParam('until');
  Composer.updateImage();
  Composer.window.updateTimeDisplay({
    mode: 'recent',
    quantity: quantity,
    units: units
  });
}

/* "Save to MyGraphs" */
function saveMyGraph(button, e) {
  Ext.MessageBox.prompt(
    "Save to My Graphs", //title
    "Please enter a name for your Graph", //prompt message
    function (button, text) { //handler
      if (button != 'ok') {
        return;
      }

      if (!text) {
        Ext.Msg.alert("You must enter a graph name!");
	return;
      }

      if (text.search(/[^A-Za-z0-9_.]/) != -1) {
        Ext.Msg.alert("Graph names can only contain letters, numbers, underscores, or periods.");
        return;
      }

      if (text.charAt(text.length - 1) == '.') {
        Ext.Msg.alert("Graph names cannot end in a period.");
        return;
      }

      //Save the name for future use and re-load the "My Graphs" tree
      Composer.state.myGraphName = text;
      Browser.trees.mygraphs.reload();
      //Send the request
      Ext.Ajax.request({
        method: 'GET',
        url: '../composer/mygraph/',
        params: {action: 'save', graphName: text, url: Composer.url.getURL()},
        callback: handleSaveMyGraphResponse
      });
    },
    this,   //scope
    false,  //multiline
    Composer.state.myGraphName ? Composer.state.myGraphName : "" //default value
  );
}

function handleSaveMyGraphResponse(options, success, response) {
  var message;
  if (success) {
    message = "Graph saved successfully";
  } else {
    message = "There was an error saving your Graph, please try again later.";
  }
  Ext.MessageBox.show({
    title: "Save to My Graphs - Result",
    msg: message,
    buttons: Ext.MessageBox.OK
  });
}


function deleteMyGraph() {

  Ext.MessageBox.prompt(
    "Delete a saved My Graph", //title
    "Please enter the name of the My Graph you wish to delete", //prompt message
    function (button, text) { //handler
      if (button != 'ok') {
        return;
      }

      if (!text) {
        Ext.Msg.alert("Invalid My Graph name!");
	return;
      }

      Browser.trees.mygraphs.reload();
      //Send the request
      Ext.Ajax.request({
        method: 'GET',
        url: '../composer/mygraph/',
        params: {action: 'delete', graphName: text},
        callback: function (options, success, response) {
          var message = success ? "Graph deleted successfully" : "There was an error performing the operation.";

          Ext.Msg.show({
            title: 'Delete My Graph',
            msg: message,
            buttons: Ext.Msg.OK
          });
        }
      });
    },
    this,   //scope
    false,  //multiline
    Composer.state.myGraphName ? Composer.state.myGraphName : "" //default value
  );

}

/* Graph Data dialog  */
var GraphDataWindow = {
  create: function () {
    var _this = this;

    this.targetList = new Ext.ListView({
      store: TargetStore,
      multiSelect: true,
      emptyText: "No graph targets",
      reserveScrollOffset: true,
      columnSort: false,
      hideHeaders: true,
      width: 385,
      height: 140,
      columns: [ {header: "Graph Targets", width: 1.0, dataIndex: "value"} ],
      listeners: {
        contextmenu: this.targetContextMenu,
        afterrender: this.targetChanged,
        selectionchange: this.targetChanged,
        dblclick: function (targetList, index, node, e) {
                    targetList.select(index);
                    this.editTarget();
                  },
        scope: this
      }
    });

    var targetsPanel = new Ext.Panel({
      region: 'center',
      width: 400,
      height: 300,
      layout: 'fit',
      items: this.targetList
    });


    var buttonPanel = new Ext.Panel({
      region: 'east',
      width: 100,
      baseCls: 'x-window-mc',
      layout: {
        type: 'vbox',
        align: 'stretch'
      },
      defaults: { xtype: 'button', disabled: true },
      items: [
        {
          text: 'Add',
          handler: this.addTarget.createDelegate(this),
          disabled: false
        }, {
          text: 'Edit',
          id: 'editTargetButton',
          handler: this.editTarget.createDelegate(this)
        }, {
          text: 'Remove',
          id: 'removeTargetButton',
          handler: this.removeTarget.createDelegate(this)
        }, {
          text: 'Apply Function',
          id: 'applyFunctionButton',
          menuAlign: 'tr-tl',
          menu: {
            subMenuAlign: 'tr-tl',
            defaults: {
              defaultAlign: 'tr-tl'
            },
            items: [
              {
                text: 'Combine',
                id: 'combineMenu',
                menu: [
                  {text: 'Sum', handler: this.applyFuncToAll('sumSeries')},
                  {text: 'Average', handler: this.applyFuncToAll('averageSeries')},
                  {text: 'Sum using wildcards', handler: this.applyFuncToEachWithInput('sumSeriesWithWildcards', 'Please enter a comma separated list of numbers specifying the locations in the name to place wildcards')},
                  {text: 'Average using wildcards', handler: this.applyFuncToEachWithInput('averageSeriesWithWildcards', 'Please enter a comma separated list of numbers specifying the locations in the name to place wildcards')},
                  {text: 'Group', handler: this.applyFuncToAll('group')}
                ]
              }, {
                text: 'Transform',
                menu: [
                  {text: 'Scale', handler: this.applyFuncToEachWithInput('scale', 'Please enter a scale factor')},
                  {text: 'Offset', handler: this.applyFuncToEachWithInput('offset', 'Please enter the value to offset Y-values by')},
                  {text: 'Derivative', handler: this.applyFuncToEach('derivative')},
                  {text: 'Integral', handler: this.applyFuncToEach('integral')},
                  {text: 'Non-negative Derivative', handler: this.applyFuncToEachWithInput('nonNegativeDerivative', "Please enter a maximum value if this metric is a wrapping counter (or just leave this blank)", {allowBlank: true})},
                  {text: 'Log', handler: this.applyFuncToEachWithInput('log', 'Please enter a base')},
                  {text: 'timeShift', handler: this.applyFuncToEachWithInput('timeShift', 'Shift this metric ___ back in time (examples: 10min, 7d, 2w)', {quote: true})},
                  {text: 'Summarize', handler: this.applyFuncToEachWithInput('summarize', 'Please enter a summary interval (examples: 10min, 1h, 7d)', {quote: true})}
                ]
              }, {
                text: 'Calculate',
                menu: [
                  {text: 'Moving Average', handler: this.applyFuncToEachWithInput('movingAverage', 'Moving average for the last ___ data points')},
                  {text: 'Moving Standard Deviation', handler: this.applyFuncToEachWithInput('stdev', 'Moving standard deviation for the last ___ data points')},
                  {text: 'As Percent', handler: this.applyFuncToEachWithInput('asPercent', 'Please enter the value that corresponds to 100%')},
                  {text: 'Difference (of 2 series)', handler: this.applyFuncToAll('diffSeries')},
                  {text: 'Ratio (of 2 series)', handler: this.applyFuncToAll('divideSeries')}
                ]
              }, {
                text: 'Filter',
                menu: [
                  {text: 'Most Deviant', handler: this.applyFuncToEachWithInput('mostDeviant', 'Draw the ___ metrics with the highest standard deviation')},
                  {text: 'Highest Current Value', handler: this.applyFuncToEachWithInput('highestCurrent', 'Draw the ___ metrics with the highest current value')},
                  {text: 'Lowest Current Value', handler: this.applyFuncToEachWithInput('lowestCurrent', 'Draw the ___ metrics with the lowest current value')},
                  {text: 'Current Value Above', handler: this.applyFuncToEachWithInput('currentAbove', 'Draw all metrics whose current value is above ___')},
                  {text: 'Current Value Below', handler: this.applyFuncToEachWithInput('currentBelow', 'Draw all metrics whose current value is below ___')},
                  {text: 'Highest Average Value', handler: this.applyFuncToEachWithInput('highestAverage', 'Draw the ___ metrics with the highest average value')},
                  {text: 'Lowest Average Value', handler: this.applyFuncToEachWithInput('lowestAverage', 'Draw the ___ metrics with the lowest average value')},
                  {text: 'Average Value Above', handler: this.applyFuncToEachWithInput('averageAbove', 'Draw all metrics whose average value is above ___')},
                  {text: 'Average Value Below', handler: this.applyFuncToEachWithInput('averageBelow', 'Draw all metrics whose average value is below ___')},
                  {text: 'Maximum Value Above', handler: this.applyFuncToEachWithInput('maximumAbove', 'Draw all metrics whose maximum value is above ___')},
                  {text: 'Maximum Value Below', handler: this.applyFuncToEachWithInput('maximumBelow', 'Draw all metrics whose maximum value is below ___')},
                  {text: 'sortByMaxima', handler: this.applyFuncToEach('sortByMaxima')},
                  {text: 'sortByMinima', handler: this.applyFuncToEach('sortByMinima')},
                  {text: 'limit', handler: this.applyFuncToEachWithInput('limit', 'Limit to first ___ of a list of metrics')},
                  {text: 'Exclude', handler: this.applyFuncToEachWithInput('exclude', 'Exclude metrics that match a regular expression')}
                ]
              }, {
                text: 'Special',
                menu: [
                  {text: 'Set Legend Name', handler: this.applyFuncToEachWithInput('alias', 'Enter a legend label for this graph target', {quote: true})},
                  {text: 'Aggregate By Sum', handler: this.applyFuncToEach('cumulative')},
                  {text: 'Draw non-zero As Infinite', handler: this.applyFuncToEach('drawAsInfinite')},
                  {text: 'Line Width', handler: this.applyFuncToEachWithInput('lineWidth', 'Please enter a line width for this graph target')},
                  {text: 'Dashed Line', handler: this.applyFuncToEach('dashed')},
                  {text: 'Keep Last Value', handler: this.applyFuncToEach('keepLastValue')},
                  {text: 'Substring', handler: this.applyFuncToEachWithInput('substr', 'Enter a starting position')},
                  {text: 'Add Threshold Line', handler: this.applyFuncToEachWithInput('threshold', 'Enter a threshold value')}
                ]
              }
            ]
          }
        }, {
          text: 'Undo Function',
          handler: this.removeOuterCall.createDelegate(this),
          id: 'undoFunctionButton'
        }
      ]
    });

    this.window = new Ext.Window({
      title: "Graph Data",
      height: 300,
      width: 600,
      closeAction: 'hide',
      layout: 'border',
      items: [
        targetsPanel,
        buttonPanel
      ],
      listeners: {
        afterrender: function () {
                       if (_this.targetList.getNodes().length > 0) {
                         _this.targetList.select(0);
                       }
                     }
      }
    });
    return this.window;
  },

  targetChanged: function () {
    if (!this.targetList) { return; } // Ignore initial call

    var selected;

    try {
      selected = this.getSelectedTargets().length;
    } catch (e) {
      return;
    }

    if (selected == 0) {
      Ext.getCmp('editTargetButton').disable();
      Ext.getCmp('removeTargetButton').disable();
      Ext.getCmp('combineMenu').disable();
      Ext.getCmp('applyFunctionButton').disable();
      Ext.getCmp('undoFunctionButton').disable();
    } else {
      Ext.getCmp('editTargetButton').enable();
      Ext.getCmp('removeTargetButton').enable();
      Ext.getCmp('combineMenu').enable();
      Ext.getCmp('applyFunctionButton').enable();
      Ext.getCmp('undoFunctionButton').enable();
    }
  },

  targetContextMenu: function (targetList, index, node, e) {
    /* Select the right-clicked row unless it is already selected */
    if (! targetList.isSelected(index) ) {
      targetList.select(index);
    }

    var removeItem = {text: "Remove", handler: this.removeTarget.createDelegate(this)};
    var editItem = {text: "Edit", handler: this.editTarget.createDelegate(this)};

    if (this.getSelectedTargets().length == 0) {
      removeItem.disabled = true;
      editItem.disabled = true;
    }

    var contextMenu = new Ext.menu.Menu({ items: [removeItem, editItem] });
    contextMenu.showAt( e.getXY() );

    e.stopEvent();
  },

  applyFuncToEach: function (funcName, extraArg) {
    var _this = this;

    function applyFunc() {

      Ext.each(_this.getSelectedTargets(),
        function (target) {
          var newTarget;

          Composer.url.removeParam('target', target);
          removeTarget(target);

          if (extraArg) {
            if (funcName == 'mostDeviant') { //SPECIAL CASE HACK
              newTarget = funcName + '(' + extraArg + ',' + target + ')';
            } else {
              newTarget = funcName + '(' + target + ',' + extraArg + ')';
            }
          } else {
            newTarget = funcName + '(' + target + ')';
          }

          Composer.url.addParam('target', newTarget);
          addTarget(newTarget);
          _this.targetList.select( TargetStore.findExact('value', newTarget), true);
        }
      );
      Composer.updateImage();
    }
    return applyFunc;
  },

  applyFuncToEachWithInput: function (funcName, question, options) {
    if (options == null) {
      options = {};
    }

    function applyFunc() {
      Ext.MessageBox.prompt(
        "Input Required", //title
        question, //message
        function (button, inputValue) { //handler
          if (button == 'ok' && (options.allowBlank || inputValue != '')) {
            if (options.quote) {
              inputValue = '"' + inputValue + '"';
            }
            this.applyFuncToEach(funcName, inputValue)();
          }
        },
        this, //scope
        false, //multiline
        "" //initial value
      );
    }
    applyFunc = applyFunc.createDelegate(this);
    return applyFunc;
  },

  applyFuncToAll: function (funcName) {
    function applyFunc() {
      var args = this.getSelectedTargets().join(',');
      var newTarget = funcName + '(' + args + ')';

      Ext.each(this.getSelectedTargets(),
        function (target) {
	  Composer.url.removeParam('target', target);
          removeTarget(target);
        }
      );
      Composer.url.addParam('target', newTarget);
      Composer.updateImage();

      addTarget(newTarget);
      this.targetList.select( TargetStore.findExact('value', newTarget), true);
    }
    applyFunc = applyFunc.createDelegate(this);
    return applyFunc;
  },

  removeOuterCall: function () {
    /* It turns out that this is a big pain in the ass to do properly.
     * The following code is *almost* correct. It will fail if there is
     * an argument with a quoted parenthesis in it. Who cares... */
    var _this = this;

    Ext.each(this.getSelectedTargets(),
      function (target) {
	var args = [];
        var i, c;
        var lastArg = 0;
        var depth = 0;
        var argString = target.replace(/^[^(]+\((.+)\)/, "$1"); //First we strip it down to just args

        for (i = 0; i < argString.length; i++) {
          switch (argString.charAt(i)) {
            case '(': depth += 1; break;
            case ')': depth -= 1; break;
            case ',':
              if (depth > 0) { continue; }
              if (depth < 0) { Ext.Msg.alert("Malformed target, cannot remove outer call."); return; }
              args.push( argString.substring(lastArg, i).replace(/^\s+/, '').replace(/\s+$/, '') );
              lastArg = i + 1;
              break;
          }
        }
        args.push( argString.substring(lastArg, i) );

        Composer.url.removeParam('target', target);
        removeTarget(target);

        Ext.each(args, function (arg) {
          if (!arg.match(/^([0123456789\.]+|".+")$/)) { //Skip string and number literals
            Composer.url.addParam('target', arg);
            addTarget(arg);
            _this.targetList.select( TargetStore.findExact('value', arg), true);
          }
        });
        Composer.updateImage();
      }
    );
  },


  addTarget: function (target) {
    var metricCompleter;
    var win;

    metricCompleter = new MetricCompleter({
      listeners: {
        specialkey: function (field, e) {
                      if (e.getKey() == e.ENTER) {
                        var target = metricCompleter.getValue();
                        Composer.url.addParam('target', target);
                        Composer.updateImage();
                        addTarget(target);
                        win.close();
                        e.stopEvent();
                        return false;
                      }
                    },
        afterrender: function (field) {
                       metricCompleter.focus('', 500);
                     }
      }
    });

    win = new Ext.Window({
      title: "Add a new Graph Target",
      id: 'addTargetWindow',
      modal: true,
      width: 400,
      height: 115,
      layout: {
        type: 'vbox',
        align:'stretch',
        pack: 'center'
      },
      items: [
        {xtype: 'label', text: "Type the path of your new Graph Target."},
        metricCompleter
      ],
      buttonAlign: 'center',
      buttons: [
        {
          xtype: 'button',
          text: 'OK',
          handler: function () {
                     var target = metricCompleter.getValue();
                     Composer.url.addParam('target', target);
                     Composer.updateImage();
                     addTarget(target);
                     win.close();
                   }
        }, {
          xtype: 'button',
          text: 'Cancel',
          handler: function () {
                     Ext.getCmp('addTargetWindow').close();
                   }
        }
      ]
    });

    win.show();
  },

  removeTarget: function (item, e) {
    var targets = Composer.url.getParamList('target');

    Ext.each(this.getSelectedTargets(), function (target) {
      targets.remove(target);
      removeTarget(target);
    });

    Composer.url.setParamList('target', targets);
    Composer.updateImage();
  },

  editTarget: function (item, e) {
    var selected = this.targetList.getSelectedRecords();

    if (selected.length != 1) {
      Ext.MessageBox.show({
        title: "Error",
        msg: "You must select exactly one target to edit.",
        icon: Ext.MessageBox.ERROR,
        buttons: Ext.MessageBox.OK
      });
      return;
    }

    var record = selected[0];
    var metricCompleter;
    var win;

    metricCompleter = new MetricCompleter({
      value: record.get('value'),
      listeners: {
        specialkey: function (field, e) {
                      if (e.getKey() == e.ENTER) {
                        var target = metricCompleter.getValue();

                        Composer.url.removeParam('target', record.get('value'));
                        Composer.url.addParam('target', target);
                        Composer.updateImage();
                        record.set('value', target);

                        win.close();
                        e.stopEvent();
                        return false;
                      }
                    },
        afterrender: function (field) {
                       metricCompleter.focus('', 500);
                     }
      }
    });

    function editHandler () {
      var newValue = metricCompleter.getValue();

      if (newValue != '') {
        Composer.url.removeParam('target', record.get('value'));
        Composer.url.addParam('target', newValue);
        Composer.updateImage();

        record.set('value', newValue);
        record.commit();
      }

      win.close();
    }
    editHandler = editHandler.createDelegate(this); //dynamic scoping can really be a bitch

    win = new Ext.Window({
      title: "Edit Graph Target",
      id: 'editTargetWindow',
      modal: true,
      width: 400,
      height: 115,
      layout: {
        type: 'vbox',
        align:'stretch',
        pack: 'center'
      },
      items: [
        {xtype: 'label', text: "Edit the path of your Graph Target."},
        metricCompleter
      ],
      buttonAlign: 'center',
      buttons: [
        {
          xtype: 'button',
          text: 'OK',
          handler: editHandler
        }, {
          xtype: 'button',
          text: 'Cancel',
          handler: function () {
                     win.close();
                   }
        }
      ]
    });

    win.show();
  },

  addWlSelected: function (item, e) {
    Ext.Ajax.request({
      url: "/whitelist/add",
      method: "POST",
      success: function () { Ext.Msg.alert("Result", "Successfully added metrics to whitelist."); },
      failure: function () { Ext.Msg.alert("Result", "Failed to add metrics to whitelist.");   },
      params: {metrics: this.getSelectedTargets().join("\n") }
    });
  },

  removeWlSelected: function (item, e) {
    Ext.Ajax.request({
      url: "/whitelist/remove",
      method: "POST",
      success: function () { Ext.Msg.alert("Result", "Successfully removed metrics from whitelist."); },
      failure: function () { Ext.Msg.alert("Result", "Failed to remove metrics from whitelist.");   },
      params: {metrics: this.getSelectedTargets().join("\n") }
    });
  },

  getSelectedTargets: function () {
    var targets = [];

    Ext.each(this.targetList.getSelectedRecords(), function (record) {
      targets.push( record.get('value') );
    });

    return targets;
  }
};

/* Auto-Refresh feature */
function toggleAutoRefresh(button, pressed) {
  //A closure makes this really simple
  var doRefresh = function () {
    Composer.updateImage();

    //var interval = Math.min.apply(null, [context['interval'] for each (context in MetricContexts)] || [0]) || 60;
    var interval = 60;
    button.timer = setTimeout(doRefresh, interval * 1000)
  }

  if (button.timer) { // AutoRefresh is on
    if (!pressed) { // The button was untoggled, turn off AutoRefresh
      clearTimeout(button.timer);
      button.timer = null;
    }
  } else { // AutoRefresh is off
    if (pressed) { // The button was toggled, turn on AutoRefresh
      doRefresh();
    }
  }
}

/* Display Options Menu */
function createOptionsMenu() {
  var fontMenu = new Ext.menu.Menu({
    items: [
      {text: "Color", menu: createColorMenu('fgcolor')},
      menuInputItem("Size", "fontSize"),
      {text: "Face", menu: createFontFacesMenu()},
      menuCheckItem("Italics", "fontItalic"),
      menuCheckItem("Bold", "fontBold")
    ]
  });

  var areaMenu = new Ext.menu.Menu({
    items: [
      menuRadioItem("area","None", "areaMode", ""),
      menuRadioItem("area","First Only", "areaMode", "first"),
      menuRadioItem("area", "Stacked", "areaMode", "stacked"),
      menuRadioItem("area", "All", "areaMode", "all")
    ]
  });
  
  var displayMenu = new Ext.menu.Menu({
    items: [
      menuCheckItem("Graph Only", "graphOnly"),
      menuCheckItem("Hide Axes", "hideAxes"),
      menuCheckItem("Hide Grid", "hideGrid"),
      menuCheckItem("Hide Legend", "hideLegend")
    ]
  });

  var yAxisUnitMenu = new Ext.menu.Menu({
    items: [
      menuRadioItem("yUnit", "Standard", "yUnitSystem", ""),
      menuRadioItem("yUnit", "Binary", "yUnitSystem", "binary")
    ]
  });

  var yAxisMenu = new Ext.menu.Menu({
    items: [
      menuInputItem("Label", "vtitle"),
      menuInputItem("Minimum", "yMin"),
      menuInputItem("Maximum", "yMax"),
      {text: "Unit", menu: yAxisUnitMenu}
    ]
  });

  return new Ext.menu.Menu({
    items: [
      menuInputItem("Graph Title", "title"),
      {text: "Y Axis", menu: yAxisMenu},
      menuInputItem("Line Thickness", "lineWidth"),
      {text: "Area Mode", menu: areaMenu},
      menuCheckItem("Alpha Masking", "template", "alphas"),
      menuCheckItem("Staircase Line", "lineMode", "staircase"),
      {text: "Canvas Color", menu: createColorMenu('bgcolor')},
      {text: "Display", menu: displayMenu},
      {text: "Font", menu: fontMenu}
    ]
  });
}

function createFontFacesMenu() {
  var faces = ["Times", "Courier", "Sans", "Helvetica"];
  var menuItems = [];

  Ext.each(faces,
    function (face) {
      menuItems.push({
        text: face,
        handler: function (menuItem, e) {
                   Composer.url.setParam("fontName", face);
                   Composer.updateImage();
                 }
      });
    }
  );
  return new Ext.menu.Menu({items: menuItems});
}

function createColorMenu(param) {
  var colorPicker = new Ext.menu.ColorMenu({hideOnClick: false});
  colorPicker.on('select',
    function (palette, color) {
      Composer.url.setParam(param, color);
      Composer.updateImage();
    }
  );
  return colorPicker;
}

function menuInputItem(name, param) {
  return new Ext.menu.Item({text: name, handler: paramPrompt(name, param)});
}

function paramPrompt(question, param) {
  return function (menuItem, e) {
    Ext.MessageBox.prompt(
      "Input Required",
      question,
      function (button, value) {
        Composer.url.setParam(param, value);
        Composer.updateImage();
      },
      this, //scope
      false, //multiline
      Composer.url.getParam(param) || "" //default value
    );
  };
}

var checkItems = [];
function menuCheckItem(name, param, paramValue) {
  var checkItem = new Ext.menu.CheckItem({text: name, param: param, hideOnClick: false});
  checkItems.push(checkItem); //keep a list of each check item we create so we can update them later
  checkItem.on('checkchange',
    function (item, checked) {
      if (paramValue) { // Set param to a specific value
        if (checked) {
          Composer.url.setParam(param, paramValue);
        } else { // Remove the param if we're being unchecked
          Composer.url.removeParam(param);
        }
      } else { // Set the param to true/false
        Composer.url.setParam(param, checked.toString());
      }
      Composer.updateImage();
    }
  );
  return checkItem;
}

function menuRadioItem(groupName, name, param, paramValue ) {
  var selectItem = new Ext.menu.CheckItem({text: name, param: param, hideOnClick: false, group: groupName, checked: (paramValue ? false : true)});
  selectItem.on('checkchange', 
    function( item, clicked ) {
      if( paramValue ) {
        Composer.url.setParam(param, paramValue);
      } else {
        Composer.url.removeParam(param);
      }
      Composer.updateImage();
    }
  );
  return selectItem;
}

function updateCheckItems() {
  Ext.each(checkItems,
    function (item) {
      var param = item.initialConfig.param;
      item.setChecked( Composer.url.getParam(param) ? true : false );
    }
  );
}
