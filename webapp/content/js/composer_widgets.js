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
 *    limitations under the License.
 *
 *
 * ======================================================================
 *
 *     PLEASE DO NOT USE A COMMA AFTER THE FINAL ITEM IN A LIST.
 *
 * ======================================================================
 *
 * It works fine in FF / Chrome, but completely breaks Internet Explorer.
 * Thank you.
 *
*/

// From Ext library
/*global Ext*/
// Defined in composer.html
/*global addTarget Browser GraphiteConfig indexOfTarget insertTarget removeTarget replaceTarget TargetStore*/
// Defined in composer.js
/*global MetricCompleter*/

var DEFAULT_WINDOW_WIDTH = 600;
var DEFAULT_WINDOW_HEIGHT = 400;
var Composer;

function createComposerWindow(myComposer) {
  //This global is an ugly hack, probly need to make these widgets into more formal objects
  //and keep their associated Composer object as an attribute.
  Composer = myComposer;

  //Can't define this inline because I need a reference in a closure below
  var timeDisplay = new Ext.Toolbar.TextItem({text: 'Now showing the past 24 hours'});

  var topToolbar = [
    createToolbarButton('Update Graph', 'refresh.png', updateGraph),
    createToolbarButton('Select a Date Range', 'calendar.png', toggleWindow(createCalendarWindow) ),
    createToolbarButton('Select Recent Data', 'clock.png', toggleWindow(createRecentWindow) ),
    createToolbarButton('Create from URL', 'upload.png', toggleWindow(createURLWindow) ),
    createToolbarButton('Short URL', 'share.png', showShortUrl),
    '-',
    timeDisplay
  ];
  if (GraphiteConfig.showMyGraphs) {
    var saveButton = createToolbarButton('Save to My Graphs', 'save.png', saveMyGraph);
    var deleteButton = createToolbarButton('Delete from My Graphs', 'trash.png', deleteMyGraph);
    topToolbar.splice(0, 0, saveButton, deleteButton);
  }

  var bottomToolbar = [
    { text: 'Graph Options', menu: createOptionsMenu() },
    { text: 'Graph Data', handler: toggleWindow(GraphDataWindow.create.createDelegate(GraphDataWindow)) },
    { text: 'Auto-Refresh', id: 'autorefresh_button', enableToggle: true, toggleHandler: toggleAutoRefresh }
  ];

  var win = new Ext.Window({
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    title: 'Graphite Composer',
    layout: 'border',
    region: 'center',
    maximizable: true,
    closable: false,
    tbar: topToolbar,
    buttons: bottomToolbar,
    buttonAlign: 'left',
    items: { html: '<img id=\'image-viewer\' src=\'' + document.body.dataset.baseUrl + 'render\'/>', region: 'center' },
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
      text = '<b>From</b> ' + time.startDate.toLocaleString();
      text += ' <b>Until</b> ' + time.endDate.toLocaleString();
      text = text.replace(/:00 /g, ' '); // Strip out the seconds
    } else if (time.mode == 'recent') {
      text = 'Now showing the past ' + time.quantity + ' ' + time.units;
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

/* Toolbar stuff */
function createToolbarButton(tip, icon, handler) {
  return new Ext.Toolbar.Button({
    style: 'margin: 0 5px; background:transparent url(' + document.body.dataset.staticRoot + 'img/' + icon + ') no-repeat scroll 0% 50%',
    handler: handler,
    handleMouseEvents: false,
    text: '&nbsp; &nbsp;',
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
  var style = 'font-family: tahoma,arial,verdana,sans-serif; font-size:11px;';
  var startDateHeader = {
    html: '<center><span id=\'startDate\' style="' + style + '">Start Date</span></center>'
  };
  var endDateHeader = {
    html: '<center><span id=\'endDate\' style="' + style + '">End Date</span></center>'
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
  var startTimeControl = new Ext.form.TimeField({
    id: 'start-time',
    increment: 30,
    allowBlank: false,
    value: '12:00 AM',
    listeners: {select: calendarSelectionMade, specialkey: ifEnter(calendarSelectionMade)}
  });
  var endTimeControl = new Ext.form.TimeField({
    id: 'end-time',
    allowBlank: false,
    value: '11:59 PM',
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
    title: 'Select Date Range',
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

/* Short url window */
function showShortUrl() {
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
        url: document.body.dataset.baseUrl + 's/render/?' + Composer.url.queryString,
        callback: showUrl
    });
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

function createURLWindow() {
  var urlField = new Ext.form.TextField({
    id: 'from-url',
    allowBlank: false,
    vtype: 'url',
    listeners: { change: urlChosen, specialkey: ifEnter(urlChosen) }
  });

  return new Ext.Window({
      title: 'Enter a URL to build graph from',
      layout: 'fit',
      height: 60,
      width: 450,
      closeAction: 'hide',
      items: [
        urlField
      ]
  });
}

function urlChosen() {
  var url = Ext.getCmp('from-url').getValue();
  Composer.loadMyGraph('temp', decodeURIComponent(url))
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
    title: 'Select a Recent Time Range',
    layout: 'table',
    height: 60, //there's gotta be a way to auto-size these windows!
    width: 235,
    layoutConfig: { columns: 3 },
    closeAction: 'hide',
    items: [
      {
        html: '<div style="border: none; background-color: rgb(223,232,246)">View the past</div>',
        style: 'border: none; background-color: rgb(223,232,246)'
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
  var myGraphName = '';
  if (Composer.state.myGraphName) {
    myGraphName = Composer.state.myGraphName;
    var tmpArray = myGraphName.split('.');
    if (tmpArray.length > 1) {
      tmpArray = tmpArray.slice(1, tmpArray.length);
      myGraphName = tmpArray.join('.');
    }
  }
  Ext.MessageBox.prompt(
    'Save to My Graphs', //title
    'Please enter a name for your Graph', //prompt message
    function (button, text) { //handler
      if (button != 'ok') {
        return;
      }

      if (!text) {
        Ext.Msg.alert('You must enter a graph name!');
        return;
      }

      if (text.charAt(text.length - 1) == '.') {
        Ext.Msg.alert('Graph names cannot end in a period.');
        return;
      }

      //Save the name for future use and re-load the "My Graphs" tree
      Composer.state.myGraphName = text;

      //Send the request
      Ext.Ajax.request({
        method: 'GET',
        url: document.body.dataset.baseUrl + 'composer/mygraph/',
        params: {action: 'save', graphName: text, url: Composer.url.getURL()},
        callback: handleSaveMyGraphResponse
      });
    },
    this,   //scope
    false,  //multiline
    myGraphName ? myGraphName : '' //default value
  );
}

function handleSaveMyGraphResponse(options, success, response) {
  var message;
  if (success) {
    Browser.trees.mygraphs.reload();
    message = 'Graph saved successfully';
  } else {
    message = 'There was an error saving your Graph, please try again later.';
  }
  Ext.MessageBox.show({
    title: 'Save to My Graphs - Result',
    msg: message,
    buttons: Ext.MessageBox.OK
  });
}


function deleteMyGraph() {

  Ext.MessageBox.prompt(
    'Delete a saved My Graph', //title
    'Please enter the name of the My Graph you wish to delete', //prompt message
    function (button, text) { //handler
      if (button != 'ok') {
        return;
      }

      if (!text) {
        Ext.Msg.alert('Invalid My Graph name!');
        return;
      }

      //Send the request
      Ext.Ajax.request({
        method: 'GET',
        url: document.body.dataset.baseUrl + 'composer/mygraph/',
        params: {action: 'delete', graphName: text},
        callback: function (options, success, response) {
          var message;
          if (success) {
            Browser.trees.mygraphs.reload();
            message = 'Graph deleted successfully';
          } else {
            message = 'There was an error performing the operation.';
          }
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
    Composer.state.myGraphName ? Composer.state.myGraphName : '' //default value
  );

}

/* Graph Data dialog  */
var GraphDataWindow = {
  create: function () {
    var _this = this;

    this.targetList = new Ext.ListView({
      store: TargetStore,
      multiSelect: true,
      emptyText: 'No graph targets',
      reserveScrollOffset: true,
      columnSort: false,
      hideHeaders: true,
      width: 385,
      height: 140,
      columns: [
        {
          header: 'Graph Targets',
          width: 1.0,
          dataIndex: 'value',
          tpl: '{value:htmlEncode}'
        }
      ],
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
      height: 200,
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
          text: 'Move',
          id: 'moveButton',
          menuAlign: 'tr-tl',
          menu: {
            subMenuAlign: 'tr-tl',
            defaults: {
              defaultAlign: 'tr-tl'
            },
            items: [
              { text: 'Move Up', handler: this.moveTargetUp.createDelegate(this) },
              { text: 'Move Down', handler: this.moveTargetDown.createDelegate(this) },
              { text: 'Swap', handler: this.swapTargets.createDelegate(this), id: 'menuSwapTargets' }
            ]
          }
        }, {
          text: 'Apply Function',
          id: 'applyFunctionButton',
          menuAlign: 'tr-tl',
          menu: {
            subMenuAlign: 'tr-tl',
            defaults: {
              defaultAlign: 'tr-tl'
            },
            items: createFunctionsMenu()
          }
        }, {
          text: 'Undo Function',
          handler: this.removeOuterCall.createDelegate(this),
          id: 'undoFunctionButton'
        }
      ]
    });

    this.window = new Ext.Window({
      title: 'Graph Data',
      height: 200,
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
      Ext.getCmp('applyFunctionButton').disable();
      Ext.getCmp('undoFunctionButton').disable();
      Ext.getCmp('moveButton').disable();
    } else {
      Ext.getCmp('editTargetButton').enable();
      Ext.getCmp('removeTargetButton').enable();
      Ext.getCmp('applyFunctionButton').enable();
      Ext.getCmp('undoFunctionButton').enable();
      Ext.getCmp('moveButton').enable();
    }

    // Swap Targets
    if (selected == 2)
      Ext.getCmp('menuSwapTargets').enable();
    else
      Ext.getCmp('menuSwapTargets').disable();
  },

  targetContextMenu: function (targetList, index, node, e) {
    /* Select the right-clicked row unless it is already selected */
    if (! targetList.isSelected(index) ) {
      targetList.select(index);
    }

    var removeItem = {text: 'Remove', handler: this.removeTarget.createDelegate(this)};
    var editItem = {text: 'Edit', handler: this.editTarget.createDelegate(this)};
    var moveMenu = {
      text: 'Move',
      menu: [
        { text: 'Move Up', handler: this.moveTargetUp.createDelegate(this) },
        { text: 'Move Down', handler: this.moveTargetDown.createDelegate(this) },
        { text: 'Swap', handler: this.swapTargets.createDelegate(this), disabled: true }
      ]
    };

    if (this.getSelectedTargets().length == 0) {
      removeItem.disabled = true;
      editItem.disabled = true;
      moveMenu.disabled = true;
    }
    if (this.getSelectedTargets().length == 2)
      moveMenu.menu[2].disabled = false;

    var contextMenu = new Ext.menu.Menu({ items: [removeItem, editItem, moveMenu] });
    contextMenu.showAt( e.getXY() );

    e.stopEvent();
  },

  applyFuncToEach: function (funcName, extraArg) {
    var _this = this;

    function applyFunc() {

      Ext.each(_this.getSelectedTargets(),
        function (target) {
          var newTarget;

          if (extraArg) {
            newTarget = funcName + '(' + target + ',' + extraArg + ')';
          } else {
            newTarget = funcName + '(' + target + ')';
          }

          replaceTarget(target, newTarget);
          _this.targetList.select( TargetStore.findExact('value', newTarget), true);
        }
      );
      Composer.syncTargetList();
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
  },

  applyFuncToAll: function (funcName) {
    function applyFunc() {
      var args = this.getSelectedTargets().join(',');
      var oldTargets = this.getSelectedTargets();
      var firstTarget = oldTargets.shift();
      var newTarget = funcName + '(' + args + ')';

      // Insert new target where the first selected was
      replaceTarget(firstTarget,newTarget);

      Ext.each(oldTargets,
        function (target) {
          removeTarget(target);
        }
      );
      Composer.syncTargetList();
      Composer.updateImage();

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

        var firstIndex = indexOfTarget(target);
        removeTarget(target);

        args.reverse()
        Ext.each(args, function (arg) {
          if (!arg.match(/^([0123456789\.]+|".+"|'.*')$/)) { //Skip string and number literals
            insertTarget(firstIndex, arg);
            _this.targetList.select( TargetStore.findExact('value', arg), true);
          }
        });
        Composer.syncTargetList();
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
                        addTarget(target);
                        Composer.syncTargetList();
                        Composer.updateImage();
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
      title: 'Add a new Graph Target',
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
        {xtype: 'label', text: 'Type the path of your new Graph Target.'},
        metricCompleter
      ],
      buttonAlign: 'center',
      buttons: [
        {
          xtype: 'button',
          text: 'OK',
          handler: function () {
                     var target = metricCompleter.getValue();
                     addTarget(target);
                     Composer.syncTargetList();
                     Composer.updateImage();
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

    Ext.each(this.getSelectedTargets(), function (target) {
      removeTarget(target);
    });
    Composer.syncTargetList();
    Composer.updateImage();
  },

  editTarget: function (item, e) {
    var selected = this.targetList.getSelectedRecords();

    if (selected.length != 1) {
      Ext.MessageBox.show({
        title: 'Error',
        msg: 'You must select exactly one target to edit.',
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

                        record.set('value', target);
                        record.commit();
                        Composer.syncTargetList();
                        Composer.updateImage();

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
        record.set('value', newValue);
        record.commit();

        Composer.syncTargetList();
        Composer.updateImage();
      }

      win.close();
    }
    editHandler = editHandler.createDelegate(this); //dynamic scoping can really be a bitch

    win = new Ext.Window({
      title: 'Edit Graph Target',
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
        {xtype: 'label', text: 'Edit the path of your Graph Target.'},
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

  moveTargetUp: function() {
    this._moveTarget(-1);
  },

  moveTargetDown: function() {
    this._moveTarget(1);
  },

  swapTargets: function() {
    this._swapTargets();
  },

  _moveTarget: function(direction) {
    var store = this.targetList.getStore();
    var selectedRecords = this.targetList.getSelectedRecords();

    // Don't move past boundaries
    var exit = false;
    Ext.each(selectedRecords, function(record) {
      var index = store.indexOf(record);

      if (direction == -1 && index == 0) {
        exit = true;
        return false;
      }
      else if (direction == 1 && index == store.getCount() - 1) {
        exit = true;
        return false;
      }
    });
    if (exit)
      return;

    var newSelections = [];
    Ext.each(selectedRecords, function(recordA) {
      var indexA = store.indexOf( recordA );
      var valueA = recordA.get('value');
      var recordB = store.getAt( indexA + direction );

      // swap
      recordA.set('value', recordB.get('value'));
      recordB.set('value', valueA);
      recordA.commit();
      recordB.commit();

      newSelections.push( indexA + direction );
    });

    Composer.syncTargetList();
    Composer.updateImage();
    this.targetList.select(newSelections);
  },

  _swapTargets: function() {
    var selectedRecords = this.targetList.getSelectedRecords();
    if (selectedRecords.length != 2)
      return;

    var recordA = selectedRecords[0];
    var recordB = selectedRecords[1];

    var valueA = recordA.get('value');
    recordA.set('value', recordB.get('value'));
    recordB.set('value', valueA);

    recordA.commit();
    recordB.commit();

    Composer.syncTargetList();
    Composer.updateImage();
  },

  addWlSelected: function (item, e) {
    Ext.Ajax.request({
      url: document.body.dataset.baseUrl + 'whitelist/add',
      method: 'POST',
      success: function () { Ext.Msg.alert('Result', 'Successfully added metrics to whitelist.'); },
      failure: function () { Ext.Msg.alert('Result', 'Failed to add metrics to whitelist.');   },
      params: {metrics: this.getSelectedTargets().join('\n') }
    });
  },

  removeWlSelected: function (item, e) {
    Ext.Ajax.request({
      url: document.body.dataset.baseUrl + 'whitelist/remove',
      method: 'POST',
      success: function () { Ext.Msg.alert('Result', 'Successfully removed metrics from whitelist.'); },
      failure: function () { Ext.Msg.alert('Result', 'Failed to remove metrics from whitelist.');   },
      params: {metrics: this.getSelectedTargets().join('\n') }
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

/* Yet another ghetto api hack */
var applyFuncToAll = GraphDataWindow.applyFuncToAll.createDelegate(GraphDataWindow);
var applyFuncToEach = GraphDataWindow.applyFuncToEach.createDelegate(GraphDataWindow);
var applyFuncToEachWithInput = GraphDataWindow.applyFuncToEachWithInput.createDelegate(GraphDataWindow);


function createFunctionsMenu() {
  return [{
      text: 'Combine',
      menu: [
        {text: 'Sum', handler: applyFuncToAll('sumSeries')},
        {text: 'Sum (of series lists)', handler: applyFuncToAll('sumSeriesLists')},
        {text: 'Average', handler: applyFuncToAll('averageSeries')},
        {text: 'Product', handler: applyFuncToAll('multiplySeries')},
        {text: 'Product (of series lists)', handler: applyFuncToAll('multiplySeriesLists')},
        {text: 'Min Values', handler: applyFuncToAll('minSeries')},
        {text: 'Max Values', handler: applyFuncToAll('maxSeries')},
        {text: 'Group', handler: applyFuncToAll('group')},
        {text: 'Range', handler: applyFuncToAll('rangeOfSeries')},
        {text: 'Count', handler: applyFuncToEach('countSeries')}
      ]
    }, {
      text: 'Transform',
      menu: [
        {text: 'Absolute Value', handler: applyFuncToEach('absolute')},
        {text: 'Add', handler: applyFuncToEachWithInput('add', 'Please enter a constant')},
        {text: 'Delay', handler: applyFuncToEachWithInput('delay', 'Please enter the number of steps to delay')},
        {text: 'Derivative', handler: applyFuncToEach('derivative')},
        {text: 'Exp', handler: applyFuncToEach('exp')},
        {text: 'Hit Count', handler: applyFuncToEachWithInput('hitcount', 'Please enter a summary interval (examples: 10min, 1h, 7d)', {quote: true})},
        {text: 'Interpolate', handler: applyFuncToEach('interpolate')},
        {text: 'Integral', handler: applyFuncToEach('integral')},
        {text: 'Integral by Interval', handler: applyFuncToEachWithInput('integralByInterval', 'Integral this metric with a reset every ___ (examples: 1d, 1h, 10min)', {quote: true})},
        {text: 'Invert', handler: applyFuncToEach('invert')},
        {text: 'Log', handler: applyFuncToEachWithInput('log', 'Please enter a base')},
        {text: 'Logit', handler: applyFuncToEach('logit')},
        {text: 'Non-negative Derivative', handler: applyFuncToEachWithInput('nonNegativeDerivative', 'Please enter a maximum value if this metric is a wrapping counter (or just leave this blank)', {allowBlank: true})},
        {text: 'Offset', handler: applyFuncToEachWithInput('offset', 'Please enter the value to offset Y-values by')},
        {text: 'OffsetToZero', handler: applyFuncToEach('offsetToZero')},
        {text: 'Percentile Values', handler: applyFuncToEachWithInput('percentileOfSeries', 'Please enter the percentile to use')},
        {text: 'Power', handler: applyFuncToEachWithInput('pow', 'Please enter a power factor')},
        {text: 'Power Series', handler: applyFuncToEachWithInput('powSeries', 'Please enter at least 2 series')},
        {text: 'Summarize', handler: applyFuncToEachWithInput('summarize', 'Please enter a summary interval (examples: 10min, 1h, 7d)', {quote: true})},
        {text: 'Scale', handler: applyFuncToEachWithInput('scale', 'Please enter a scale factor')},
        {text: 'ScaleToSeconds', handler: applyFuncToEachWithInput('scaleToSeconds', 'Please enter a number of seconds to scale to')},
        {text: 'Sigmoid', handler: applyFuncToEach('sigmoid')},
        {text: 'Square Root', handler: applyFuncToEach('squareRoot')},
        {text: 'timeShift', handler: applyFuncToEachWithInput('timeShift', 'Shift this metric ___ back in time (examples: 10min, 7d, 2w)', {quote: true})},
        {text: 'timeSlice', handler: applyFuncToEachWithInput('timeSlice', 'Start showing metric at (example: 14:57 20150115)', {quote: true})},
        {text: 'Time-adjusted Derivative', handler: applyFuncToEachWithInput('perSecond', 'Please enter a maximum value if this metric is a wrapping counter (or just leave this blank)', {allowBlank: true})}
      ]
    }, {
      text: 'Calculate',
      menu: [
        {text: 'Moving Average', handler: applyFuncToEachWithInput('movingAverage', 'Moving average for the last ___ data points')},
        {text: 'Moving Median', handler: applyFuncToEachWithInput('movingMedian', 'Moving median for the last ___ data points')},
        {text: 'Moving Standard Deviation', handler: applyFuncToEachWithInput('stdev', 'Moving standard deviation for the last ___ data points')},
        {text: 'Moving Sum', handler: applyFuncToEachWithInput('movingSum', 'Moving sum for the last ___ data points')},
        {text: 'Moving Min', handler: applyFuncToEachWithInput('movingMin', 'Moving minimum for the last ___ data points')},
        {text: 'Moving Max', handler: applyFuncToEachWithInput('movingMax', 'Moving maximum for the last ___ data points')},
        {text: 'Holt-Winters Forecast', handler: applyFuncToEach('holtWintersForecast')},
        {text: 'Holt-Winters Confidence Bands', handler: applyFuncToEach('holtWintersConfidenceBands')},
        {text: 'Holt-Winters Aberration', handler: applyFuncToEach('holtWintersAberration')},
        {text: 'Linear Regression', handler: applyFuncToEachWithInput('linearRegression', 'Start source of regression at (example: 14:57 20150115)', {quote: true})},
        {text: 'As Percent', handler: applyFuncToEachWithInput('asPercent', 'Please enter the value that corresponds to 100% or leave blank to use the total', {allowBlank: true})},
        {text: 'Difference (of 2 series)', handler: applyFuncToAll('diffSeries')},
        {text: 'Difference (of series lists)', handler: applyFuncToAll('diffSeriesLists')},
        {text: 'Ratio (of 2 series)', handler: applyFuncToAll('divideSeries')},
        {text: 'Ratio (of series lists)', handler: applyFuncToAll('divideSeriesLists')},
        {text: 'Exponential Moving Average', handler: applyFuncToEachWithInput('exponentialMovingAverage', 'EMA for the last __ data points')}
      ]
    }, {
      text: 'Filter',
      menu: [
        {
          text: 'Data Filters',
          menu: [
            {text: 'Remove Above Value', handler: applyFuncToEachWithInput('removeAboveValue', 'Set any values above ___ to None')},
            {text: 'Remove Above Percentile', handler: applyFuncToEachWithInput('removeAbovePercentile', 'Set any values above the ___th percentile to None')},
            {text: 'Remove Below Value', handler: applyFuncToEachWithInput('removeBelowValue', 'Set any values below ___ to None')},
            {text: 'Remove Below Percentile', handler: applyFuncToEachWithInput('removeBelowPercentile', 'Set any values below the ___th percentile to None')}
          ]
        },
        {text: 'Most Deviant', handler: applyFuncToEachWithInput('mostDeviant', 'Draw the ___ metrics with the highest standard deviation')},
        {text: 'Highest Current Value', handler: applyFuncToEachWithInput('highestCurrent', 'Draw the ___ metrics with the highest current value')},
        {text: 'Lowest Current Value', handler: applyFuncToEachWithInput('lowestCurrent', 'Draw the ___ metrics with the lowest current value')},
        {text: 'Highest Maximum Value', handler: applyFuncToEachWithInput('highestMax', 'Draw the ___ metrics with the highest maximum value')},
        {text: 'Nth Percentile Value', handler: applyFuncToEachWithInput('nPercentile', 'Draw the ___th Percentile for each metric.')},
        {text: 'Remove Between Percentile', handler: applyFuncToEachWithInput('removeBetweenPercentile', 'Draw the metrics that have a value outside the ___th percentile of the average at a time')},
        {text: 'Current Value Above', handler: applyFuncToEachWithInput('currentAbove', 'Draw all metrics whose current value is above ___')},
        {text: 'Current Value Below', handler: applyFuncToEachWithInput('currentBelow', 'Draw all metrics whose current value is below ___')},
        {text: 'Highest Average Value', handler: applyFuncToEachWithInput('highestAverage', 'Draw the ___ metrics with the highest average value')},
        {text: 'Lowest Average Value', handler: applyFuncToEachWithInput('lowestAverage', 'Draw the ___ metrics with the lowest average value')},
        {text: 'Average Value Above', handler: applyFuncToEachWithInput('averageAbove', 'Draw all metrics whose average value is above ___')},
        {text: 'Average Value Below', handler: applyFuncToEachWithInput('averageBelow', 'Draw all metrics whose average value is below ___')},
        {text: 'Average Outside Percentile Value', handler: applyFuncToEachWithInput('averageOutsidePercentile', 'Draw the metrics which average lies outside the ___th percentile of all averages')},
        {text: 'Maximum Value Above', handler: applyFuncToEachWithInput('maximumAbove', 'Draw all metrics whose maximum value is above ___')},
        {text: 'Maximum Value Below', handler: applyFuncToEachWithInput('maximumBelow', 'Draw all metrics whose maximum value is below ___')},
        {text: 'Minimum Value Above', handler: applyFuncToEachWithInput('minimumAbove', 'Draw all metrics whose minimum value is above ___')},
        {text: 'Minimum Value Below', handler: applyFuncToEachWithInput('minimumBelow', 'Draw all metrics whose minimum value is below ___')},
        {text: 'sortByName', handler: applyFuncToEach('sortByName')},
        {text: 'sortByTotal', handler: applyFuncToEach('sortByTotal')},
        {text: 'sortByMaxima', handler: applyFuncToEach('sortByMaxima')},
        {text: 'sortByMinima', handler: applyFuncToEach('sortByMinima')},
        {text: 'limit', handler: applyFuncToEachWithInput('limit', 'Limit to first ___ of a list of metrics')},
        {text: 'Exclude', handler: applyFuncToEachWithInput('exclude', 'Exclude metrics that match a regular expression')},
        {text: 'Grep', handler: applyFuncToEachWithInput('grep', 'Exclude metrics that don\'t match a regular expression')},
        {text: 'Remove Empty Series', handler: applyFuncToEachWithInput('removeEmptySeries', 'Removes series with no data from graph')},
        {text: 'Remove Duplicates By Name', handler: applyFuncToAll('unique')}
      ]
    }, {
      text: 'Special',
      menu: [
        {text: 'Set Legend Name', handler: applyFuncToEachWithInput('alias', 'Enter a legend label for this graph target', {quote: true})},
        {text: 'Set Legend Name By Metric', handler: applyFuncToEach('aliasByMetric')},
        {text: 'Set Legend Name By Node', handler: applyFuncToEachWithInput('aliasByNode', 'Enter the 0-indexed node to display')},
        {text: 'Add Values to Legend Name',
                menu: [
                        {text: 'Cacti Style Legend', handler: applyFuncToEach('cactiStyle')},
                        {text: 'Last Value', handler: applyFuncToEach('legendValue', '"last"')},
                        {text: 'Average Value', handler: applyFuncToEach('legendValue', '"avg"')},
                        {text: 'Total Value', handler: applyFuncToEach('legendValue', '"total"')},
                        {text: 'Min Value', handler: applyFuncToEach('legendValue', '"min"')},
                        {text: 'Max Value', handler: applyFuncToEach('legendValue', '"max"')}
                      ]},
        {text: 'Color', handler: applyFuncToEachWithInput('color', 'Set the color for this graph target', {quote: true})},
        {text: 'Alpha', handler: applyFuncToEachWithInput('alpha', 'Set the alpha (transparency) for this graph target (between 0.0 and 1.0)')},
        {text: 'Consolidate By',
                menu: [
                        {text: 'Sum', handler: applyFuncToEach('consolidateBy', '"sum"')},
                        {text: 'Max', handler: applyFuncToEach('consolidateBy', '"max"')},
                        {text: 'Min', handler: applyFuncToEach('consolidateBy', '"min"')}
                      ]},
        {text: 'Draw non-zero As Infinite', handler: applyFuncToEach('drawAsInfinite')},
        {text: 'Line Width', handler: applyFuncToEachWithInput('lineWidth', 'Please enter a line width for this graph target')},
        {text: 'Dashed Line', handler: applyFuncToEach('dashed')},
        {text: 'Keep Last Value', handler: applyFuncToEachWithInput('keepLastValue', 'Please enter the maximum number of "None" datapoints to overwrite, or leave empty for no limit. (default: empty)', {allowBlank: true})},
        {text: 'Changed', handler: applyFuncToEach('changed')},
        {text: 'Transform Nulls', handler: applyFuncToEachWithInput('transformNull', 'Please enter the value to transform null values to')},
        {text: 'Count non-nulls', handler: applyFuncToAll('isNonNull')},
        {text: 'Substring', handler: applyFuncToEachWithInput('substr', 'Enter a starting position')},
        {text: 'Group', handler: applyFuncToAll('group')},
        {text: 'Area Between', handler: applyFuncToEach('areaBetween')},
//        {text: 'GroupByNode', handler: applyFuncToEachWithInput('group')}, // requires 2 parameters
//        {text: 'Add Threshold Line', handler: applyFuncToEachWithInput('threshold', 'Enter a threshold value')},
        {text: 'Draw Stacked', handler: applyFuncToEach('stacked')},
        {text: 'Draw in Second Y Axis', handler: applyFuncToEach('secondYAxis')},
        {text: 'Aggregate Line',
         menu: [
           {text: 'Avg', handler: applyFuncToEach('aggregateLine', '"avg"')},
           {text: 'Max', handler: applyFuncToEach('aggregateLine', '"max"')},
           {text: 'Min', handler: applyFuncToEach('aggregateLine', '"min"')}
         ]
        }
      ]
    }
  ];
}




/* Auto-Refresh feature */
function toggleAutoRefresh(button, pressed) {
  //A closure makes this really simple
  var doRefresh = function () {
    Composer.updateImage();

    //var interval = Math.min.apply(null, [context['interval'] for each (context in MetricContexts)] || [0]) || 60;
    var interval = GraphiteConfig.refreshInterval;
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
  var yAxisUnitMenu = new Ext.menu.Menu({
    items: [
      menuRadioItem('yUnit', 'Standard', 'yUnitSystem', 'si'),
      menuRadioItem('yUnit', 'Binary', 'yUnitSystem', 'binary'),
      menuRadioItem('yUnit', 'Seconds', 'yUnitSystem', 'sec'),
      menuRadioItem('yUnit', 'Milliseconds', 'yUnitSystem', 'msec'),
      menuRadioItem('yUnit', 'None', 'yUnitSystem', 'none')

    ]
  });
  var yAxisSideMenu = new Ext.menu.Menu({
    items: [
      menuRadioItem('yAxis', 'Left', 'yAxisSide', 'left'),
      menuRadioItem('yAxis', 'Right', 'yAxisSide', 'right')
    ]
  });

  var yAxisLeftMenu = new Ext.menu.Menu({
    items: [
      menuInputItem('Left Y Label', 'vtitle', 'Left Y Label', /^$/),
      menuInputItem('Left Y Minimum', 'yMinLeft'),
      menuInputItem('Left Y Maximum', 'yMaxLeft'),
      menuInputItem('Left Y Limit', 'yLimitLeft'),
      menuInputItem('Left Y Step', 'yStepLeft'),
      menuInputItem('Left Line Width', 'leftWidth'),
      menuInputItem('Left Line Color', 'leftColor'),
      menuInputItem('Left Line Dashed (length, in px)', 'leftDashed')

    ]
  });
  var yAxisRightMenu = new Ext.menu.Menu({
    items: [
      menuInputItem('Right Y Label', 'vtitleRight', 'Right Y Label', /^$/),
      menuInputItem('Right Y Minimum', 'yMinRight'),
      menuInputItem('Right Y Maximum', 'yMaxRight'),
      menuInputItem('Right Y Limit', 'yLimitRight'),
      menuInputItem('Right Y Step', 'yStepRight'),
      menuInputItem('Right Line Width', 'rightWidth'),
      menuInputItem('Right Line Color', 'rightColor'),
      menuInputItem('Right Line Dashed (length, in px)', 'rightDashed')

    ]
  });

  var SecondYAxisMenu = new Ext.menu.Menu({
    items: [
      {text: 'Left Y-Axis', menu: yAxisLeftMenu},
      {text: 'Right Y-Axis', menu: yAxisRightMenu}
    ]
  });

  var yAxisMenu = new Ext.menu.Menu({
    items: [
      menuInputItem('Label', 'vtitle', 'Y-Axis Label', /^$/),
      menuInputItem('Minimum', 'yMin'),
      menuInputItem('Maximum', 'yMax'),
      menuInputItem('Minor Lines', 'minorY', 'Enter the number of minor lines to draw', /^[a-zA-Z]/),
      menuInputItem('Logarithmic Scale', 'logBase', 'Enter the logarithmic base to use (ie. 10, e, etc...)'),
      menuInputItem('Step', 'yStep', 'Enter the Y-axis step to use (e.g. 0.2)'),
      menuInputItem('Divisors', 'yDivisors', 'Enter the target number of intermediate Y-axis values (e.g. 4,5,6)', /^[a-zA-Z]/),
      {text: 'Unit', menu: yAxisUnitMenu},
      {text: 'Side', menu: yAxisSideMenu},
      {text: 'Dual Y-Axis Options', menu: SecondYAxisMenu},
      menuHelpItem('Dual Y-Axis Help', 'To select metrics to associate with the second (right-side) y-axis, go into the Graph Data dialog box, highlight a metric, click Apply Functions, Special, Second Y Axis.')
    ]
  });

  var xAxisMenu = new Ext.menu.Menu({
    items: [
      menuInputItem('Time Format', 'xFormat', 'Enter the time format (see Python\'s datetime.strftime())', /^$/),
      menuInputItem('Timezone', 'tz', 'Enter the timezone to display (e.g. UTC or America/Chicago)', /^$/),
      menuInputItem('Point-width Consolidation Threshold', 'minXStep', 'Enter the closest number of pixels between points before consolidation')
    ]
  });

  var areaMenu = new Ext.menu.Menu({
    items: [
      menuRadioItem('area', 'None', 'areaMode', ''),
      menuRadioItem('area', 'First Only', 'areaMode', 'first'),
      menuRadioItem('area', 'Stacked', 'areaMode', 'stacked'),
      menuRadioItem('area', 'All', 'areaMode', 'all')
    ]
  });

  var lineMenu = new Ext.menu.Menu({
    items: [
        menuRadioItem('line', 'Slope Line (default)', 'lineMode', ''),
        menuRadioItem('line', 'Staircase Line', 'lineMode', 'staircase'),
        menuRadioItem('line', 'Connected Line', 'lineMode', 'connected'),
        menuInputItem('Connected Line Limit', 'connectedLimit', 'The number of consecutive None values to jump over when in connected line mode. (default: no limit, leave empty)'),
        menuCheckItem('Draw Null as Zero', 'drawNullAsZero')
    ]
  });

  var fontFacesMenu = new Ext.menu.Menu({
    items: [
      menuRadioItem('fontFace', 'Sans', 'fontName', 'Sans'),
      menuRadioItem('fontFace', 'Times', 'fontName', 'Times'),
      menuRadioItem('fontFace', 'Courier', 'fontName', 'Courier'),
      menuRadioItem('fontFace', 'Helvetica', 'fontName', 'Helvetica')
    ]
  });

  var fontMenu = new Ext.menu.Menu({
    items: [
      {text: 'Face', menu: fontFacesMenu},
      {
        text: 'Style',
        menu: {
          items: [
            menuCheckItem('Italics', 'fontItalic'),
            menuCheckItem('Bold', 'fontBold')
          ]
        }
      },
      menuInputItem('Size', 'fontSize', 'Enter the font size in pt'),
      {text: 'Color', menu: createColorMenu('fgcolor')}
    ]
  });

  var displayMenu = new Ext.menu.Menu({
    items: [
      {text: 'Font', menu: fontMenu},
      {
        text: 'Color',
        menu: {
          items: [
            menuInputItem('Line Colors', 'colorList', 'Enter an ordered list of comma-separated colors (name or hex values)', /^$/),
            {text: 'Background', menu: createColorMenu('bgcolor')},
            {text: 'Major Grid Line', menu: createColorMenu('majorGridLineColor')},
            {text: 'Minor Grid Line', menu: createColorMenu('minorGridLineColor')},
            menuInputItem('Filled Area Alpha Value', 'areaAlpha', 'Enter the alpha value (between 0.0 and 1.0)')
          ]
        }
      },
      {
        text: 'Graph Legend',
        menu: {
          items: [
            menuRadioItem('legend', 'Hide If Too Many', 'hideLegend'),
            menuRadioItem('legend', 'Always Hide', 'hideLegend', 'true'),
            menuRadioItem('legend', 'Never Hide', 'hideLegend', 'false'),
            menuCheckItem('Hide Duplicate Items', 'uniqueLegend'),
            menuCheckItem('Hide Null Series', 'hideNullFromLegend')
          ]
        }
      },
      menuInputItem('Line Thickness', 'lineWidth', 'Enter the line thickness in pixels'),
      menuInputItem('Margin', 'margin', 'Enter the margin width in pixels'),
      menuCheckItem('Graph Only', 'graphOnly'),
      menuCheckItem('Hide Axes', 'hideAxes'),
      menuCheckItem('Hide Y-Axis', 'hideYAxis'),
      menuCheckItem('Hide Grid', 'hideGrid'),
      menuInputItem('Apply Template', 'template', 'Enter the name of a template defined in graphTemplates.conf', /^$/)
    ]
  });

  return {
    xtype: 'menu',
    items: [
      menuInputItem('Graph Title', 'title', 'Graph Title', /^$/),
      {text: 'Display', menu: displayMenu},
      {text: 'Line Mode', menu: lineMenu},
      {text: 'Area Mode', menu: areaMenu},
      {text: 'X-Axis', menu: xAxisMenu},
      {text: 'Y-Axis', menu: yAxisMenu}
    ]
  };
}

/* Graph Options API */
function updateGraph() {
  return Composer.updateImage();
}

function getParam(param) {
  return Composer.url.getParam(param);
}

function setParam(param, value) {
  return Composer.url.setParam(param, value);
}

function removeParam(param) {
  return Composer.url.removeParam(param);
}
/* End of Graph Options API */

function createColorMenu(param) {
  var colorPicker = new Ext.menu.ColorMenu({hideOnClick: false});
  colorPicker.on('select',
    function (palette, color) {
      setParam(param, color);
      updateGraph();
    }
  );
  return colorPicker;
}

function menuInputItem(name, param, question, regexp) {
  return new Ext.menu.Item({text: name, handler: paramPrompt(question || name, param, regexp)});
}

function menuHelpItem(name, message) {
  return new Ext.menu.Item({text: name, handler: helpMessage(name, message)});
}

function paramPrompt(question, param, regexp) {

  if(regexp == null) {
    regexp = /[^A-Za-z0-9_.\-]/;
  }

  return function (menuItem, e) {
    Ext.MessageBox.prompt(
      'Input Required',
      question,
      function (button, value) {
        if (value.search(regexp) != -1) {
          Ext.Msg.alert('Input can only contain letters, numbers, underscores, or periods.');
          return;
        }

        if (value.charAt(value.length - 1) == '.') {
          Ext.Msg.alert('Input cannot end in a period.');
          return;
        }

        setParam(param, value);
        updateGraph();
      },
      this, //scope
      false, //multiline
      getParam(param) || '' //default value
    );
  };
}

function helpMessage(myTitle, myMessage) {
  return function (menuItem, e) {
    Ext.MessageBox.show(
        {title: myTitle,
          msg: myMessage,
          button: Ext.MessageBox.OK
          }
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
          setParam(param, paramValue);
        } else { // Remove the param if we're being unchecked
          removeParam(param);
        }
      } else { // Set the param to true/false
        setParam(param, checked.toString());
      }
      updateGraph();
    }
  );
  return checkItem;
}

function menuRadioItem(groupName, name, param, paramValue ) {
  var selectItem = new Ext.menu.CheckItem({text: name, param: param, hideOnClick: false, group: groupName, checked: (paramValue ? false : true)});
  selectItem.on('checkchange',
    function( item, clicked ) {
      if( paramValue ) {
        setParam(param, paramValue);
      } else {
        removeParam(param);
      }
      updateGraph();
    }
  );
  return selectItem;
}

function updateCheckItems() {
  Ext.each(checkItems,
    function (item) {
      var param = item.initialConfig.param;
      item.setChecked(getParam(param) ? true : false, true);
    }
  );
}
