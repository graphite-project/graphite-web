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

function createComposerWindow(options) {
  if (!options) {
    options = {};
  }
  
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
    topToolbar.splice(0, 0, saveButton);
  }

  var bottomToolbar = [
    { text: "Options", menu: createOptionsMenu() },
    { text: "Functions", handler: toggleWindow(FunctionsWindow.create.createDelegate(FunctionsWindow)) },
    { text: "Auto-Refresh", enableToggle: true, toggleHandler: toggleAutoRefresh }
  ];

  var win = new Ext.Window({
    width: options.width ? options.width : DEFAULT_WINDOW_WIDTH,
    height: options.height ? options.height : DEFAULT_WINDOW_HEIGHT,
    title: "Graphite Composer",
    layout: "border",
    region: "center",
    maximizable: true,
    closable: false,
    tbar: topToolbar,
    buttons: bottomToolbar,
    buttonAlign: 'left',
    items: {html: "<img id='image-viewer' src='/render'/>", region: "center" },
    listeners: {show: fitImageToWindow, resize: fitImageToWindow}
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
    timeDisplay.getEl().innerHTML = text;
  };
  win.getImage = function () {
    return $('image-viewer');
  };

  return win;
}

function toggleWindow(createFunc) { // Convenience for lazily creating toggled dialogs
  function toggler (button, evt) {
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
  return function (widget, evt) {
    if (evt.getCharCode() == Ext.EventObject.RETURN) {
      func(widget);
    }
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
    style: "padding-left:10pt; background:transparent url(/content/img/" + icon + ") no-repeat scroll 0% 50%",
    handler: handler,
    handleMouseEvents: false,
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
    html: "<center><span id='startDate' style=\"" + style + "\">Start Date</span></center>",
  };
  var endDateHeader = {
    html: "<center><span id='endDate' style=\"" + style + "\">End Date</span></center>",
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
    increment: 30,
    allowBlank: false,
    value: "11:59 PM",
    listeners: {select: calendarSelectionMade, specialkey: ifEnter(calendarSelectionMade)}
  });

  return new Ext.Window({
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
    ]
  });
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
  var myTime = Ext.getCmp(which + '-time').getValue();
  var myHour = myTime.match(/(\d+):/)[1];
  var myMinute = myTime.match(/:(\d+)/)[1];
  if (myTime.endsWith('PM') && myHour != '12') {
    myHour = parseInt(myHour) + 12;
  }
  myDate.setHours(myHour, myMinute);
  return myDate;
}

function asDateString(dateObj) {
  return dateObj.getHours().toPaddedString(2) + ':' +
         dateObj.getMinutes().toPaddedString(2) + '_' +
         dateObj.getFullYear().toString() +
         (dateObj.getMonth() + 1).toPaddedString(2) +
         dateObj.getDate().toPaddedString(2);
}

/* "Recent Data" dialog */
function toggleWindow(createFunc) {
  function toggler (button, evt) {
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
function saveMyGraph(button, evt) {
  Ext.MessageBox.prompt(
    "Save to My Graphs", //title
    "Please enter a name for your Graph", //prompt message
    function (button, text) { //handler
      if (button != 'ok') {
        return;
      }
      if (!text) {
        alert("You must enter a graph name!");
	return;
      }
      //Save the name for future use
      Composer.myGraphName = text;
      //Send the request
      Ext.Ajax.request({
        method: 'GET',
        url: '/composer/mygraph/',
        params: {action: 'save', graphName: text, url: Composer.url.getURL()},
        callback: handleSaveMyGraphResponse
      });
    },
    this,   //scope
    false,  //multiline
    Composer.myGraphName ? Composer.myGraphName : "" //default value
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

/* Functions dialog  */
var FunctionsWindow = { //This widget has a lot of state, so an object is appropriate
  create: function () {
    this.targetsStore = new Ext.data.SimpleStore({
      fields: ["target"],
      data: Composer.url.getParamList('target').map(function (t) { return [t]; })
    });

    this.grid = new Ext.grid.GridPanel({
      store: this.targetsStore,
      columns: [ {header: "Targets", width: 500, sortable: true, dataIndex: "target"} ],
      listeners: {contextmenu: this.showContextMenu, scope: this}
    });

    this.window = new Ext.Window({
      title: "Numeric Series Operations   (select targets and right-click)",
      height: 200,
      width: 500,
      closeAction: 'hide',
      items: [ this.grid ],
      listeners: {resize: this.fitGridToWindow, show: this.update, scope: this}
    });
    return this.window;
  },

  update: function (win) {
    this.refreshList();
    this.fitWindowToGrid();
  },

  fitGridToWindow: function (widget, width, height) {
    this.grid.setSize( this.window.getInnerWidth(), this.window.getInnerHeight() );
  },

  fitWindowToGrid: function () {
    var size = this.grid.getSize();
    size.width += this.window.getFrameWidth();
    size.height += this.window.getFrameHeight();
    this.window.setSize(size);
  },

  showContextMenu: function (evt) {
    var functionsMenu = new Ext.menu.Menu({
      items: [
        {text: 'Sum Series', handler: this.applyFuncToAll('sumSeries')},
        {text: 'Average Series', handler: this.applyFuncToAll('averageSeries')},
        {text: 'As Percent', handler: this.applyFuncToEachWithInput('asPercent')},
        {text: 'Scale', handler: this.applyFuncToEachWithInput('scale')},
        {text: 'Cumulative', handler: this.applyFuncToEach('cumulative')},
        {text: 'Derivative', handler: this.applyFuncToEach('derivative')},
        {text: 'Integral', handler: this.applyFuncToEach('integral')},
        {text: 'Alias', handler: this.applyFuncToEachWithInput('alias')},
        {text: 'Remove Outer Call', handler: this.removeOuterCall.createDelegate(this)}
      ]
    });

    var removeItem = {text: "Remove", handler: this.removeSelected.createDelegate(this)};
    var editItem = {text: "Edit", handler: this.editSelected.createDelegate(this)};
    var applyItem = {text: "Apply Function", menu: functionsMenu};
    var refreshItem = {text: "Refresh List", handler: this.refreshList.createDelegate(this)};

    if (this.getSelectedTargets().length == 0) {
      removeItem.disabled = true;
      editItem.disabled = true;
      applyItem.disabled = true;
    }

    var contextMenu = new Ext.menu.Menu({ items: [removeItem, editItem, applyItem, refreshItem] });
    contextMenu.showAt( evt.getXY() );

    evt.stopEvent();
  },

  applyFuncToEach: function (funcName, extraArg) {
    function applyFunc() {
      this.getSelectedTargets().each(
        function (target) {
          var newTarget;
          Composer.url.removeParam('target', target);
          if (extraArg) {
            newTarget = funcName + '(' + target + ',' + extraArg + ')';
          } else {
            newTarget = funcName + '(' + target + ')';
          }
          Composer.url.addParam('target', newTarget);
        }
      );
      Composer.updateImage();
      this.refreshList();
    }
    applyFunc = applyFunc.createDelegate(this);
    return applyFunc;
  },

  applyFuncToEachWithInput: function (funcName, question) {
    function applyFunc() {
      Ext.MessageBox.prompt(
        "Input Required", //title
        question, //message
        function (button, inputValue) { //handler
          if (button == 'ok' && inputValue != '') {
            if (funcName == 'alias') { //SPECIAL CASE HACK
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

  applyFuncToAll: function (funcName) { //XXX
    function applyFunc() {
      var targetList = this.getSelectedTargets
      var newTarget = funcName + '(' + targetList + ')';
      Composer.url.setParam('target', newTarget);
      Composer.updateImage();
      this.refreshList();
    }
    applyFunc = applyFunc.createDelegate(this);
    return applyFunc;
  },

  removeOuterCall: function () {
    /* It turns out that this is a big pain in the ass to do properly.
     * The following code is *almost* correct. It will fail if there is
     * an argument with a quoted parenthesis in it. Who cares... */
    var _this = this;
    this.getSelectedTargets().each(
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
              if (depth < 0) { alert("Malformed target, cannot remove outer call."); return; }
              args.push( argString.substring(lastArg, i).strip() );
              lastArg = i + 1;
              break;
          }
        }
        args.push( argString.substring(lastArg, i) );

        Composer.url.removeParam('target', target);
        args.each(function (arg) {
          if (!arg.match(/^([0123456789\.]+|".+")$/)) { //Skip string and number literals
            Composer.url.addParam('target', arg);
          }
        });
        Composer.updateImage();
        _this.refreshList();
      }
    );
  },

  removeSelected: function (item, evt) {
    var current = Composer.url.getParamList('target');
    var remaining = current.without.apply(current, this.getSelectedTargets()); //*args would be nice...
    Composer.url.setParamList('target', remaining);
    Composer.updateImage();
    this.refreshList();
  },

  editSelected: function (item, evt) {
    var selectedTargets = this.getSelectedTargets();

    if (selectedTargets.length != 1) {
      Ext.MessageBox.show({
        title: "Error",
        msg: "You must select exactly one target to edit.",
        icon: Ext.MessageBox.ERROR,
        buttons: Ext.MessageBox.OK
      });
      return;
    }
    var selected = selectedTargets[0];

    function editHandler (button, newValue) {
      if (button == 'ok' && newValue != '') {
        Composer.url.removeParam('target', selected);
        Composer.url.addParam('target', newValue);
        Composer.updateImage();
        this.refreshList();
      }
    }
    editHandler = editHandler.createDelegate(this); //dynamic scoping can really be a bitch

    Ext.MessageBox.prompt(
      "Advanced Target Edit", //title
      "Warning: You are directly editing a target. This could break your graph.", //message
      editHandler, //handler
      null, //scope
      false, //multiline
      selected //initial value
    );
  },

  getSelectedTargets: function () {
    var rowSelectionModel = this.grid.getSelectionModel();
    var selectedRecords = rowSelectionModel.getSelections();
    var selectedTargets = selectedRecords.map(function (rec) { return rec.get('target'); });
    return selectedTargets;
  },

  refreshList: function () {
    var targets = Composer.url.getParamList('target');
    var dataArrays = targets.map(function (t) { return [t]; });
    this.targetsStore.loadData(dataArrays);
  }
};

/* Auto-Refresh feature */
function toggleAutoRefresh(button, pressed) {
  //A closure makes this really simple
  var doRefresh = function () {
    Composer.updateImage();
    button.timer = setTimeout(doRefresh, 60000);
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

/* Options Menu */
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
  
  var displayMenu = new Ext.menu.Menu({
    items: [
      menuCheckItem("Graph Only", "graphOnly"),
      menuCheckItem("Hide Axes", "hideAxes"),
      menuCheckItem("Hide Grid", "hideGrid"),
      menuCheckItem("Hide Legend", "hideLegend")
    ]
  });

  return new Ext.menu.Menu({
    items: [
      menuInputItem("Graph Title", "title"),
      menuInputItem("Y Axis Label", "vtitle"),
      menuInputItem("Line Thickness", "lineWidth"),
      menuCheckItem("Area Mode", "areaMode", "all"),
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
  var menuItems = faces.map(
    function (face) {
      return {
        text: face,
        handler: function (menuItem, evt) {
                   Composer.url.setParam("fontName", face);
                   Composer.updateImage();
                 }
      };
    }
  );
  return new Ext.menu.Menu({items: menuItems});
}

function createColorMenu(param) {
  var colorPicker = new Ext.menu.ColorItem({hideOnClick: false});
  colorPicker.on('select',
    function (picker, color) {
      Composer.url.setParam(param, color);
      Composer.updateImage();
    }
  );
  return new Ext.menu.Menu({items: [colorPicker]});
}

function menuInputItem(name, param) {
  return new Ext.menu.Item({text: name, handler: paramPrompt(name, param)});
}

function paramPrompt(question, param) {
  return function (menuItem, evt) {
    Ext.MessageBox.prompt(
      "Input Required",
      question,
      function (button, value) {
        Composer.url.setParam(param, value);
        Composer.updateImage();
      }
    );
  };
}

function menuCheckItem(name, param, paramValue) {
  var checkItem = new Ext.menu.CheckItem({text: name, hideOnClick: false});
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
