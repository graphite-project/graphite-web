var DEFAULT_WINDOW_WIDTH = 600;
var DEFAULT_WINDOW_HEIGHT = 400;

function createComposerWindow(options) {
  if (!options) {
    options = {};
  }
  var timeDisplay = new Ext.Toolbar.TextItem({
    id: 'composer-time-display',
    text: 'Now showing the past 24 hours',
  });

  var win = new Ext.Window({
    width: options.width ? options.width : DEFAULT_WINDOW_WIDTH,
    height: options.height ? options.height : DEFAULT_WINDOW_HEIGHT,
    title: "Graphite Composer",
    layout: "border",
    region: "center",
    maximizable: true,
    closable: false,
    tbar: [
      createToolbarButton('Save to MyGraphs', 'save.gif', saveMyGraph),
      createToolbarButton('Update Graph', 'updateGraph.gif', updateGraph),
      '-',
      createToolbarButton('Select a Date Range', 'calBt.gif', toggleCalendar),
      createToolbarButton('Select Recent Data', 'arrow1.gif', toggleRecentDialog),
      '-',
      timeDisplay
    ],
    items: [
      { //Image panel
        region: "center",
	html: "<img id='imageviewer' src='/render'/>",
      }
    ],
    listeners: {show: fitImageToWindow, resize: fitImageToWindow}
  });
  // Tack on some convenience closures
  win.updateTimeDisplay = function (text) {
    timeDisplay.getEl().innerHTML = text;
  };
  win.getImage = function () {
    return $('imageviewer');
  };

  return win;
}

function fitImageToWindow(win) {
  Composer.url.setParam('width', win.getInnerWidth());
  Composer.url.setParam('height', win.getInnerHeight());
  try {
    Composer.updateImage();
  } catch (err) {
    //This happens when an initial resize event
    //occurs prior to rendering the image viewer
  }
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
function toggleCalendar(button, evt) {
  if (!button.window) { //First click, create the window
    var style = "font-family: tahoma,arial,verdana,sans-serif; font-size:11px;";
    var startDateHeader = {
      html: "<center><span id='startDate' style=\"" + style + "\">Start Date</span></center>",
    };
    var endDateHeader = {
      html: "<center><span id='endDate' style=\"" + style + "\">End Date</span></center>",
    };

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

    button.window = new Ext.Window({
      title: "Select Date Range",
      layout: 'table',
      height: 250,
      width: 400,
      layoutConfig: { columns: 2 },
      closeAction: 'hide',
      items: [
        startDateHeader,
	endDateHeader,
	startDateControl,
	endDateControl
      ],
      onEsc: function () { toggleCalendar(button, evt); return false; }
    });
  }
  if (button.window.isVisible()) {
    button.window.hide();
  } else {
    button.window.show();
  }
}

function calendarSelectionMade(datePicker, selectedDate) {
  var startDate = Ext.getCmp('start-date').getValue();
  var endDate = Ext.getCmp('end-date').getValue();
  Composer.url.setParam('from', asDateString(startDate) );
  Composer.url.setParam('until', asDateString(endDate) );
  Composer.updateImage();
  Composer.updateTimeDisplay("<b>From</b> " + startDate.toLocaleString() +
                             " <b>Until</b> " + endDate.toLocaleString() );
}

function asDateString(dateObj) {
  return dateObj.getFullYear().toString() +
         (dateObj.getMonth() + 1).toPaddedString(2) +
         dateObj.getDate().toPaddedString(2);
}

/* "Recent Data" dialog */
function toggleRecentDialog(button, evt) {
  if (!button.window) { //First click, create the window
    var quantityField = new Ext.form.NumberField({
      id: 'time-quantity',
      grow: true,
      value: 24,
    });
    var unitSelector = new Ext.form.ComboBox({
      id: 'time-units',
      editable: false,
      triggerAction: 'all',
      mode: 'local',
      store: ['minutes', 'hours', 'days', 'weeks', 'months', 'years'],
      width: 75,
      value: 'hours'
    });
    quantityField.on('change', recentSelectionMade);
    quantityField.on('specialkey',
      function (combo, evt) {
        if (evt.getCharCode() == Ext.EventObject.RETURN) {
          recentSelectionMade(combo);
        }
      }
    );
    unitSelector.on('select', recentSelectionMade);

    button.window = new Ext.Window({
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
      ],
      onEsc: function () { toggleRecentDialog(button, evt); return false; },
    });
  }
  if (button.window.isVisible()) {
    button.window.hide();
  } else {
    button.window.show();
  }

}

function recentSelectionMade(combo, record, index) {
  var quantity = Ext.getCmp('time-quantity').getValue();
  var units = Ext.getCmp('time-units').getValue();
  var fromString = '-' + quantity + units;
  Composer.url.setParam('from', fromString);
  Composer.url.removeParam('until');
  Composer.updateTimeDisplay("Now showing the past " + quantity + " " + units);
}

/* "Save to MyGraphs" */
function saveMyGraph(button, evt) {
  alert('save my graph');
}

/* "Update Graph" action */
function updateGraph(button, evt) {
  alert('update graph');
}
